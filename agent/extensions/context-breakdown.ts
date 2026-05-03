import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Key, matchesKey, truncateToWidth } from "@mariozechner/pi-tui";
import { basename, dirname, relative } from "node:path";

type Row = { path: string; chars: number; tokens: number };

function textFromContent(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.filter((block) => block?.type === "text")
		.map((block) => block.text ?? "")
		.join("\n");
}

function shortPath(path: string, cwd: string): string {
	if (path === "<unknown>") return path;
	const rel = relative(cwd, path);
	const display = rel && !rel.startsWith("..") ? rel : path;
	const dir = basename(dirname(display));
	const file = basename(display);
	return dir && dir !== "." ? `${dir}/${file}` : file;
}

function getRows(ctx: any): Row[] {
	const readPaths = new Map<string, string>();
	const charsByPath = new Map<string, number>();

	for (const entry of ctx.sessionManager.getBranch()) {
		const message = entry.message;
		if (!message) continue;

		if (message.role === "assistant") {
			for (const block of message.content ?? []) {
				if (block.type === "toolCall" && block.name === "read") {
					readPaths.set(block.id, block.arguments?.path ?? "<unknown>");
				}
			}
		}

		if (message.role === "toolResult" && message.toolName === "read") {
			const path = readPaths.get(message.toolCallId) ?? "<unknown>";
			const chars = textFromContent(message.content).length;
			charsByPath.set(path, (charsByPath.get(path) ?? 0) + chars);
		}
	}

	return [...charsByPath.entries()]
		.map(([path, chars]) => ({ path, chars, tokens: Math.round(chars / 4) }))
		.sort((a, b) => b.tokens - a.tokens);
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("context-breakdown", {
		description: "Show approximate token usage for files read in this session",
		handler: async (_args, ctx) => {
			const rows = getRows(ctx).slice(0, 30);
			await ctx.ui.custom((_tui, theme, _kb, done) => ({
				render(width: number) {
					const line = "═".repeat(Math.max(0, width));
					const lines = [
						theme.fg("accent", line),
						theme.fg("accent", theme.bold("  Context Breakdown: Files Read Into Session")),
						theme.fg("dim", "  Approx tokens = chars / 4 • close: x or Esc"),
						theme.fg("accent", line),
						"",
					];

					if (rows.length === 0) {
						lines.push("  No read tool results in this session yet.");
					} else {
						lines.push(theme.fg("dim", "  File".padEnd(Math.max(10, width - 24)) + " Tokens     Chars"));
						lines.push(theme.fg("dim", "  " + "─".repeat(Math.max(0, width - 4))));

						for (const row of rows) {
							const metric = `${String(row.tokens).padStart(6)}  ${String(row.chars).padStart(8)}`;
							const pathWidth = Math.max(12, width - metric.length - 4);
							const path = truncateToWidth(shortPath(row.path, ctx.cwd), pathWidth).padEnd(pathWidth);
							lines.push(`  ${path}${metric}`);
						}
					}

					lines.push("", theme.fg("accent", line));
					return lines.map((item) => truncateToWidth(item, width));
				},
				handleInput(data: string) {
					if (data === "x" || matchesKey(data, Key.escape)) done(undefined);
				},
				invalidate() {},
			}), {
				overlay: true,
				overlayOptions: { width: "100%", maxHeight: "80%", anchor: "top-center" },
			});
		},
	});
}
