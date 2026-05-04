import type { AssistantMessage } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

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

function getCavemanState(text: string): boolean | undefined {
	const normalized = text.toLowerCase();
	if (["stop caveman", "disable caveman", "caveman off", "normal mode", "verbose"].some((phrase) => normalized.includes(phrase))) return false;
	if (["caveman", "less tokens", "be brief", "be terse"].some((phrase) => normalized.includes(phrase))) return true;
	return undefined;
}

function getRightSide(pi: ExtensionAPI, ctx: any, footerData: any): string {
	const modelName = ctx.model?.id || "no-model";
	let rightSideWithoutProvider = modelName;

	if (ctx.model?.reasoning) {
		const thinkingLevel = pi.getThinkingLevel();
		rightSideWithoutProvider =
			thinkingLevel === "off" ? `${modelName} • thinking off` : `${modelName} • ${thinkingLevel}`;
	}

	let rightSide = rightSideWithoutProvider;
	if (footerData.getAvailableProviderCount() > 1 && ctx.model) {
		rightSide = `(${ctx.model.provider}) ${rightSideWithoutProvider}`;
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
	let cavemanEnabled = true;

	pi.on("input", (event) => {
		const next = getCavemanState(event.text);
		if (next !== undefined) cavemanEnabled = next;
		return { action: "continue" as const };
	});

	pi.on("session_start", (_event, ctx) => {
		ctx.ui.setFooter((_tui, theme, footerData) => ({
			invalidate() {},
			render(width: number): string[] {
				const usage = getAssistantUsage(ctx);
				const contextUsage = ctx.getContextUsage();
				const contextWindow = contextUsage?.contextWindow ?? ctx.model?.contextWindow ?? 0;
				const contextPercent = contextUsage?.percent == null ? "?" : `${contextUsage.percent.toFixed(1)}%`;
				const usingSubscription = ctx.model ? ctx.modelRegistry.isUsingOAuth(ctx.model) : false;

				const parts = [
					`${formatContextTokens(contextUsage?.tokens)}(${contextPercent})/${formatTokens(contextWindow)}`,
					"(auto)",
				];

				if (usage.input) parts.push(`↑${formatTokens(usage.input)}`);
				if (usage.output) parts.push(`↓${formatTokens(usage.output)}`);
				if (usage.cacheRead) parts.push(`R${formatTokens(usage.cacheRead)}`);
				if (usage.cacheWrite) parts.push(`W${formatTokens(usage.cacheWrite)}`);
				if (usage.cost || usingSubscription) parts.push(`$${usage.cost.toFixed(3)}${usingSubscription ? " (sub)" : ""}`);

				parts.push(`caveman:${cavemanEnabled ? "on" : "off"}`);

				let left = parts.join(" ");
				let leftWidth = visibleWidth(left);
				if (leftWidth > width) {
					left = truncateToWidth(left, width, "...");
					leftWidth = visibleWidth(left);
				}

				const minPadding = 2;
				let right = getRightSide(pi, ctx, footerData);
				const rightWithoutProvider = getRightSide(pi, ctx, { getAvailableProviderCount: () => 1 });
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

				return [theme.fg("dim", line)];
			},
		}));
	});
}
