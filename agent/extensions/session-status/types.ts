export type CavemanLevel = "lite" | "full" | "ultra";

export type CavemanStateUpdate =
	| { enabled: false }
	| { enabled: true; level?: CavemanLevel };

export interface SessionStatusState {
	cavemanEnabled: boolean;
	cavemanLevel: CavemanLevel;
	loadedSkillNames: string[];
	sbAiVersion?: string;
}
