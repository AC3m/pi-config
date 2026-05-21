import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { getCavemanStateUpdate } from "./caveman.js";
import { SessionStatusWidget } from "./session-status-widget.js";
import { getSbAiVersion } from "./sb-ai.js";
import { extractLoadedContextSkills } from "./skills.js";
import type { CavemanStateUpdate, SessionStatusState } from "./types.js";

const WIDGET_ID = "session-status";

const state: SessionStatusState = {
	cavemanEnabled: true,
	cavemanLevel: "full",
	loadedSkillNames: [],
};

function sessionMessages(ctx: ExtensionContext): unknown[] {
	return ctx.sessionManager
		.getBranch()
		.map((entry) => (entry as { message?: unknown }).message)
		.filter((message): message is unknown => Boolean(message));
}

function snapshotState(): SessionStatusState {
	return {
		...state,
		loadedSkillNames: [...state.loadedSkillNames],
	};
}

function updateSessionStatusWidget(ctx: ExtensionContext): void {
	if (!ctx.hasUI) return;

	state.sbAiVersion = getSbAiVersion();
	ctx.ui.setWidget(WIDGET_ID, (_tui, theme) => new SessionStatusWidget(theme, snapshotState()));
}

function applyCavemanStateUpdate(update: CavemanStateUpdate): void {
	state.cavemanEnabled = update.enabled;
	if (update.enabled && update.level) state.cavemanLevel = update.level;
}

function refreshLoadedContextSkills(ctx: ExtensionContext, messages: unknown[]): void {
	state.loadedSkillNames = extractLoadedContextSkills(messages);
	updateSessionStatusWidget(ctx);
}

export default function sessionStatusExtension(pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		refreshLoadedContextSkills(ctx, sessionMessages(ctx));
	});

	pi.on("context", (event, ctx) => {
		refreshLoadedContextSkills(ctx, event.messages);
	});

	pi.on("input", (event, ctx) => {
		const cavemanUpdate = getCavemanStateUpdate(event.text);
		if (cavemanUpdate) {
			applyCavemanStateUpdate(cavemanUpdate);
			updateSessionStatusWidget(ctx);
		}
		return { action: "continue" as const };
	});
}
