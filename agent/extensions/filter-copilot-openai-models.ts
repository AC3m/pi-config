import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getModels } from "@mariozechner/pi-ai";
import { githubCopilotOAuthProvider } from "@mariozechner/pi-ai/oauth";

const PROVIDER = "github-copilot";

function isOpenAIModel(modelId: string, modelName: string): boolean {
	return modelId.startsWith("gpt-") || modelName.startsWith("GPT-");
}

export default function (pi: ExtensionAPI) {
	const copilotModels = getModels(PROVIDER)
		.filter((model) => !isOpenAIModel(model.id, model.name))
		.map(({ id, name, api, baseUrl, reasoning, thinkingLevelMap, input, cost, contextWindow, maxTokens, headers, compat }) => ({
			id,
			name,
			api,
			baseUrl,
			reasoning,
			thinkingLevelMap,
			input,
			cost,
			contextWindow,
			maxTokens,
			headers,
			compat,
		}));

	pi.registerProvider(PROVIDER, {
		name: "GitHub Copilot",
		baseUrl: "https://api.individual.githubcopilot.com",
		oauth: githubCopilotOAuthProvider,
		models: copilotModels,
	});
}
