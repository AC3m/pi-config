export type GuardInspection = {
	command: string;
	normalizedCommand: string;
	matches: string[];
};

const COMMAND_PREVIEW_LIMIT = 4000;
const SHELL_COMMAND_BOUNDARIES = new Set([";", "&", "|", "(", ")", "do", "then", "else", "elif", "if", "while", "until", "!"]);
const SHELL_COMMAND_PREFIXES = new Set(["command", "builtin", "time", "env"]);

export function inspectCommand(command: string): GuardInspection {
	const normalizedCommand = normalizeCommand(command);
	const matches = hasGitPushForce(normalizedCommand) ? ["git push --force*"] : [];

	return { command, normalizedCommand, matches };
}

export function hasMatches(inspection: GuardInspection): boolean {
	return inspection.matches.length > 0;
}

export function blockReason(inspection: GuardInspection): string {
	return `Blocked by hard guard: ${inspection.matches.join(", ")}`;
}

export function approvalMessage(inspection: GuardInspection): string {
	return [
		"Matched:",
		...inspection.matches.map((match) => `- ${match}`),
		"",
		commandPreview(inspection.command),
		"",
		"Allow this command once?",
	].join("\n");
}

function hasGitPushForce(command: string): boolean {
	const tokens = tokenizeShell(command);

	for (let index = 0; index < tokens.length; index++) {
		if (commandName(tokens[index]) !== "git") continue;
		if (!isGitCommandPosition(tokens, index)) continue;

		const invocation = tokens.slice(index, nextSeparatorIndex(tokens, index));
		if (isGitPushForceInvocation(invocation)) return true;
	}

	return false;
}

function isGitPushForceInvocation(tokens: string[]): boolean {
	const push = nextGitSubcommand(tokens, 1);
	if (!push || push.value !== "push") return false;

	return tokens.slice(push.index + 1).some(isLongForceFlag);
}

function nextGitSubcommand(tokens: string[], startIndex: number): { value: string; index: number } | undefined {
	for (let index = startIndex; index < tokens.length; index++) {
		const token = tokens[index];
		if (isOption(token)) {
			if (gitOptionConsumesNextValue(token)) index++;
			continue;
		}
		return { value: token.toLowerCase(), index };
	}
	return undefined;
}

function isLongForceFlag(token: string): boolean {
	return token === "--force" || token.startsWith("--force-") || token.startsWith("--force=");
}

function isGitCommandPosition(tokens: string[], index: number): boolean {
	let cursor = index - 1;
	while (cursor >= 0 && isShellAssignment(tokens[cursor])) cursor--;

	if (cursor < 0) return true;
	if (SHELL_COMMAND_BOUNDARIES.has(tokens[cursor].toLowerCase())) return true;
	if (SHELL_COMMAND_PREFIXES.has(commandName(tokens[cursor]))) return isGitCommandPosition(tokens, cursor);

	return false;
}

function isShellAssignment(token: string): boolean {
	return /^[A-Za-z_][A-Za-z0-9_]*=/.test(token);
}

function gitOptionConsumesNextValue(token: string): boolean {
	if (token.includes("=")) return false;
	return ["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path", "--config-env"].includes(token);
}

function tokenizeShell(command: string): string[] {
	const tokens: string[] = [];
	let current = "";
	let quote: "'" | '"' | undefined;
	let escaped = false;

	for (let index = 0; index < command.length; index++) {
		const char = command[index];

		if (escaped) {
			current += char;
			escaped = false;
			continue;
		}

		if (char === "\\" && quote !== "'") {
			escaped = true;
			continue;
		}

		if (quote) {
			if (char === quote) quote = undefined;
			else current += char;
			continue;
		}

		if (char === "'" || char === '"') {
			quote = char;
			continue;
		}

		if (/\s/.test(char)) {
			flushToken();
			continue;
		}

		if (isSeparator(char)) {
			flushToken();
			if ((char === "&" || char === "|") && command[index + 1] === char) index++;
			tokens.push(char);
			continue;
		}

		current += char;
	}

	flushToken();
	return tokens;

	function flushToken() {
		if (!current) return;
		tokens.push(current);
		current = "";
	}
}

function nextSeparatorIndex(tokens: string[], startIndex: number): number {
	for (let index = startIndex; index < tokens.length; index++) {
		if (isSeparator(tokens[index])) return index;
	}
	return tokens.length;
}

function isOption(token: string): boolean {
	return token.startsWith("-") && token !== "-";
}

function commandName(token: string): string {
	return token.replace(/^.*\//, "").toLowerCase();
}

function isSeparator(token: string): boolean {
	return token.length === 1 && ";&|()".includes(token);
}

function normalizeCommand(command: string): string {
	return command.replace(/\\\r?\n/g, " ").replace(/\s+/g, " ").trim();
}

function commandPreview(command: string): string {
	if (command.length <= COMMAND_PREVIEW_LIMIT) return command;
	return `${command.slice(0, COMMAND_PREVIEW_LIMIT)}\n... [truncated ${command.length - COMMAND_PREVIEW_LIMIT} chars]`;
}
