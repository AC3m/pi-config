import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { buildCavemanSystemPrompt, getCavemanStateUpdate, getConfiguredCavemanState } from "./caveman.js";
import { CAVEMAN_STATUS_EVENT, type CavemanState, type CavemanStateUpdate } from "./events.js";

const state: CavemanState = { enabled: false };

let missingCavemanSkillNotified = false;

function snapshotState(): CavemanState {
	return { ...state };
}

function publishState(pi: ExtensionAPI): void {
	pi.events.emit(CAVEMAN_STATUS_EVENT, snapshotState());
}

function applyCavemanStateUpdate(update: CavemanStateUpdate): void {
	state.enabled = update.enabled;
	if (!update.enabled) {
		state.level = undefined;
		return;
	}

	state.level = update.level;
}

function initializeCavemanState(): void {
	state.enabled = false;
	state.level = undefined;

	const configured = getConfiguredCavemanState();
	if (configured) applyCavemanStateUpdate(configured);
}

export default function cavemanModeExtension(pi: ExtensionAPI) {
	pi.on("session_start", () => {
		initializeCavemanState();
		publishState(pi);
	});

	pi.on("before_agent_start", (event, ctx) => {
		if (!state.enabled || !state.level) return undefined;

		const cavemanPrompt = buildCavemanSystemPrompt(pi, state.level);
		if (!cavemanPrompt) {
			if (!missingCavemanSkillNotified) {
				missingCavemanSkillNotified = true;
				ctx.ui.notify("Caveman is enabled, but no caveman SKILL.md was found.", "warning");
			}
			return undefined;
		}

		publishState(pi);
		return { systemPrompt: `${event.systemPrompt}\n\n${cavemanPrompt}` };
	});

	pi.on("input", (event) => {
		const cavemanUpdate = getCavemanStateUpdate(event.text);
		if (cavemanUpdate) {
			applyCavemanStateUpdate(cavemanUpdate);
			publishState(pi);
		}
		return { action: "continue" as const };
	});
}
