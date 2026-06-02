import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { UPDATE_COMMAND } from "./config.js";
import { isUpdateInFlight } from "./update-flow.js";
import { getAvailableUpdate } from "./versions.js";

let autoCheckInFlight = false;
let queuedUpdateVersion: string | undefined;

export function clearQueuedUpdate(): void {
	queuedUpdateVersion = undefined;
}

export function maybeQueueUpdate(pi: ExtensionAPI, ctx: ExtensionContext): void {
	if (autoCheckInFlight || isUpdateInFlight()) return;
	autoCheckInFlight = true;

	void (async () => {
		try {
			const update = await getAvailableUpdate();
			if (!update || queuedUpdateVersion === update.latest) return;

			queuedUpdateVersion = update.latest;
			ctx.ui.notify(`sb-ai ${update.latest} available; updating after current turn.`, "info");
			pi.sendUserMessage(`/${UPDATE_COMMAND}`, { deliverAs: "followUp" });
		} catch {
			// Never block or noisy-fail Pi startup because an update check failed.
		} finally {
			autoCheckInFlight = false;
		}
	})();
}
