import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { Snippet, SnippetKind } from "./types.js";
import { extractSnippets } from "./extraction.js";
import { textFromContent } from "./text.js";

const MAX_SNIPPETS = 80;

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
}
