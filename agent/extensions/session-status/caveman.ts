import type { CavemanLevel, CavemanStateUpdate } from "./types.js";

const CAVEMAN_LEVELS = ["lite", "full", "ultra"] as const;
const CAVEMAN_OFF_PHRASES = ["stop caveman", "disable caveman", "caveman off", "normal mode", "verbose"];
const CAVEMAN_ON_PHRASES = ["caveman", "less tokens", "be brief", "be terse"];

function getCavemanLevel(text: string): CavemanLevel | undefined {
	const match = text.match(/\bcaveman\s*(?::|=)?\s*(lite|full|ultra)\b/);
	const level = match?.[1];
	return CAVEMAN_LEVELS.find((candidate) => candidate === level);
}

export function getCavemanStateUpdate(text: string): CavemanStateUpdate | undefined {
	const normalized = text.toLowerCase();
	if (CAVEMAN_OFF_PHRASES.some((phrase) => normalized.includes(phrase))) return { enabled: false };

	const level = getCavemanLevel(normalized);
	if (level) return { enabled: true, level };

	if (CAVEMAN_ON_PHRASES.some((phrase) => normalized.includes(phrase))) return { enabled: true };
	return undefined;
}
