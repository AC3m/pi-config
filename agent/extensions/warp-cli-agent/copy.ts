const MAX_TITLE_LENGTH = 96;
const COMPLETION_BODY = "Pi finished. Open the tab to review.";

export function normalizeNotificationText(value: string): string {
	return value
		.replace(/[\x00-\x1f\x7f]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function truncate(value: string, maxLength: number): string {
	return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function shortPrompt(prompt: string): string {
	return truncate(normalizeNotificationText(prompt), MAX_TITLE_LENGTH) || "Pi task";
}

export function notificationTitle(sessionName: string | undefined, prompt: string): string {
	return normalizeNotificationText(sessionName ?? "") || shortPrompt(prompt);
}

export function completionBody(): string {
	return COMPLETION_BODY;
}
