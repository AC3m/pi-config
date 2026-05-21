export const CAVEMAN_STATUS_EVENT = "caveman-mode:status";

export type CavemanLevel = "lite" | "full" | "ultra";

export interface CavemanState {
	enabled: boolean;
	level?: CavemanLevel;
}

export type CavemanStateUpdate = { enabled: false } | { enabled: true; level: CavemanLevel };
