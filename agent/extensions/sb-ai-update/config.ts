import { homedir } from "node:os";
import { join } from "node:path";

export const PACKAGE_SOURCE = "git:git@gitlab.com:williamhillplc/sports/sportsbook-platform/sb-ai.git";
export const UPDATE_COMMAND = "sb-ai-update";
export const RELOAD_COMMAND = "sb-ai-reload";
export const GIT_TIMEOUT_MS = 30_000;
export const UPDATE_TIMEOUT_MS = 120_000;
export const SEMVER_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)$/;

export const PACKAGE_PATH = join(
	process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent"),
	"git",
	"gitlab.com",
	"williamhillplc",
	"sports",
	"sportsbook-platform",
	"sb-ai",
);
export const UPDATE_CWD = homedir();

export function commandEnv(): NodeJS.ProcessEnv {
	return {
		...process.env,
		GIT_TERMINAL_PROMPT: "0",
		GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND ?? "ssh -o BatchMode=yes -o ConnectTimeout=10",
	};
}
