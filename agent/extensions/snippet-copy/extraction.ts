import type { Snippet } from "./types.js";
import { makePreview, normalizeText } from "./text.js";

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

function extractTaggedMessages(markdown: string, timestamp: number, startIndex: number): { snippets: Snippet[]; nextIndex: number } {
	const snippets: Snippet[] = [];
	let index = startIndex;
	const tagRe = /<copy-(?:txt|msg)(?:\s+[^>]*)?>([\s\S]*?)<\/copy-(?:txt|msg)>/gi;
	let match: RegExpExecArray | null;

	while ((match = tagRe.exec(markdown)) !== null) {
		const content = normalizeText(match[1] ?? "");
		if (!content) continue;
		snippets.push({
			id: `${timestamp}-${index++}`,
			kind: "message",
			content,
			preview: makePreview(content, "message"),
			timestamp,
		});
	}

	return { snippets, nextIndex: index };
}

export function extractSnippets(markdown: string, timestamp = Date.now()): Snippet[] {
	const taggedMessages = extractTaggedMessages(markdown, timestamp, 0);
	const extracted: Snippet[] = [...taggedMessages.snippets];
	let index = taggedMessages.nextIndex;

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
