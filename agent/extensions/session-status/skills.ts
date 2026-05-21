function isValidSkillName(name: string): boolean {
	return /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(name) && !name.includes("--");
}

function addUniqueSkillName(names: string[], name: string | undefined): void {
	const normalized = name?.trim();
	if (normalized && isValidSkillName(normalized) && !names.includes(normalized)) names.push(normalized);
}

function textFromContent(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";

	return content
		.map((part) => {
			if (typeof part === "string") return part;
			if (!part || typeof part !== "object") return "";
			const value = part as { text?: unknown; content?: unknown };
			if (typeof value.text === "string") return value.text;
			if (typeof value.content === "string") return value.content;
			return "";
		})
		.filter(Boolean)
		.join("\n");
}

function extractSkillBlockNames(text: string): string[] {
	const names: string[] = [];
	for (const match of text.matchAll(/<skill\s+[^>]*name=["']([^"']+)["'][^>]*>/g)) {
		addUniqueSkillName(names, match[1]);
	}
	return names;
}

function extractFrontmatterSkillName(text: string): string | undefined {
	const frontmatter = text.match(/^---\s*\n([\s\S]*?)\n---/);
	const name = frontmatter?.[1]?.match(/^name:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1];
	return name?.trim();
}

function extractToolCallContent(content: unknown): Array<{ id?: string; name?: string; arguments?: Record<string, unknown> }> {
	if (!Array.isArray(content)) return [];
	return content.filter((part): part is { id?: string; name?: string; arguments?: Record<string, unknown> } => {
		return !!part && typeof part === "object" && (part as { type?: unknown }).type === "toolCall";
	});
}

export function extractLoadedContextSkills(messages: unknown[]): string[] {
	const names: string[] = [];
	const readPathsByToolCallId = new Map<string, string>();

	for (const message of messages as Array<{ role?: string; content?: unknown; toolCallId?: string; toolName?: string }>) {
		const text = textFromContent(message.content);
		if (message.role === "user") {
			for (const name of extractSkillBlockNames(text)) addUniqueSkillName(names, name);
		}

		if (message.role === "assistant") {
			for (const toolCall of extractToolCallContent(message.content)) {
				const path = toolCall.arguments?.path;
				if (toolCall.id && toolCall.name === "read" && typeof path === "string") {
					readPathsByToolCallId.set(toolCall.id, path);
				}
			}
		}

		if (message.role === "toolResult" && message.toolName === "read") {
			const path = message.toolCallId ? readPathsByToolCallId.get(message.toolCallId) : undefined;
			const isSkillFile = path?.endsWith("SKILL.md") || path?.includes("/skills/");
			if (isSkillFile) addUniqueSkillName(names, extractFrontmatterSkillName(text));
		}
	}

	return names;
}
