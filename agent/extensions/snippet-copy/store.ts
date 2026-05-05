import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { Snippet, SnippetKind } from "./types.js";
import { extractSnippets } from "./extraction.js";
import { textFromContent } from "./text.js";

const MAX_SNIPPETS = 80;
const WIDGET_ID = "snippet-copy";

export class SnippetStore {
	private snippets: Snippet[] = [];

	add(next: Snippet[]): void {
		if (next.length === 0) return;
		this.snippets = [...next, ...this.snippets].slice(0, MAX_SNIPPETS);
	}

	list(kind: SnippetKind): Snippet[] {
		return this.snippets.filter((snippet) => snippet.kind === kind);
	}

	rebuildFromSession(ctx: ExtensionContext): void {
		this.snippets = [];
		for (const entry of ctx.sessionManager.getBranch()) {
			const message = (entry as any).message;
			if (!message || message.role !== "assistant") continue;
			this.add(extractSnippets(textFromContent(message.content), (entry as any).timestamp ?? Date.now()));
		}
	}

	updateWidget(ctx: ExtensionContext): void {
		if (!ctx.hasUI) return;

		const codeCount = this.list("code").length;
		const msgCount = this.list("message").length;
		if (codeCount === 0 && msgCount === 0) {
			ctx.ui.setWidget(WIDGET_ID, undefined);
			return;
		}

		ctx.ui.setWidget(WIDGET_ID, [
			ctx.ui.theme.fg("dim", `copy: ${codeCount} code • ${msgCount} msg • /copy-code • /copy-msg`),
		]);
	}
}
