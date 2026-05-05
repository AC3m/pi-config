export type SnippetKind = "code" | "message";
export type CopyMode = "raw" | "rich";

export interface Snippet {
	id: string;
	kind: SnippetKind;
	language?: string;
	content: string;
	preview: string;
	timestamp: number;
}
