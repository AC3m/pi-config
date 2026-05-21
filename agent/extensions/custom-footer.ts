import type { AssistantMessage } from "@earendil-works/pi-ai";
import { CustomEditor, type ExtensionAPI, type KeybindingsManager } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth, type EditorTheme, type TUI } from "@earendil-works/pi-tui";
import { execFileSync } from "node:child_process";

let mrCache: { branch: string; cwd: string; mr?: GitLabMrLink; timestamp: number } | undefined;

function terminalLink(text: string, url?: string): string {
	if (!url) return text;
	return `\u001b]8;;${url}\u0007${text}\u001b]8;;\u0007`;
}

function runCommand(command: string, args: string[], cwd?: string): string | undefined {
	try {
		const value = execFileSync(command, args, {
			cwd,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
			timeout: 5000,
		}).trim();
		return value.length > 0 ? value : undefined;
	} catch {
		return undefined;
	}
}

function openUrl(url: string): boolean {
	try {
		if (process.platform === "darwin") execFileSync("open", [url], { stdio: "ignore", timeout: 5000 });
		else if (process.platform === "win32") execFileSync("cmd", ["/c", "start", "", url], { stdio: "ignore", timeout: 5000 });
		else execFileSync("xdg-open", [url], { stdio: "ignore", timeout: 5000 });
		return true;
	} catch {
		return false;
	}
}

function formatTokens(count: number): string {
	if (count < 1000) return count.toString();
	if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
	if (count < 1000000) return `${Math.round(count / 1000)}k`;
	if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
	return `${Math.round(count / 1000000)}M`;
}

function formatContextTokens(count: number | null | undefined): string {
	return count == null ? "?" : `${Math.floor(count / 1000)}k`;
}

function getGitLabRepositoryUrl(cwd: string): string | undefined {
	const remote = runCommand("git", ["remote", "get-url", "origin"], cwd);
	if (!remote) return undefined;

	const withoutGitSuffix = remote.replace(/\.git$/, "");
	const sshMatch = withoutGitSuffix.match(/^git@([^:]+):(.+)$/);
	if (sshMatch) return `https://${sshMatch[1]}/${sshMatch[2]}`;

	const sshUrlMatch = withoutGitSuffix.match(/^ssh:\/\/git@([^/]+)\/(.+)$/);
	if (sshUrlMatch) return `https://${sshUrlMatch[1]}/${sshUrlMatch[2]}`;

	const httpsMatch = withoutGitSuffix.match(/^https?:\/\/[^/]+\/.+$/);
	if (httpsMatch) return withoutGitSuffix;

	return undefined;
}

type GitLabMr = { iid?: number | string; web_url?: string; webUrl?: string; url?: string; references?: { short?: string } };
type GitLabMrLink = { text: string; url?: string };

function formatGitLabMrLink(cwd: string, mr: GitLabMr): GitLabMrLink | undefined {
	const iid = mr.iid == null ? undefined : String(mr.iid);
	if (!iid) return undefined;

	const repositoryUrl = getGitLabRepositoryUrl(cwd);
	const fallbackUrl = repositoryUrl ? `${repositoryUrl}/-/merge_requests/${iid}` : undefined;
	return {
		text: mr.references?.short ?? `!${iid}`,
		url: mr.web_url ?? mr.webUrl ?? mr.url ?? fallbackUrl,
	};
}

function getGitLabMrLink(cwd: string, branch?: string): GitLabMrLink | undefined {
	if (!branch || branch === "HEAD") return undefined;

	const now = Date.now();
	if (mrCache?.cwd === cwd && mrCache.branch === branch && now - mrCache.timestamp < 60_000) {
		return mrCache.mr;
	}

	let mrLink: GitLabMrLink | undefined;
	const listOutput = runCommand("glab", ["mr", "list", "-F", "json", "--source-branch", branch, "--order", "updated_at", "--sort", "desc", "--per-page", "1"], cwd);
	if (listOutput) {
		try {
			const [mr] = JSON.parse(listOutput) as GitLabMr[];
			if (mr) mrLink = formatGitLabMrLink(cwd, mr);
		} catch {
			mrLink = undefined;
		}
	}

	mrCache = { cwd, branch, mr: mrLink, timestamp: now };
	return mrLink;
}

function getSessionLocation(ctx: any, footerData: any, theme: any): string {
	const cwd = ctx.sessionManager.getCwd();
	let pwd = cwd;
	const home = process.env.HOME || process.env.USERPROFILE;
	if (home && pwd.startsWith(home)) pwd = `~${pwd.slice(home.length)}`;

	const branch = footerData.getGitBranch();
	const mrLink = getGitLabMrLink(cwd, branch);

	let line = theme.fg("dim", pwd);
	if (branch) line += theme.fg("muted", ` (${branch})`);
	if (mrLink) line += theme.fg("dim", " • ") + terminalLink(theme.fg("accent", theme.bold(mrLink.text)), mrLink.url);

	return line;
}

function formatContextUsage(theme: any, tokens: string, percent: string, contextWindow: string): string {
	return `${theme.fg("dim", `${tokens}(`)}${theme.fg("accent", theme.bold(percent))}${theme.fg("dim", `)/${contextWindow}`)}`;
}

function addRightBorderLabel(line: string, label: string, width: number, marginRight = 2): string {
	const rightMargin = " ".repeat(Math.max(0, marginRight));
	const labelWithMargin = label + rightMargin;
	const labelWidth = visibleWidth(labelWithMargin);
	if (labelWidth >= width) return truncateToWidth(labelWithMargin, width, "");
	return truncateToWidth(line, width - labelWidth, "") + labelWithMargin;
}

function getRightSide(pi: ExtensionAPI, ctx: any, footerData: any, theme: any): string {
	const modelName = theme.fg("accent", theme.bold(ctx.model?.id || "no-model"));
	let rightSideWithoutProvider = modelName;

	if (ctx.model?.reasoning) {
		const thinkingLevel = pi.getThinkingLevel();
		const thinkingText = thinkingLevel === "off" ? "thinking off" : thinkingLevel;
		rightSideWithoutProvider = `${modelName}${theme.fg("dim", ` • ${thinkingText}`)}`;
	}

	let rightSide = rightSideWithoutProvider;
	if (footerData.getAvailableProviderCount() > 1 && ctx.model) {
		rightSide = `${theme.fg("dim", `(${ctx.model.provider}) `)}${rightSideWithoutProvider}`;
	}

	return rightSide;
}

function getAssistantUsage(ctx: any) {
	let input = 0;
	let output = 0;
	let cacheRead = 0;
	let cacheWrite = 0;
	let cost = 0;

	for (const entry of ctx.sessionManager.getEntries()) {
		if (entry.type !== "message" || entry.message.role !== "assistant") continue;
		const message = entry.message as AssistantMessage;
		input += message.usage?.input ?? 0;
		output += message.usage?.output ?? 0;
		cacheRead += message.usage?.cacheRead ?? 0;
		cacheWrite += message.usage?.cacheWrite ?? 0;
		cost += message.usage?.cost?.total ?? 0;
	}

	return { input, output, cacheRead, cacheWrite, cost };
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("open-mr", {
		description: "Open the current branch GitLab merge request in the browser",
		handler: async (_args, ctx) => {
			const cwd = ctx.sessionManager.getCwd();
			const branch = runCommand("git", ["rev-parse", "--abbrev-ref", "HEAD"], cwd);
			const mr = getGitLabMrLink(cwd, branch);
			if (!mr?.url) {
				ctx.ui.notify("No GitLab MR found for current branch", "warning");
				return;
			}

			if (openUrl(mr.url)) ctx.ui.notify(`Opened MR ${mr.text}`, "info");
			else ctx.ui.notify(`Could not open MR URL: ${mr.url}`, "error");
		},
	});

	pi.on("session_start", (_event, ctx) => {
		class SessionNameEditor extends CustomEditor {
			constructor(tui: TUI, theme: EditorTheme, keybindings: KeybindingsManager) {
				super(tui, theme, keybindings);
			}

			render(width: number): string[] {
				const lines = super.render(width);
				const sessionName = pi.getSessionName();
				if (!sessionName || lines.length < 2) return lines;

				const label = ctx.ui.theme.fg("accent", ctx.ui.theme.bold(` ${sessionName} `));
				lines[lines.length - 1] = addRightBorderLabel(lines[lines.length - 1], label, width);
				return lines;
			}
		}

		ctx.ui.setEditorComponent((tui, theme, keybindings) => new SessionNameEditor(tui, theme, keybindings));

		ctx.ui.setFooter((tui, theme, footerData) => ({
			dispose: footerData.onBranchChange(() => tui.requestRender()),
			invalidate() {},
			render(width: number): string[] {
				const usage = getAssistantUsage(ctx);
				const contextUsage = ctx.getContextUsage();
				const contextWindow = contextUsage?.contextWindow ?? ctx.model?.contextWindow ?? 0;
				const contextPercentValue = contextUsage?.percent;
				const contextPercent = contextPercentValue == null ? "?" : `${contextPercentValue.toFixed(1)}%`;
				const usingSubscription = ctx.model ? ctx.modelRegistry.isUsingOAuth(ctx.model) : false;
				const pwdLine = truncateToWidth(getSessionLocation(ctx, footerData, theme), width, theme.fg("dim", "..."));

				const parts = [
					formatContextUsage(theme, formatContextTokens(contextUsage?.tokens), contextPercent, formatTokens(contextWindow)),
					theme.fg("dim", "(auto)"),
				];

				if (usage.input) parts.push(theme.fg("dim", `↑${formatTokens(usage.input)}`));
				if (usage.output) parts.push(theme.fg("dim", `↓${formatTokens(usage.output)}`));
				if (usage.cacheRead) parts.push(theme.fg("dim", `R${formatTokens(usage.cacheRead)}`));
				if (usage.cacheWrite) parts.push(theme.fg("dim", `W${formatTokens(usage.cacheWrite)}`));
				if (usage.cost || usingSubscription) parts.push(theme.fg("dim", `$${usage.cost.toFixed(3)}${usingSubscription ? " (sub)" : ""}`));

				let left = parts.join(" ");
				let leftWidth = visibleWidth(left);
				if (leftWidth > width) {
					left = truncateToWidth(left, width, "...");
					leftWidth = visibleWidth(left);
				}

				const minPadding = 2;
				let right = getRightSide(pi, ctx, footerData, theme);
				const rightWithoutProvider = getRightSide(pi, ctx, { getAvailableProviderCount: () => 1 }, theme);
				if (right !== rightWithoutProvider && leftWidth + minPadding + visibleWidth(right) > width) {
					right = rightWithoutProvider;
				}

				const rightWidth = visibleWidth(right);
				const totalNeeded = leftWidth + minPadding + rightWidth;
				let line: string;
				if (totalNeeded <= width) {
					line = left + " ".repeat(width - leftWidth - rightWidth) + right;
				} else {
					const availableForRight = width - leftWidth - minPadding;
					if (availableForRight > 0) {
						const truncatedRight = truncateToWidth(right, availableForRight, "");
						const truncatedRightWidth = visibleWidth(truncatedRight);
						line = left + " ".repeat(Math.max(0, width - leftWidth - truncatedRightWidth)) + truncatedRight;
					} else {
						line = left;
					}
				}

				return [pwdLine, line];
			},
		}));
	});
}
