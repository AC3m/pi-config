import { normalizeText } from "./text.js";

export function formatRichPlainText(input: string): string {
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

export function markdownToHtml(input: string): string {
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
