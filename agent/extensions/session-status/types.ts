import type { CavemanLevel } from "../caveman-mode/events.js";

export interface SessionStatusState {
	cavemanEnabled: boolean;
	cavemanLevel?: CavemanLevel;
	loadedSkillNames: string[];
	sbAiVersion?: string;
}
