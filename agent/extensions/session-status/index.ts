import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { CAVEMAN_STATUS_EVENT, type CavemanState } from "../caveman-mode/events.js";
import { SessionStatusWidget } from "./session-status-widget.js";
import { getSbAiVersion } from "./sb-ai.js";
import { extractLoadedContextSkills } from "./skills.js";
import type { SessionStatusState } from "./types.js";

const WIDGET_ID = "session-status";
const CAVEMAN_SKILL_NAME = "caveman";

const state: SessionStatusState = {
	cavemanEnabled: false,
	loadedSkillNames: [],
};

let currentContext: ExtensionContext | undefined;

function sessionMessages(ctx: ExtensionContext): unknown[] {
	return ctx.sessionManager
		.getBranch()
		.map((entry) => (entry as { message?: unknown }).message)
		.filter((message): message is unknown => Boolean(message));
}

function loadedSkillNames(): string[] {
	const names = [...state.loadedSkillNames];
	if (state.cavemanEnabled && !names.includes(CAVEMAN_SKILL_NAME)) names.unshift(CAVEMAN_SKILL_NAME);
	return names;
}

function snapshotState(): SessionStatusState {
	return {
		...state,
		loadedSkillNames: loadedSkillNames(),
	};
}

function updateSessionStatusWidget(ctx: ExtensionContext): void {
	if (!ctx.hasUI) return;

	state.sbAiVersion = getSbAiVersion();
	ctx.ui.setWidget(WIDGET_ID, (_tui, theme) => new SessionStatusWidget(theme, snapshotState()));
}

function applyCavemanState(status: CavemanState): void {
	state.cavemanEnabled = status.enabled;
	state.cavemanLevel = status.level;

	if (currentContext) updateSessionStatusWidget(currentContext);
}

function refreshLoadedContextSkills(ctx: ExtensionContext, messages: unknown[]): void {
	currentContext = ctx;
	state.loadedSkillNames = extractLoadedContextSkills(messages);
	updateSessionStatusWidget(ctx);
}

export default function sessionStatusExtension(pi: ExtensionAPI) {
	pi.events.on(CAVEMAN_STATUS_EVENT, applyCavemanState);

	pi.on("session_start", async (_event, ctx) => {
		refreshLoadedContextSkills(ctx, sessionMessages(ctx));
	});

	pi.on("session_shutdown", () => {
		currentContext = undefined;
	});

	pi.on("context", (event, ctx) => {
		refreshLoadedContextSkills(ctx, event.messages);
	});
}
