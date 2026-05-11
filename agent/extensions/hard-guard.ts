import { isToolCallEventType, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { approvalMessage, blockReason, hasMatches, inspectCommand, type GuardInspection } from "./hard-guard/policy.js";
import { emitWarpCliAgentEvent, isWarpCliAgentProtocolAvailable } from "./warp-cli-agent/status.js";

type ApprovalContext = {
	cwd?: string;
	hasUI: boolean;
	ui: {
		confirm(title: string, message: string): boolean | Promise<boolean>;
	};
};

const APPROVAL_TITLE = "Hard guard approval required";

async function requestApproval(ctx: ApprovalContext, inspection: GuardInspection): Promise<boolean> {
	if (!ctx.hasUI) return false;

	const message = approvalMessage(inspection);
	if (isWarpCliAgentProtocolAvailable()) {
		emitWarpCliAgentEvent(ctx.cwd ?? process.cwd(), "permission_request", {
			summary: message,
			tool_name: "approval",
		});
	}

	try {
		return Boolean(await ctx.ui.confirm(APPROVAL_TITLE, message));
	} finally {
		if (isWarpCliAgentProtocolAvailable()) {
			emitWarpCliAgentEvent(ctx.cwd ?? process.cwd(), "permission_replied");
		}
	}
}

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		if (!isToolCallEventType("bash", event)) return undefined;

		const inspection = inspectCommand(event.input.command);
		if (!hasMatches(inspection)) return undefined;

		if (await requestApproval(ctx, inspection)) return undefined;
		return { block: true, reason: blockReason(inspection) };
	});

	pi.on("user_bash", async (event, ctx) => {
		const inspection = inspectCommand(event.command);
		if (!hasMatches(inspection)) return undefined;

		if (await requestApproval(ctx, inspection)) return undefined;

		return {
			result: {
				output: blockReason(inspection),
				exitCode: 1,
				cancelled: false,
				truncated: false,
			},
		};
	});
}
