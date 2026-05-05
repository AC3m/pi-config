import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function commandExists(command: string): Promise<boolean> {
	try {
		await execFileAsync("sh", ["-lc", `command -v ${command}`], { timeout: 1000 });
		return true;
	} catch {
		return false;
	}
}

async function pipeTo(command: string, args: string[], input: string): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const child = spawn(command, args, { stdio: ["pipe", "ignore", "pipe"] });
		let stderr = "";
		const timeout = setTimeout(() => {
			child.kill("SIGTERM");
			reject(new Error(`${command} timed out`));
		}, 3000);

		child.stderr?.on("data", (chunk) => {
			stderr += String(chunk);
		});
		child.on("error", (error) => {
			clearTimeout(timeout);
			reject(error);
		});
		child.on("close", (code) => {
			clearTimeout(timeout);
			if (code === 0) resolve();
			else reject(new Error(`${command} exited ${code}${stderr ? `: ${stderr.trim()}` : ""}`));
		});
		child.stdin.end(input);
	});
}

async function copyViaOsc52(text: string): Promise<void> {
	const b64 = Buffer.from(text, "utf8").toString("base64");
	process.stdout.write(`\x1b]52;c;${b64}\x07`);
}

async function copyMacRichClipboard(text: string, html: string): Promise<void> {
	const script = `
ObjC.import('AppKit');
const plain = $.NSProcessInfo.processInfo.environment.objectForKey('PI_SNIPPET_PLAIN');
const rich = $.NSProcessInfo.processInfo.environment.objectForKey('PI_SNIPPET_HTML');
const pb = $.NSPasteboard.generalPasteboard;
pb.clearContents;
pb.setStringForType(plain, $.NSPasteboardTypeString);
pb.setStringForType(rich, $.NSPasteboardTypeHTML);
`;
	await new Promise<void>((resolve, reject) => {
		const child = spawn("osascript", ["-l", "JavaScript", "-e", script], {
			stdio: ["ignore", "ignore", "pipe"],
			env: { ...process.env, PI_SNIPPET_PLAIN: text, PI_SNIPPET_HTML: html },
		});
		let stderr = "";
		child.stderr?.on("data", (chunk) => {
			stderr += String(chunk);
		});
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`osascript exited ${code}${stderr ? `: ${stderr.trim()}` : ""}`));
		});
	});
}

export async function copyToClipboard(text: string, html?: string): Promise<string> {
	if (process.platform === "darwin" && html && await commandExists("osascript")) {
		await copyMacRichClipboard(text, html);
		return "macOS rich clipboard";
	}
	if (process.platform === "darwin" && await commandExists("pbcopy")) {
		await pipeTo("pbcopy", [], text);
		return "pbcopy";
	}
	if (process.platform === "win32" && await commandExists("clip.exe")) {
		await pipeTo("clip.exe", [], text);
		return "clip.exe";
	}
	if (html && await commandExists("wl-copy")) {
		await pipeTo("wl-copy", ["--type", "text/html"], html);
		return "wl-copy html";
	}
	if (await commandExists("wl-copy")) {
		await pipeTo("wl-copy", [], text);
		return "wl-copy";
	}
	if (await commandExists("xclip")) {
		await pipeTo("xclip", ["-selection", "clipboard"], text);
		return "xclip";
	}
	if (await commandExists("xsel")) {
		await pipeTo("xsel", ["--clipboard", "--input"], text);
		return "xsel";
	}
	await copyViaOsc52(text);
	return "OSC 52";
}
