import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { clearQueuedUpdate, maybeQueueUpdate } from "./auto-check.js";
import { registerCommands } from "./commands.js";
import { RELOAD_COMMAND, UPDATE_COMMAND } from "./config.js";
import { runUpdateFlow } from "./update-flow.js";

export default function sbAiUpdateExtension(pi: ExtensionAPI) {
	registerCommands(pi);

	pi.on("input", async (event, ctx) => {
		if (event.text.trim() !== `/${UPDATE_COMMAND}`) return { action: "continue" };

		clearQueuedUpdate();
		await runUpdateFlow(ctx, async () => {
			pi.sendUserMessage(`/${RELOAD_COMMAND}`, { deliverAs: "followUp" });
		});
		return { action: "handled" };
	});

	pi.on("session_start", async (_event, ctx) => {
		maybeQueueUpdate(pi, ctx);
	});
}
