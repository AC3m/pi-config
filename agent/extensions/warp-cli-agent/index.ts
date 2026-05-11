import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { completionBody, notificationTitle } from "./copy.js";
import { emitWarpCliAgentEvent, isWarpCliAgentProtocolAvailable } from "./status.js";

const PLUGIN_VERSION = "pi-config-warp-cli-agent@1";

export default function (pi: ExtensionAPI) {
	let lastPrompt = "";
	let sessionStarted = false;

	function emitSessionStart(cwd: string, title: string): void {
		if (sessionStarted) return;
		sessionStarted = true;
		emitWarpCliAgentEvent(cwd, "session_start", {
			query: title,
			plugin_version: PLUGIN_VERSION,
		});
	}

	pi.on("before_agent_start", async (event, ctx) => {
		lastPrompt = event.prompt;
		if (!isWarpCliAgentProtocolAvailable()) return;

		const title = notificationTitle(pi.getSessionName(), lastPrompt);
		emitSessionStart(ctx.cwd, title);
		emitWarpCliAgentEvent(ctx.cwd, "prompt_submit", { query: title });
	});

	pi.on("agent_end", async (_event, ctx) => {
		if (!isWarpCliAgentProtocolAvailable()) return;

		emitWarpCliAgentEvent(ctx.cwd, "stop", {
			query: notificationTitle(pi.getSessionName(), lastPrompt),
			response: completionBody(),
		});
	});
}
