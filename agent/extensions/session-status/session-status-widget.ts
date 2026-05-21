import { truncateToWidth, type EditorTheme } from "@earendil-works/pi-tui";
import type { SessionStatusState } from "./types.js";

export class SessionStatusWidget {
	constructor(
		private readonly theme: EditorTheme,
		private readonly state: SessionStatusState,
	) {}

	render(width: number): string[] {
		return [truncateToWidth(this.renderStatus(), width, "")];
	}

	invalidate(): void {}

	private renderStatus(): string {
		const parts = [this.renderPair("caveman", this.cavemanText())];

		if (this.state.sbAiVersion) parts.push(this.renderPair("sb-ai", this.state.sbAiVersion));
		parts.push(this.renderPair("loaded skills", this.loadedSkillsText()));

		return parts.join(this.theme.fg("dim", " • "));
	}

	private renderPair(label: string, value: string): string {
		return this.theme.fg("muted", `${label}:`) + this.theme.fg("accent", this.theme.bold(value));
	}

	private cavemanText(): string {
		if (!this.state.cavemanEnabled || !this.state.cavemanLevel) return "off";
		return this.state.cavemanLevel;
	}

	private loadedSkillsText(): string {
		return this.state.loadedSkillNames.length > 0 ? this.state.loadedSkillNames.join(", ") : "none";
	}
}
