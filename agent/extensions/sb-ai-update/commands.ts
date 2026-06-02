import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { clearQueuedUpdate } from "./auto-check.js";
import { RELOAD_COMMAND, UPDATE_COMMAND } from "./config.js";
import { runUpdateFlow } from "./update-flow.js";
import { getSbAiVersionLabel } from "./versions.js";

export function registerCommands(pi: ExtensionAPI): void {
	pi.registerCommand(UPDATE_COMMAND, {
		description: "Update sb-ai when a newer pi package version is available",
		handler: async (_args, ctx: ExtensionCommandContext) => {
			clearQueuedUpdate();
			await runUpdateFlow(ctx, async () => {
				await ctx.reload();
			});
			return;
		},
	});

	pi.registerCommand(RELOAD_COMMAND, {
		description: "Reload Pi resources after sb-ai updates",
		handler: async (_args, ctx: ExtensionCommandContext) => {
			await ctx.reload();
			return;
		},
	});

	pi.registerCommand("sb-ai-version", {
		description: "Show the installed sb-ai version",
		handler: async (_args, ctx) => {
			ctx.ui.notify(getSbAiVersionLabel(), "info");
		},
	});
}
