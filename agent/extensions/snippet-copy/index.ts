import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { DynamicBorder } from "@mariozechner/pi-coding-agent";
import { Container, Key, matchesKey, Text, truncateToWidth } from "@mariozechner/pi-tui";

const execFileAsync = promisify(execFile);

type SnippetKind = "code" | "message";
type CopyMode = "raw" | "rich";

interface Snippet {
	id: string;
	kind: SnippetKind;
	language?: string;
	content: string;
	preview: string;
	timestamp: number;
}

const MAX_SNIPPETS = 80;
const WIDGET_ID = "snippet-copy";
let snippets: Snippet[] = [];

function textFromContent(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.map((part) => {
			if (typeof part === "string") return part;
			if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
				return (part as { text: string }).text;
			}
			return "";
		})
		.filter(Boolean)
		.join("\n");
}

function normalizeText(text: string): string {
	return text.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").replace(/^\n+|\n+$/g, "");
}

function firstLine(text: string): string {
	return text.trim().split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() ?? "(empty)";
}

function makePreview(content: string, kind: SnippetKind, language?: string): string {
	const prefix = kind === "code" ? `code${language ? `:${language}` : ""}` : "msg";
	return `${prefix} — ${firstLine(content)}`;
}

function copyableMessageText(markdown: string): string {
	const text = normalizeText(markdown);
	const lines = text.split("\n");
	const markerIndex = lines.findIndex((line) =>
		/^\s*(?:here(?:'s| is)\s+)?(?:.*\b)?(?:example|draft|message|slack message|rich test example)\s*:\s*$/i.test(line.trim()),
	);

	if (markerIndex >= 0 && markerIndex < lines.length - 1) {
		return normalizeText(lines.slice(markerIndex + 1).join("\n"));
	}

	return text;
}

const NON_CODE_LANGUAGES = new Set(["text", "txt", "plain", "plaintext", "md", "markdown"]);
const CODE_LANGUAGES = new Set([
	"bash", "sh", "shell", "zsh", "fish", "sql", "json", "yaml", "yml", "toml", "xml", "html", "css",
	"js", "jsx", "ts", "tsx", "javascript", "typescript", "node", "py", "python", "rb", "ruby", "go", "rs", "rust",
	"java", "kt", "kotlin", "swift", "c", "cpp", "cs", "php", "scala", "r", "lua", "vim", "dockerfile",
]);

function isCommandOnly(content: string): boolean {
	const lines = normalizeText(content).split("\n").map((line) => line.trim()).filter(Boolean);
	return lines.length > 0 && lines.every((line) => /^\/[a-z][\w-]*(?:\s+.*)?$/i.test(line));
}

function isLikelyCode(content: string): boolean {
	return /\b(import|export|function|class|const|let|var|return|interface|type|async|await|SELECT|FROM|WHERE)\b/.test(content)
		|| /[{}();=<>]/.test(content)
		|| /^\s*[$#]\s+\w+/m.test(content);
}

function isCopyableCode(language: string | undefined, content: string): boolean {
	const lang = language?.toLowerCase();
	if (lang && NON_CODE_LANGUAGES.has(lang)) return false;
	if (isCommandOnly(content)) return false;
	if (lang && CODE_LANGUAGES.has(lang)) return true;
	return isLikelyCode(content);
}

function extractSnippets(markdown: string, timestamp = Date.now()): Snippet[] {
	const extracted: Snippet[] = [];
	let index = 0;

	const fullMessage = copyableMessageText(markdown);
	if (fullMessage) {
		extracted.push({
			id: `${timestamp}-${index++}`,
			kind: "message",
			content: fullMessage,
			preview: makePreview(fullMessage, "message"),
			timestamp,
		});
	}

	const fenceRe = /(^|\n)(```|~~~)([^\n`]*)\n([\s\S]*?)(?:\n\2)(?=\n|$)/g;
	let fence: RegExpExecArray | null;
	while ((fence = fenceRe.exec(markdown)) !== null) {
		const content = normalizeText(fence[4] ?? "");
		if (!content) continue;

		const language = (fence[3] ?? "").trim().split(/\s+/)[0] || undefined;
		if (!isCopyableCode(language, content)) continue;
		extracted.push({
			id: `${timestamp}-${index++}`,
			kind: "code",
			language,
			content,
			preview: makePreview(content, "code", language),
			timestamp,
		});
	}

	return extracted;
}

function addSnippets(next: Snippet[]): void {
	if (next.length === 0) return;
	snippets = [...next, ...snippets].slice(0, MAX_SNIPPETS);
}

function snippetsOf(kind: SnippetKind): Snippet[] {
	return snippets.filter((snippet) => snippet.kind === kind);
}

function setWidget(ctx: ExtensionContext): void {
	if (!ctx.hasUI) return;
	const codeCount = snippetsOf("code").length;
	const msgCount = snippetsOf("message").length;

	if (codeCount === 0 && msgCount === 0) {
		ctx.ui.setWidget(WIDGET_ID, undefined);
		return;
	}

	ctx.ui.setWidget(WIDGET_ID, [
		ctx.ui.theme.fg("dim", `copy: ${codeCount} code • ${msgCount} msg • /copy-code • /copy-msg`),
	]);
}

async function commandExists(command: string): Promise<boolean> {
	try {
		await execFileAsync("sh", ["-lc", `command -v ${command}`], { timeout: 1000 });
		return true;
	} catch {
		return false;
	}
}

async function pipeTo(command: string, args: string[], input: string): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const child = spawn(command, args, { stdio: ["pipe", "ignore", "pipe"] });
		let stderr = "";
		const timeout = setTimeout(() => {
			child.kill("SIGTERM");
			reject(new Error(`${command} timed out`));
		}, 3000);

		child.stderr?.on("data", (chunk) => {
			stderr += String(chunk);
		});
		child.on("error", (error) => {
			clearTimeout(timeout);
			reject(error);
		});
		child.on("close", (code) => {
			clearTimeout(timeout);
			if (code === 0) resolve();
			else reject(new Error(`${command} exited ${code}${stderr ? `: ${stderr.trim()}` : ""}`));
		});
		child.stdin.end(input);
	});
}

async function copyViaOsc52(text: string): Promise<void> {
	const b64 = Buffer.from(text, "utf8").toString("base64");
	process.stdout.write(`\x1b]52;c;${b64}\x07`);
}

async function copyMacRichClipboard(text: string, html: string): Promise<void> {
	const script = `
ObjC.import('AppKit');
const plain = $.NSProcessInfo.processInfo.environment.objectForKey('PI_SNIPPET_PLAIN');
const rich = $.NSProcessInfo.processInfo.environment.objectForKey('PI_SNIPPET_HTML');
const pb = $.NSPasteboard.generalPasteboard;
pb.clearContents;
pb.setStringForType(plain, $.NSPasteboardTypeString);
pb.setStringForType(rich, $.NSPasteboardTypeHTML);
`;
	await new Promise<void>((resolve, reject) => {
		const child = spawn("osascript", ["-l", "JavaScript", "-e", script], {
			stdio: ["ignore", "ignore", "pipe"],
			env: { ...process.env, PI_SNIPPET_PLAIN: text, PI_SNIPPET_HTML: html },
		});
		let stderr = "";
		child.stderr?.on("data", (chunk) => {
			stderr += String(chunk);
		});
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`osascript exited ${code}${stderr ? `: ${stderr.trim()}` : ""}`));
		});
	});
}

async function copyToClipboard(text: string, html?: string): Promise<string> {
	if (process.platform === "darwin" && html && await commandExists("osascript")) {
		await copyMacRichClipboard(text, html);
		return "macOS rich clipboard";
	}
	if (process.platform === "darwin" && await commandExists("pbcopy")) {
		await pipeTo("pbcopy", [], text);
		return "pbcopy";
	}
	if (process.platform === "win32" && await commandExists("clip.exe")) {
		await pipeTo("clip.exe", [], text);
		return "clip.exe";
	}
	if (html && await commandExists("wl-copy")) {
		await pipeTo("wl-copy", ["--type", "text/html"], html);
		return "wl-copy html";
	}
	if (await commandExists("wl-copy")) {
		await pipeTo("wl-copy", [], text);
		return "wl-copy";
	}
	if (await commandExists("xclip")) {
		await pipeTo("xclip", ["-selection", "clipboard"], text);
		return "xclip";
	}
	if (await commandExists("xsel")) {
		await pipeTo("xsel", ["--clipboard", "--input"], text);
		return "xsel";
	}
	await copyViaOsc52(text);
	return "OSC 52";
}

function formatRichPlainText(input: string): string {
	const fencedBlocks: string[] = [];
	let text = input.replace(/```[^\n]*\n([\s\S]*?)```/g, (_match, code: string) => {
		const token = `@@PI_SNIPPET_CODE_${fencedBlocks.length}@@`;
		fencedBlocks.push(`\`\`\`\n${normalizeText(code)}\n\`\`\``);
		return token;
	});

	text = text
		.replace(/^#{1,6}\s+(.+)$/gm, "$1")
		.replace(/\*\*([^*\n][\s\S]*?[^*\n])\*\*/g, "$1")
		.replace(/__([^_\n][\s\S]*?[^_\n])__/g, "$1")
		.replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)")
		.replace(/^\s*[-*]\s+\[ \]\s+/gm, "☐ ")
		.replace(/^\s*[-*]\s+\[[xX]\]\s+/gm, "☑ ")
		.replace(/^\s*[-*]\s+/gm, "• ")
		.replace(/^\s*---+\s*$/gm, "")
		.replace(/\n{3,}/g, "\n\n");

	fencedBlocks.forEach((block, index) => {
		text = text.replace(`@@PI_SNIPPET_CODE_${index}@@`, block);
	});

	return normalizeText(text);
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function inlineMarkdownToHtml(text: string): string {
	return escapeHtml(text)
		.replace(/`([^`]+)`/g, "<code>$1</code>")
		.replace(/\*\*([^*\n][\s\S]*?[^*\n])\*\*/g, "<strong>$1</strong>")
		.replace(/__([^_\n][\s\S]*?[^_\n])__/g, "<strong>$1</strong>")
		.replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

function markdownToHtml(input: string): string {
	const lines = normalizeText(input).split("\n");
	const out: string[] = ["<meta charset=\"utf-8\">"];
	let inList = false;
	let inCode = false;
	let codeLines: string[] = [];

	function closeList() {
		if (!inList) return;
		out.push("</ul>");
		inList = false;
	}

	function closeCode() {
		if (!inCode) return;
		out.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
		codeLines = [];
		inCode = false;
	}

	for (const line of lines) {
		if (/^\s*```/.test(line)) {
			if (inCode) closeCode();
			else {
				closeList();
				inCode = true;
				codeLines = [];
			}
			continue;
		}
		if (inCode) {
			codeLines.push(line);
			continue;
		}

		if (!line.trim()) {
			closeList();
			continue;
		}

		const heading = line.match(/^#{1,6}\s+(.+)$/);
		if (heading) {
			closeList();
			out.push(`<p><strong>${inlineMarkdownToHtml(heading[1] ?? "")}</strong></p>`);
			continue;
		}

		const task = line.match(/^\s*[-*]\s+\[([ xX])]\s+(.+)$/);
		const bullet = line.match(/^\s*[-*]\s+(.+)$/);
		if (task || bullet) {
			if (!inList) {
				out.push("<ul>");
				inList = true;
			}
			const checked = task ? (task[1]?.toLowerCase() === "x" ? "☑ " : "☐ ") : "";
			const body = task ? task[2] ?? "" : bullet?.[1] ?? "";
			out.push(`<li>${checked}${inlineMarkdownToHtml(body)}</li>`);
			continue;
		}

		closeList();
		out.push(`<p>${inlineMarkdownToHtml(line)}</p>`);
	}

	closeCode();
	closeList();
	return out.join("\n");
}

async function copySnippet(snippet: Snippet, ctx: ExtensionContext, mode: CopyMode): Promise<void> {
	const plainText = mode === "rich" ? formatRichPlainText(snippet.content) : snippet.content;
	const html = mode === "rich" ? markdownToHtml(snippet.content) : undefined;
	const backend = await copyToClipboard(plainText, html);
	ctx.ui.notify(`Copied ${snippet.kind} via ${backend}`, "info");
}

async function showPicker(ctx: ExtensionContext, kind: SnippetKind, mode: CopyMode): Promise<void> {
	const available = snippetsOf(kind);
	if (available.length === 0) {
		ctx.ui.notify(`No ${kind === "code" ? "code snippets" : "messages"} captured yet`, "warning");
		return;
	}

	const items = available.map((snippet, i) => ({
		id: snippet.id,
		index: i + 1,
		description: `${snippet.language ? `${snippet.language} • ` : ""}${snippet.preview.replace(/^[^—]+—\s*/, "")}`,
	}));

	const title = kind === "code" ? "Copy code snippet" : "Copy rich-text message";
	const help = kind === "code" ? "↑↓ choose • enter = copy code • esc = cancel" : "↑↓ choose • enter = copy rich text • esc = cancel";

	const selectedId = await ctx.ui.custom<string | null>((tui, theme, _keybindings, done) => {
		let selected = 0;
		let scroll = 0;
		const visibleRows = Math.min(items.length, 10);
		const indexWidth = String(items.length).length;

		function clampSelection() {
			selected = Math.max(0, Math.min(selected, items.length - 1));
			if (selected < scroll) scroll = selected;
			if (selected >= scroll + visibleRows) scroll = selected - visibleRows + 1;
		}

		return {
			render(width: number) {
				const lines: string[] = [];
				lines.push(...new DynamicBorder((s: string) => theme.fg("accent", s)).render(width));
				lines.push(truncateToWidth(theme.fg("accent", theme.bold(title)), width));

				const shown = items.slice(scroll, scroll + visibleRows);
				for (const item of shown) {
					const actualIndex = item.index - 1;
					const isSelected = actualIndex === selected;
					const marker = isSelected ? theme.fg("accent", "→") : " ";
					const index = String(item.index).padStart(indexWidth, " ");
					const left = `${marker} ${index} `;
					const description = isSelected ? theme.fg("accent", item.description) : theme.fg("muted", item.description);
					lines.push(truncateToWidth(left + description, width));
				}

				if (items.length > visibleRows) {
					lines.push(theme.fg("dim", `(${scroll + 1}-${scroll + shown.length}/${items.length})`));
				}
				lines.push(truncateToWidth(theme.fg("dim", help), width));
				lines.push(...new DynamicBorder((s: string) => theme.fg("accent", s)).render(width));
				return lines;
			},
			invalidate() {},
			handleInput(data: string) {
				if (matchesKey(data, Key.up)) selected--;
				else if (matchesKey(data, Key.down)) selected++;
				else if (matchesKey(data, Key.pageUp)) selected -= visibleRows;
				else if (matchesKey(data, Key.pageDown)) selected += visibleRows;
				else if (matchesKey(data, Key.home)) selected = 0;
				else if (matchesKey(data, Key.end)) selected = items.length - 1;
				else if (matchesKey(data, Key.enter)) return done(items[selected]?.id ?? null);
				else if (matchesKey(data, Key.escape) || matchesKey(data, Key.ctrl("c"))) return done(null);
				else return;

				clampSelection();
				tui.requestRender();
			},
		};
	}, { overlay: true, overlayOptions: { width: "80%", maxHeight: "80%", minWidth: 50 } });

	if (!selectedId) return;
	const selected = available.find((snippet) => snippet.id === selectedId);
	if (selected) await copySnippet(selected, ctx, mode);
}

function rebuildFromSession(ctx: ExtensionContext): void {
	snippets = [];
	for (const entry of ctx.sessionManager.getBranch()) {
		const message = (entry as any).message;
		if (!message || message.role !== "assistant") continue;
		addSnippets(extractSnippets(textFromContent(message.content), (entry as any).timestamp ?? Date.now()));
	}
}

export default function snippetCopyExtension(pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		rebuildFromSession(ctx);
		setWidget(ctx);
	});

	pi.on("message_end", async (event, ctx) => {
		if (event.message.role !== "assistant") return;
		addSnippets(extractSnippets(textFromContent(event.message.content)));
		setWidget(ctx);
	});

	pi.registerCommand("copy-code", {
		description: "Pick and copy a code snippet without terminal wrapping or padding",
		handler: async (_args, ctx) => {
			await showPicker(ctx, "code", "raw");
			setWidget(ctx);
		},
	});

	pi.registerCommand("copy-msg", {
		description: "Pick and copy a full assistant message as rich text for Slack rich composer",
		handler: async (_args, ctx) => {
			await showPicker(ctx, "message", "rich");
			setWidget(ctx);
		},
	});

	pi.registerShortcut("ctrl+shift+c", {
		description: "Open code snippet copy picker",
		handler: async (ctx) => {
			await showPicker(ctx, "code", "raw");
			setWidget(ctx);
		},
	});
}
