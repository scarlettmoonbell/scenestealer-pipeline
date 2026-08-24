import type { SceneBoundary } from "../scenes/types.js";
import type { Transcript } from "../transcribe/types.js";
import type {
  AudioEnergyEvent,
  HighlightCandidate,
  HighlightScorer,
} from "./types.js";
/**
 * Feeds the transcript + audio-energy events (applause/laughter spikes) to
 * Claude Haiku to produce ranked highlight candidates. Cheap by design — a
 * few cents per show — see README.md's cost basis. Uses plain `fetch`
 * rather than the Anthropic SDK, matching GroqTranscriber and
 * PostizPublishProvider's existing pattern in this codebase (no AI-provider
 * SDK dependency added). Structured outputs (`output_config.format`)
 * guarantee a parseable response instead of prompting for JSON and hoping.
 */
export declare class ClaudeHighlightScorer implements HighlightScorer {
  private readonly apiKey;
  constructor(apiKey: string);
  scoreHighlights(
    transcript: Transcript,
    audioEvents: AudioEnergyEvent[],
    scenes: SceneBoundary[],
  ): Promise<HighlightCandidate[]>;
}
