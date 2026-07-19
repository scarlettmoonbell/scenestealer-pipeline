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
 * few cents per show — see README.md's cost basis.
 *
 * Not implemented yet — this is the Phase 1 scaffold.
 */
export class ClaudeHighlightScorer implements HighlightScorer {
  constructor(private readonly apiKey: string) {}

  async scoreHighlights(
    _transcript: Transcript,
    _audioEvents: AudioEnergyEvent[],
    _scenes: SceneBoundary[],
  ): Promise<HighlightCandidate[]> {
    throw new Error("not implemented — see README.md Status section");
  }
}
