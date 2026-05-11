import { writeFileSync } from "node:fs";
import { basename } from "node:path";

export type WarpCliAgentEvent =
	| "session_start"
	| "prompt_submit"
	| "tool_complete"
	| "stop"
	| "permission_request"
	| "permission_replied"
	| "question_asked"
	| "idle_prompt";

type WarpCliAgentFields = Partial<{
	query: string;
	response: string;
	summary: string;
	tool_name: string;
	tool_input: { command?: string; file_path?: string };
	plugin_version: string;
}>;

const SENTINEL_TITLE = "warp://cli-agent";
const IMPLEMENTED_PROTOCOL_VERSION = 1;
const MAX_FIELD_LENGTH = 280;

export function isWarpCliAgentProtocolAvailable(): boolean {
	const supportedVersion = Number(process.env.WARP_CLI_AGENT_PROTOCOL_VERSION);
	return Boolean(supportedVersion >= IMPLEMENTED_PROTOCOL_VERSION && process.env.WARP_CLIENT_VERSION);
}

function clean(value: string): string {
	const normalized = value
		.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	return normalized.length > MAX_FIELD_LENGTH ? `${normalized.slice(0, MAX_FIELD_LENGTH - 3)}...` : normalized;
}

function cleanFields(fields: WarpCliAgentFields): WarpCliAgentFields {
	const cleaned: WarpCliAgentFields = {};

	if (fields.query) cleaned.query = clean(fields.query);
	if (fields.response) cleaned.response = clean(fields.response);
	if (fields.summary) cleaned.summary = clean(fields.summary);
	if (fields.tool_name) cleaned.tool_name = clean(fields.tool_name);
	if (fields.plugin_version) cleaned.plugin_version = clean(fields.plugin_version);
	if (fields.tool_input) {
		cleaned.tool_input = {
			...(fields.tool_input.command ? { command: clean(fields.tool_input.command) } : {}),
			...(fields.tool_input.file_path ? { file_path: clean(fields.tool_input.file_path) } : {}),
		};
	}

	return cleaned;
}

export function emitWarpCliAgentEvent(cwd: string, event: WarpCliAgentEvent, fields: WarpCliAgentFields = {}): void {
	if (!isWarpCliAgentProtocolAvailable()) return;

	const body = JSON.stringify({
		v: IMPLEMENTED_PROTOCOL_VERSION,
		agent: "pi",
		event,
		session_id: `pi-${process.pid}`,
		cwd,
		project: basename(cwd),
		...cleanFields(fields),
	});
	const message = `\x1b]777;notify;${SENTINEL_TITLE};${body}\x07`;

	try {
		writeFileSync("/dev/tty", message);
	} catch {
		process.stdout.write(message);
	}
}
