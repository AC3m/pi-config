import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { copyToClipboard } from "./clipboard.js";
import { extractSnippets } from "./extraction.js";
import { showSnippetPicker } from "./picker.js";
import { formatRichPlainText, markdownToHtml } from "./rich-format.js";
import { SnippetStore } from "./store.js";
import { textFromContent } from "./text.js";
import type { CopyMode, Snippet, SnippetKind } from "./types.js";

const store = new SnippetStore();

function contentForCopy(snippet: Snippet, mode: CopyMode): { text: string; html?: string } {
	if (mode === "raw") return { text: snippet.content };
	return {
		text: formatRichPlainText(snippet.content),
		html: markdownToHtml(snippet.content),
	};
}

async function copySnippet(snippet: Snippet, ctx: ExtensionContext, mode: CopyMode): Promise<void> {
	const { text, html } = contentForCopy(snippet, mode);
	const backend = await copyToClipboard(text, html);
	ctx.ui.notify(`Copied ${snippet.kind} via ${backend}`, "info");
}

async function pickAndCopy(ctx: ExtensionContext, kind: SnippetKind, mode: CopyMode): Promise<void> {
	const selected = await showSnippetPicker(ctx, kind, store.list(kind));
	if (selected) await copySnippet(selected, ctx, mode);
}

export default function snippetCopyExtension(pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		store.rebuildFromSession(ctx);
	});

	pi.on("message_end", async (event) => {
		if (event.message.role !== "assistant") return;
		store.add(extractSnippets(textFromContent(event.message.content)));
	});

	pi.registerCommand("copy-code", {
		description: "Pick and copy a code snippet without terminal wrapping or padding",
		handler: async (_args, ctx) => {
			await pickAndCopy(ctx, "code", "raw");
		},
	});

	pi.registerCommand("copy-msg", {
		description: "Pick and copy a full assistant message as rich text for Slack rich composer",
		handler: async (_args, ctx) => {
			await pickAndCopy(ctx, "message", "rich");
		},
	});

	pi.registerShortcut("ctrl+shift+c", {
		description: "Open code snippet copy picker",
		handler: async (ctx) => {
			await pickAndCopy(ctx, "code", "raw");
		},
	});

	pi.registerShortcut("ctrl+shift+m", {
		description: "Open rich text message copy picker",
		handler: async (ctx) => {
			await pickAndCopy(ctx, "message", "rich");
		},
	});
}
