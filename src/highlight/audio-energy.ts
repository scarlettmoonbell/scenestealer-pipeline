import type { AudioEnergyEvent } from "./types.js";

/**
 * Plain DSP over the audio track's loudness envelope — no vendor, no ML
 * model. Flags sustained spikes above a rolling baseline as candidate
 * applause/laughter/audience-reaction moments, the differentiator this
 * pipeline is built around for live-recording highlight detection.
 *
 * Not implemented yet — this is the Phase 1 scaffold.
 */
export async function detectAudioEnergyEvents(_audioPath: string): Promise<AudioEnergyEvent[]> {
  throw new Error("not implemented — see README.md Status section");
}
