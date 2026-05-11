import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";

const FIGMA_API = "https://api.figma.com/v1";

type FigmaNode = {
	id: string;
	name: string;
	type: string;
	children?: FigmaNode[];
};

type NodeMatch = {
	id: string;
	name: string;
	type: string;
	path: string;
};

function token(): string {
	const value = process.env.FIGMA_TOKEN ?? process.env.FIGMA_ACCESS_TOKEN;
	if (!value) throw new Error("Set FIGMA_TOKEN or FIGMA_ACCESS_TOKEN before starting pi.");
	return value;
}

function parseFileKey(input: string): string {
	const trimmed = input.trim();
	const match = trimmed.match(/figma\.com\/(?:file|design)\/([^/?#]+)/);
	return match?.[1] ?? trimmed;
}

function normalizeNodeId(input: string): string {
	const trimmed = input.trim();
	const urlMatch = trimmed.match(/[?&]node-id=([^&#]+)/);
	const value = decodeURIComponent(urlMatch?.[1] ?? trimmed);
	return value.replace(/-/g, ":");
}

function sanitizeName(value: string): string {
	return value
		.replace(/[\\/:*?"<>|#%&{}$!'@+`=]/g, "-")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 120) || "figma-asset";
}

async function figmaGet<T>(path: string): Promise<T> {
	const res = await fetch(`${FIGMA_API}${path}`, {
		headers: { "X-Figma-Token": token() },
	});
	if (!res.ok) {
		const body = await res.text().catch(() => "");
		throw new Error(`Figma API ${res.status} ${res.statusText}: ${body}`);
	}
	return (await res.json()) as T;
}

function collectNodes(node: FigmaNode, path: string[] = [], out: NodeMatch[] = []): NodeMatch[] {
	const nextPath = [...path, node.name];
	out.push({ id: node.id, name: node.name, type: node.type, path: nextPath.join(" / ") });
	for (const child of node.children ?? []) collectNodes(child, nextPath, out);
	return out;
}

function pickTopLevelFrames(document: FigmaNode, allowedTypes: Set<string>): NodeMatch[] {
	const canvases = document.children ?? [];
	const matches: NodeMatch[] = [];
	for (const canvas of canvases) {
		for (const child of canvas.children ?? []) {
			if (allowedTypes.has(child.type)) {
				matches.push({ id: child.id, name: child.name, type: child.type, path: `${canvas.name} / ${child.name}` });
			}
		}
	}
	return matches;
}

async function download(url: string): Promise<Buffer> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Download failed ${res.status} ${res.statusText}: ${url}`);
	return Buffer.from(await res.arrayBuffer());
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "figma_list_nodes",
		label: "Figma List Nodes",
		description: "List/search Figma file nodes by name/type so assets can be exported by node ID.",
		promptSnippet: "List/search Figma nodes for asset export",
		promptGuidelines: [
			"Use figma_list_nodes to find node IDs before exporting Figma assets when the user gives a file URL but not node IDs.",
		],
		parameters: Type.Object({
			fileKeyOrUrl: Type.String({ description: "Figma file key or full Figma file/design URL" }),
			query: Type.Optional(Type.String({ description: "Case-insensitive name/path substring filter" })),
			types: Type.Optional(Type.Array(Type.String(), { description: "Node types to include, e.g. FRAME, COMPONENT, INSTANCE, VECTOR" })),
			limit: Type.Optional(Type.Number({ description: "Max rows to return. Default 50." })),
		}),
		async execute(_toolCallId, params) {
			const fileKey = parseFileKey(params.fileKeyOrUrl);
			const limit = Math.max(1, Math.min(params.limit ?? 50, 200));
			const typeSet = params.types?.length ? new Set(params.types.map((t: string) => t.toUpperCase())) : undefined;
			const query = params.query?.toLowerCase();
			const file = await figmaGet<{ name: string; document: FigmaNode }>(`/files/${encodeURIComponent(fileKey)}`);
			let nodes = collectNodes(file.document).filter((node) => node.id !== file.document.id);
			if (typeSet) nodes = nodes.filter((node) => typeSet.has(node.type));
			if (query) nodes = nodes.filter((node) => node.path.toLowerCase().includes(query));
			nodes = nodes.slice(0, limit);

			return {
				content: [
					{
						type: "text",
						text: [
							`File: ${file.name}`,
							`Key: ${fileKey}`,
							`Matches: ${nodes.length}`,
							...nodes.map((node) => `${node.id}\t${node.type}\t${node.path}`),
						].join("\n"),
					},
				],
				details: { fileKey, fileName: file.name, nodes },
			};
		},
	});

	pi.registerTool({
		name: "figma_export_assets",
		label: "Figma Export Assets",
		description: "Export Figma nodes as PNG, JPG, SVG, or PDF files into a local directory.",
		promptSnippet: "Export Figma node assets to local files",
		promptGuidelines: [
			"Use figma_export_assets when the user asks to download or export assets from Figma.",
			"For broad exports, prefer explicit nodeIds or matchName to avoid downloading unrelated Figma frames.",
		],
		parameters: Type.Object({
			fileKeyOrUrl: Type.String({ description: "Figma file key or full Figma file/design URL" }),
			nodeIds: Type.Optional(Type.Array(Type.String(), { description: "Node IDs or node URLs to export" })),
			matchName: Type.Optional(Type.String({ description: "Case-insensitive node path/name substring to export when nodeIds omitted" })),
			types: Type.Optional(Type.Array(Type.String(), { description: "Node types to consider when matching. Default FRAME, COMPONENT, INSTANCE" })),
			format: Type.Optional(Type.String({ description: "png, jpg, svg, or pdf. Default png." })),
			scale: Type.Optional(Type.Number({ description: "Image scale for PNG/JPG. Default 2." })),
			outputDir: Type.Optional(Type.String({ description: "Directory to write assets. Default ./figma-assets" })),
			prefix: Type.Optional(Type.String({ description: "Optional filename prefix" })),
			maxAssets: Type.Optional(Type.Number({ description: "Safety cap. Default 50." })),
		}),
		async execute(_toolCallId, params) {
			const fileKey = parseFileKey(params.fileKeyOrUrl);
			const format = (params.format ?? "png").toLowerCase();
			if (!["png", "jpg", "svg", "pdf"].includes(format)) throw new Error("format must be png, jpg, svg, or pdf");
			const scale = params.scale ?? 2;
			const outputDir = resolve(params.outputDir ?? "figma-assets");
			const maxAssets = Math.max(1, Math.min(params.maxAssets ?? 50, 200));
			const allowedTypes = new Set((params.types?.length ? params.types : ["FRAME", "COMPONENT", "INSTANCE"]).map((t: string) => t.toUpperCase()));

			let targets: NodeMatch[];
			const file = await figmaGet<{ name: string; document: FigmaNode }>(`/files/${encodeURIComponent(fileKey)}`);
			if (params.nodeIds?.length) {
				const ids = new Set(params.nodeIds.map(normalizeNodeId));
				targets = collectNodes(file.document).filter((node) => ids.has(node.id));
			} else if (params.matchName) {
				const query = params.matchName.toLowerCase();
				targets = collectNodes(file.document).filter((node) => allowedTypes.has(node.type) && node.path.toLowerCase().includes(query));
			} else {
				targets = pickTopLevelFrames(file.document, allowedTypes);
			}

			targets = targets.slice(0, maxAssets);
			if (targets.length === 0) throw new Error("No matching Figma nodes found.");

			const ids = targets.map((target) => target.id);
			const query = new URLSearchParams({ ids: ids.join(","), format });
			if (format === "png" || format === "jpg") query.set("scale", String(scale));
			const imageResult = await figmaGet<{ images: Record<string, string | null>; err?: string }>(`/images/${encodeURIComponent(fileKey)}?${query}`);
			if (imageResult.err) throw new Error(imageResult.err);

			await mkdir(outputDir, { recursive: true });
			const written: string[] = [];
			for (const target of targets) {
				const url = imageResult.images[target.id];
				if (!url) continue;
				const data = await download(url);
				const safePrefix = params.prefix ? `${sanitizeName(params.prefix)}-` : "";
				const fileName = `${safePrefix}${sanitizeName(target.name)}-${target.id.replace(/:/g, "_")}.${format}`;
				const path = join(outputDir, basename(fileName, extname(fileName)) + extname(fileName));
				await writeFile(path, data);
				written.push(path);
			}

			return {
				content: [{ type: "text", text: `Exported ${written.length}/${targets.length} assets to ${outputDir}\n${written.join("\n")}` }],
				details: { fileKey, fileName: file.name, outputDir, format, scale, targets, written },
			};
		},
	});
}
