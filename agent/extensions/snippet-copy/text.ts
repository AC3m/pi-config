import type { SnippetKind } from "./types.js";

export function textFromContent(content: unknown): string {
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

export function normalizeText(text: string): string {
	return text.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").replace(/^\n+|\n+$/g, "");
}

export function firstLine(text: string): string {
	return text.trim().split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() ?? "(empty)";
}

export function makePreview(content: string, kind: SnippetKind, language?: string): string {
	const prefix = kind === "code" ? `code${language ? `:${language}` : ""}` : "msg";
	return `${prefix} — ${firstLine(content)}`;
}

export function copyableMessageText(markdown: string): string {
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
