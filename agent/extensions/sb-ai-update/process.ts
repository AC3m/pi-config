import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { commandEnv, PACKAGE_PATH } from "./config.js";

const execFileAsync = promisify(execFile);

export function runGit(args: string[]): string | undefined {
	try {
		return execFileSync("git", ["-C", PACKAGE_PATH, ...args], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
			env: commandEnv(),
		}).trim();
	} catch {
		return undefined;
	}
}

export async function run(command: string, args: string[], timeout: number, cwd = PACKAGE_PATH): Promise<string> {
	const { stdout } = await execFileAsync(command, args, {
		cwd,
		timeout,
		maxBuffer: 1024 * 1024,
		encoding: "utf8",
		env: commandEnv(),
	});
	return stdout.trim();
}
