import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GIT_TIMEOUT_MS, PACKAGE_PATH, SEMVER_PATTERN } from "./config.js";
import { run, runGit } from "./process.js";

function readTextFile(path: string): string | undefined {
	if (!existsSync(path)) return undefined;
	const value = readFileSync(path, "utf8").trim();
	return value.length > 0 ? value : undefined;
}

export function parseVersion(version: string): [number, number, number] | undefined {
	const match = SEMVER_PATTERN.exec(version.trim());
	if (!match) return undefined;
	return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareVersions(left: string, right: string): number {
	const leftParts = parseVersion(left);
	const rightParts = parseVersion(right);
	if (!leftParts || !rightParts) return 0;

	for (let index = 0; index < leftParts.length; index += 1) {
		if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
	}
	return 0;
}

function highestVersion(versions: string[]): string | undefined {
	return versions.filter((version) => parseVersion(version)).sort(compareVersions).at(-1);
}

export function getSbAiVersionLabel(): string {
	if (!existsSync(PACKAGE_PATH)) return "sb-ai: not installed";

	const version = readTextFile(join(PACKAGE_PATH, "VERSION")) ?? runGit(["describe", "--tags", "--always", "--dirty"]);
	if (!version) return "sb-ai: installed, version unknown";
	return `sb-ai v${version.replace(/^v/, "")}`;
}

async function getInstalledVersion(): Promise<string | undefined> {
	if (!existsSync(PACKAGE_PATH)) return undefined;
	return readTextFile(join(PACKAGE_PATH, "VERSION"));
}

async function getLatestRemoteVersion(): Promise<string | undefined> {
	if (!existsSync(PACKAGE_PATH)) return undefined;
	await run("git", ["-C", PACKAGE_PATH, "fetch", "--quiet", "origin"], GIT_TIMEOUT_MS);

	const remoteVersion = await run("git", ["-C", PACKAGE_PATH, "show", "origin/main:VERSION"], GIT_TIMEOUT_MS).catch(
		() => undefined,
	);
	if (remoteVersion && parseVersion(remoteVersion)) return remoteVersion;

	const mergedTags = await run(
		"git",
		["-C", PACKAGE_PATH, "tag", "--merged", "origin/main", "--list", "v[0-9]*"],
		GIT_TIMEOUT_MS,
	).catch(() => "");
	return highestVersion(mergedTags.split("\n"));
}

export async function getAvailableUpdate(): Promise<{ current: string; latest: string } | undefined> {
	const current = await getInstalledVersion();
	if (!current) return undefined;

	const latest = await getLatestRemoteVersion();
	if (!latest || compareVersions(latest, current) <= 0) return undefined;

	return { current, latest };
}
