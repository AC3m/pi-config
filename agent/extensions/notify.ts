import { execFile } from "node:child_process";
import { writeFileSync } from "node:fs";
import { basename } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

function isWarp(): boolean {
	return Boolean(process.env.WARP_CLI_AGENT_PROTOCOL_VERSION && process.env.WARP_CLIENT_VERSION);
}

function notifyWarp(cwd: string): void {
	const payload = {
		v: 1,
		agent: "pi",
		event: "stop",
		cwd,
		project: basename(cwd),
		response: "Ready for input",
	};

	writeFileSync("/dev/tty", `\x1b]777;notify;warp://cli-agent;${JSON.stringify(payload)}\x07`);
}

function notifyMac(): void {
	execFile("terminal-notifier", ["-title", "Pi", "-message", "Ready for input", "-sound", "Glass"], () => {});
}

export default function (pi: ExtensionAPI) {
	pi.on("agent_end", async (_event, ctx) => {
		if (isWarp()) notifyWarp(ctx.cwd);
		else notifyMac();
	});
}
