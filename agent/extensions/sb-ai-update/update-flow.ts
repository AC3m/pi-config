import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { existsSync } from "node:fs";
import { PACKAGE_PATH, PACKAGE_SOURCE, UPDATE_CWD, UPDATE_TIMEOUT_MS } from "./config.js";
import { run } from "./process.js";
import { getAvailableUpdate, getSbAiVersionLabel } from "./versions.js";

let updateInFlight = false;

export function isUpdateInFlight(): boolean {
	return updateInFlight;
}

async function updateSbAi(): Promise<void> {
	await run("pi", ["update", PACKAGE_SOURCE], UPDATE_TIMEOUT_MS, UPDATE_CWD);
}

export async function runUpdateFlow(ctx: ExtensionContext, reloadAfterUpdate?: () => Promise<void>): Promise<void> {
	if (updateInFlight) {
		ctx.ui.notify("sb-ai update already running.", "info");
		return;
	}

	updateInFlight = true;

	try {
		if (!existsSync(PACKAGE_PATH)) {
			ctx.ui.notify("sb-ai is not installed.", "warning");
			return;
		}

		const update = await getAvailableUpdate();
		if (!update) {
			ctx.ui.notify(`${getSbAiVersionLabel()} is up to date.`, "info");
			return;
		}

		ctx.ui.notify(`Updating sb-ai ${update.current} → ${update.latest}...`, "info");
		await updateSbAi();

		if (reloadAfterUpdate) {
			ctx.ui.notify(`Updated sb-ai to ${update.latest}. Reloading Pi resources...`, "info");
			await reloadAfterUpdate();
			return;
		}

		ctx.ui.notify(`Updated sb-ai to ${update.latest}. Run /reload to load new resources.`, "info");
	} catch (error) {
		ctx.ui.notify(`sb-ai update failed: ${(error as Error).message}`, "error");
	} finally {
		updateInFlight = false;
	}
}
