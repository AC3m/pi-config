import { execFile } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { completionBody, notificationTitle } from "./warp-cli-agent/copy.js";
import { isWarpCliAgentProtocolAvailable } from "./warp-cli-agent/status.js";

function notifyMac(title: string): void {
	execFile("terminal-notifier", ["-title", title, "-subtitle", "Pi", "-message", completionBody(), "-sound", "Glass"], () => {});
}

export default function (pi: ExtensionAPI) {
	let lastPrompt = "";

	pi.on("before_agent_start", async (event) => {
		lastPrompt = event.prompt;
	});

	pi.on("agent_end", async () => {
		if (isWarpCliAgentProtocolAvailable()) return;
		notifyMac(notificationTitle(pi.getSessionName(), lastPrompt));
	});
}
