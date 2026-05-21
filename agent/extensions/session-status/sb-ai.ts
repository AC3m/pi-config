import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SB_AI_DIRECTORY_NAME = "sb-ai";
const VERSION_CACHE_MS = 60_000;
const MAX_SEARCH_DEPTH = 8;

let cachedVersion: { value?: string; timestamp: number } | undefined;

function readTextFile(path: string): string | undefined {
	if (!existsSync(path)) return undefined;
	const value = readFileSync(path, "utf8").trim();
	return value.length > 0 ? value : undefined;
}

function runGit(repoPath: string, args: string[]): string | undefined {
	try {
		const value = execFileSync("git", ["-C", repoPath, ...args], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
			timeout: 5000,
		}).trim();
		return value.length > 0 ? value : undefined;
	} catch {
		return undefined;
	}
}

function configuredSbAiPath(): string | undefined {
	const configuredPath = process.env.PI_SB_AI_PATH ?? process.env.SB_AI_PATH;
	return configuredPath && existsSync(configuredPath) ? configuredPath : undefined;
}

function listDirectory(root: string) {
	try {
		return readdirSync(root, { withFileTypes: true });
	} catch {
		return [];
	}
}

function findDirectoryByName(root: string, name: string, remainingDepth: number): string | undefined {
	if (remainingDepth < 0 || !existsSync(root)) return undefined;

	for (const entry of listDirectory(root)) {
		if (!entry.isDirectory()) continue;

		const path = join(root, entry.name);
		if (entry.name === name) return path;

		const nestedPath = findDirectoryByName(path, name, remainingDepth - 1);
		if (nestedPath) return nestedPath;
	}

	return undefined;
}

function findInstalledSbAiPath(): string | undefined {
	const agentDir = process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent");
	return findDirectoryByName(join(agentDir, "git"), SB_AI_DIRECTORY_NAME, MAX_SEARCH_DEPTH);
}

function readSbAiVersion(): string | undefined {
	const packagePath = configuredSbAiPath() ?? findInstalledSbAiPath();
	if (!packagePath) return undefined;

	const version = readTextFile(join(packagePath, "VERSION")) ?? runGit(packagePath, ["describe", "--tags", "--always", "--dirty"]);
	return version ? `v${version.replace(/^v/, "")}` : undefined;
}

export function getSbAiVersion(): string | undefined {
	const now = Date.now();
	if (cachedVersion && now - cachedVersion.timestamp < VERSION_CACHE_MS) return cachedVersion.value;

	cachedVersion = { value: readSbAiVersion(), timestamp: now };
	return cachedVersion.value;
}
