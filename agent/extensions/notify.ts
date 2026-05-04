import { execFile } from "node:child_process";
import { writeFileSync } from "node:fs";
import { basename } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

function isWarp(): boolean {
	return Boolean(process.env.WARP_CLI_AGENT_PROTOCOL_VERSION && process.env.WARP_CLIENT_VERSION);
}

function truncate(value: string, max = 96): string {
	return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function textFromContent(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.filter((block: any) => block?.type === "text")
		.map((block: any) => block.text ?? "")
		.join(" ")
		.trim();
}

function lastAssistantText(messages: unknown): string {
	if (!Array.isArray(messages)) return "";
	for (let index = messages.length - 1; index >= 0; index--) {
		const message = messages[index] as any;
		if (message?.role === "assistant") return textFromContent(message.content ?? "");
	}
	return "";
}

function notifyWarp(cwd: string, query: string, response: string): void {
	const project = basename(cwd);
	const title = `π Pi • ${project}`;
	const body = response || query || "Ready for input";
	const message = `\x1b]777;notify;${title};${truncate(body)}\x07`;

	try {
		writeFileSync("/dev/tty", message);
	} catch {}
}

function notifyMac(): void {
	execFile("terminal-notifier", ["-title", "Pi", "-message", "Ready for input", "-sound", "Glass"], () => {});
}

export default function (pi: ExtensionAPI) {
	let lastPrompt = "";

	pi.on("before_agent_start", async (event) => {
		lastPrompt = event.prompt;
	});

	pi.on("agent_end", async (event, ctx) => {
		if (isWarp()) {
			notifyWarp(ctx.cwd, lastPrompt, lastAssistantText(event.messages));
			return;
		}
		notifyMac();
	});
}
