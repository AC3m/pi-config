import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import type { CavemanLevel, CavemanStateUpdate } from "./events.js";

const CAVEMAN_LEVELS = ["lite", "full", "ultra"] as const;
const CAVEMAN_OFF_PHRASES = ["stop caveman", "disable caveman", "caveman off", "normal mode", "verbose"];
const OFF_VALUES = new Set(["0", "false", "no", "off", "disable", "disabled"]);
const AGENT_DIR = process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent");
const DEFAULT_CAVEMAN_CONFIG_PATH = join(AGENT_DIR, "extensions", "caveman-mode", "config.json");

interface CavemanConfig {
	enabled?: boolean;
	level?: string;
	skillPath?: string;
}

type CommandInfo = ReturnType<ExtensionAPI["getCommands"]>[number];

function normalize(value: string): string {
	return value.trim().toLowerCase();
}

function isCavemanLevel(value: string | undefined): value is CavemanLevel {
	return CAVEMAN_LEVELS.some((level) => level === value);
}

function expandPath(path: string): string {
	if (path === "~") return homedir();
	if (path.startsWith("~/")) return join(homedir(), path.slice(2));
	return isAbsolute(path) ? path : join(AGENT_DIR, path);
}

function isFile(path: string): boolean {
	try {
		return statSync(path).isFile();
	} catch {
		return false;
	}
}

function readTextFile(path: string): string | undefined {
	if (!isFile(path)) return undefined;
	const value = readFileSync(path, "utf8").trim();
	return value.length > 0 ? value : undefined;
}

function getCavemanConfigPath(): string {
	return expandPath(process.env.PI_CAVEMAN_CONFIG ?? DEFAULT_CAVEMAN_CONFIG_PATH);
}

function readCavemanConfig(): CavemanConfig | undefined {
	const text = readTextFile(getCavemanConfigPath());
	if (!text) return undefined;

	try {
		return JSON.parse(text) as CavemanConfig;
	} catch {
		return undefined;
	}
}

function stateFromValue(value: string | undefined): CavemanStateUpdate | undefined {
	if (!value) return undefined;

	const normalized = normalize(value);
	if (OFF_VALUES.has(normalized)) return { enabled: false };
	if (isCavemanLevel(normalized)) return { enabled: true, level: normalized };
	return undefined;
}

function stateFromEnvironmentPair(modeName: string, levelName: string): CavemanStateUpdate | undefined {
	const mode = stateFromValue(process.env[modeName]);
	if (mode && !mode.enabled) return mode;

	const level = stateFromValue(process.env[levelName]);
	if (level) return level;

	return mode;
}

function getEnvironmentCavemanState(): CavemanStateUpdate | undefined {
	return (
		stateFromEnvironmentPair("PI_CAVEMAN", "PI_CAVEMAN_LEVEL") ??
		stateFromEnvironmentPair("SB_AI_CAVEMAN", "SB_AI_CAVEMAN_LEVEL") ??
		stateFromEnvironmentPair("CAVEMAN", "CAVEMAN_LEVEL")
	);
}

export function getConfiguredCavemanState(): CavemanStateUpdate | undefined {
	const environmentState = getEnvironmentCavemanState();
	if (environmentState) return environmentState;

	const config = readCavemanConfig();
	if (!config) return undefined;
	if (config.enabled === false) return { enabled: false };

	const level = typeof config.level === "string" ? normalize(config.level) : undefined;
	if (isCavemanLevel(level)) return { enabled: true, level };
	return undefined;
}

function getCavemanLevel(text: string): CavemanLevel | undefined {
	const patterns = [
		/(?:^|[\s/:])caveman(?:\s+(?:mode|level))?\s*(?::|=)?\s*(lite|full|ultra)\b/,
		/\b(lite|full|ultra)\s+caveman\b/,
	];

	for (const pattern of patterns) {
		const level = pattern.exec(text)?.[1];
		if (isCavemanLevel(level)) return level;
	}

	return undefined;
}

export function getCavemanStateUpdate(text: string): CavemanStateUpdate | undefined {
	const normalized = normalize(text);
	if (CAVEMAN_OFF_PHRASES.some((phrase) => normalized.includes(phrase))) return { enabled: false };

	const level = getCavemanLevel(normalized);
	if (level) return { enabled: true, level };
	return undefined;
}

function stripFrontmatter(text: string): string {
	return text.replace(/^---\s*\n[\s\S]*?\n---\s*/, "").trim();
}

function toSkillFilePath(path: string): string | undefined {
	const expanded = expandPath(path);
	if (isFile(expanded)) return expanded;

	const nestedSkillFile = join(expanded, "SKILL.md");
	return isFile(nestedSkillFile) ? nestedSkillFile : undefined;
}

function isCavemanSkillCommand(command: CommandInfo): boolean {
	if (command.source !== "skill") return false;
	if (command.name === "caveman" || command.name === "skill:caveman" || command.name.endsWith(":caveman")) return true;
	return /(?:^|\/)caveman(?:\/SKILL\.md)?$/.test(command.sourceInfo.path);
}

function findCavemanSkillPath(pi: ExtensionAPI): string | undefined {
	const configSkillPath = readCavemanConfig()?.skillPath;
	if (configSkillPath) {
		const path = toSkillFilePath(configSkillPath);
		if (path) return path;
	}

	for (const command of pi.getCommands()) {
		if (!isCavemanSkillCommand(command)) continue;

		const path = toSkillFilePath(command.sourceInfo.path);
		if (path) return path;
	}

	return [
		join(AGENT_DIR, "skills", "caveman", "SKILL.md"),
		join(
			AGENT_DIR,
			"git",
			"gitlab.com",
			"williamhillplc",
			"sports",
			"sportsbook-platform",
			"sb-ai",
			"skills",
			"caveman",
			"SKILL.md",
		),
	]
		.map(toSkillFilePath)
		.find((path): path is string => Boolean(path));
}

export function buildCavemanSystemPrompt(pi: ExtensionAPI, level: CavemanLevel): string | undefined {
	const skillPath = findCavemanSkillPath(pi);
	const skillText = skillPath ? readTextFile(skillPath) : undefined;
	if (!skillText) return undefined;

	return `Caveman mode active. Required level: ${level}.\n\n${stripFrontmatter(skillText)}`;
}
