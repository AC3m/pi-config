/**
 * auto-name-session
 *
 * Registers a `set_session_name` tool so skills can set the current pi session
 * name through the runtime API instead of printing `/name`.
 *
 * Fires the `name-session` skill (which derives a name and calls the tool) when:
 *   1. The agent runs `git push` (via the bash tool).
 *   2. Every 10 user messages.
 *
 * Both triggers are gated on `pi.getSessionName()` being empty.
 * The skill is scheduled at most once per session, even if multiple triggers fire
 * before the queued skill turn gets to set the name.
 * User-set names are never overwritten.
 *
 * The skill itself owns the naming logic. This extension only schedules it.
 */

import { Type } from "@mariozechner/pi-ai";
import { defineTool, type ExtensionAPI } from "@mariozechner/pi-coding-agent";

const USER_MESSAGE_INTERVAL = 10;
const SCHEDULED_ENTRY = "auto-name-session:scheduled";

export default function (pi: ExtensionAPI) {
	pi.registerTool(
		defineTool({
			name: "set_session_name",
			label: "Set Session Name",
			description: "Set the current pi session display name.",
			parameters: Type.Object({
				name: Type.String({ description: "Session display name" }),
			}),
			async execute(_toolCallId, params) {
				const name = params.name.trim();
				if (!name) {
					return {
						content: [{ type: "text" as const, text: "Session name was empty; no change made." }],
						details: { changed: false },
					};
				}

				pi.setSessionName(name);
				return {
					content: [{ type: "text" as const, text: `Session name set: ${name}` }],
					details: { changed: true, name },
				};
			},
		}),
	);

	let userMessageCount = 0;
	let skillScheduled = false;

	function fireSkill(reason: string) {
		if (pi.getSessionName()) return;
		if (skillScheduled) return;
		skillScheduled = true;
		pi.appendEntry(SCHEDULED_ENTRY, { reason, at: new Date().toISOString() });
		pi.sendUserMessage("/skill:name-session", { deliverAs: "followUp" });
	}

	pi.on("session_start", async (_event, ctx) => {
		skillScheduled = ctx.sessionManager
			.getEntries()
			.some((entry: any) => entry?.type === "custom" && entry?.customType === SCHEDULED_ENTRY);
	});

	// Trigger 1: agent runs `git push`.
	pi.on("tool_call", async (event: any) => {
		if (pi.getSessionName()) return;
		if (event?.toolName !== "bash") return;
		const command: string = event?.input?.command ?? "";
		if (!/\bgit\s+push\b/.test(command)) return;
		fireSkill("git push");
	});

	// Trigger 2: every Nth user message.
	pi.on("before_agent_start", async () => {
		if (pi.getSessionName()) return;
		userMessageCount += 1;
		if (userMessageCount % USER_MESSAGE_INTERVAL !== 0) return;
		fireSkill("user message interval");
	});
}
