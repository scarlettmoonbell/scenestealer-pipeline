import type { SceneBoundary } from "../scenes/types.js";
import type { Transcript } from "../transcribe/types.js";
export interface AudioEnergyEvent {
    startSec: number;
    endSec: number;
    /** Relative loudness spike vs. a rolling baseline — the applause/laughter signal. */
    intensity: number;
}
export interface HighlightCandidate {
    startSec: number;
    endSec: number;
    score: number;
    reason: string;
}
/**
 * Scores candidate highlight windows from a transcript + audio-energy
 * signal, snapped to real scene boundaries. Adapted from the approach in
 * SamurAIGPT/AI-Youtube-Shorts-Generator (MIT) — see README.md for why this
 * is "adapt," not "design from scratch."
 */
export interface HighlightScorer {
    scoreHighlights(transcript: Transcript, audioEvents: AudioEnergyEvent[], scenes: SceneBoundary[]): Promise<HighlightCandidate[]>;
}
