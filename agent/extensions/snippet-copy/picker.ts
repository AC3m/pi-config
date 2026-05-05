import { DynamicBorder } from "@mariozechner/pi-coding-agent";
import { Key, matchesKey, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { Snippet, SnippetKind } from "./types.js";

type PickerTheme = ExtensionContext["ui"]["theme"];

interface PickerItem {
	snippet: Snippet;
	index: number;
	description: string;
}

function padToWidth(text: string, width: number): string {
	return text + " ".repeat(Math.max(0, width - visibleWidth(text)));
}

function renderSelectedRow(text: string, width: number, theme: PickerTheme): string {
	return theme.bg("selectedBg", padToWidth(truncateToWidth(text, width), width));
}

function titleFor(kind: SnippetKind): string {
	return kind === "code" ? "Copy code snippet" : "Copy rich-text message";
}

function helpFor(kind: SnippetKind): string {
	return kind === "code"
		? "↑↓ choose • enter = copy code • esc = cancel"
		: "↑↓ choose • enter = copy rich text • esc = cancel";
}

function previewLines(snippet: Snippet, maxRows: number): string[] {
	const lines = snippet.content.split("\n");
	const preview = lines.slice(0, maxRows);
	if (lines.length > maxRows) preview.push(`… ${lines.length - maxRows} more line(s)`);
	return preview.length > 0 ? preview : ["(empty)"];
}

export async function showSnippetPicker(
	ctx: ExtensionContext,
	kind: SnippetKind,
	available: Snippet[],
): Promise<Snippet | undefined> {
	if (available.length === 0) {
		ctx.ui.notify(`No ${kind === "code" ? "code snippets" : "messages"} captured yet`, "warning");
		return undefined;
	}

	const items: PickerItem[] = available.map((snippet, i) => ({
		snippet,
		index: i + 1,
		description: `${snippet.language ? `${snippet.language} • ` : ""}${snippet.preview.replace(/^[^—]+—\s*/, "")}`,
	}));

	const selectedId = await ctx.ui.custom<string | null>((tui, theme, _keybindings, done) => {
		let selected = 0;
		let scroll = 0;
		const listRows = Math.min(items.length, 8);
		const previewRows = 10;
		const indexWidth = String(items.length).length;

		function clampSelection() {
			selected = Math.max(0, Math.min(selected, items.length - 1));
			if (selected < scroll) scroll = selected;
			if (selected >= scroll + listRows) scroll = selected - listRows + 1;
		}

		return {
			render(width: number) {
				const lines: string[] = [];
				lines.push(...new DynamicBorder((s: string) => theme.fg("accent", s)).render(width));
				lines.push(truncateToWidth(theme.fg("accent", theme.bold(titleFor(kind))), width));

				const shown = items.slice(scroll, scroll + listRows);
				for (const item of shown) {
					const itemIndex = item.index - 1;
					const isSelected = itemIndex === selected;
					const marker = isSelected ? theme.fg("accent", "→") : " ";
					const index = String(item.index).padStart(indexWidth, " ");
					const left = `${marker} ${index} `;
					const description = isSelected ? theme.fg("accent", item.description) : theme.fg("muted", item.description);
					const row = left + description;
					lines.push(isSelected ? renderSelectedRow(row, width, theme) : truncateToWidth(row, width));
				}

				if (items.length > listRows) lines.push(theme.fg("dim", `(${scroll + 1}-${scroll + shown.length}/${items.length})`));

				const selectedSnippet = items[selected]?.snippet;
				if (selectedSnippet) {
					lines.push(theme.fg("dim", "─".repeat(Math.max(1, width))));
					for (const previewLine of previewLines(selectedSnippet, previewRows)) {
						lines.push(truncateToWidth(theme.fg("customMessageText", previewLine), width));
					}
				}

				lines.push(truncateToWidth(theme.fg("dim", helpFor(kind)), width));
				lines.push(...new DynamicBorder((s: string) => theme.fg("accent", s)).render(width));
				return lines;
			},
			invalidate() {},
			handleInput(data: string) {
				if (matchesKey(data, Key.up)) selected--;
				else if (matchesKey(data, Key.down)) selected++;
				else if (matchesKey(data, Key.pageUp)) selected -= listRows;
				else if (matchesKey(data, Key.pageDown)) selected += listRows;
				else if (matchesKey(data, Key.home)) selected = 0;
				else if (matchesKey(data, Key.end)) selected = items.length - 1;
				else if (matchesKey(data, Key.enter)) return done(items[selected]?.snippet.id ?? null);
				else if (matchesKey(data, Key.escape) || matchesKey(data, Key.ctrl("c"))) return done(null);
				else return;

				clampSelection();
				tui.requestRender();
			},
		};
	}, { overlay: true, overlayOptions: { width: "85%", maxHeight: "85%", minWidth: 60 } });

	return selectedId ? available.find((snippet) => snippet.id === selectedId) : undefined;
}
