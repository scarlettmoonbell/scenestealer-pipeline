import type { AudioEnergyEvent } from "./types.js";
/**
 * Plain DSP over the audio track's loudness envelope — no vendor, no ML
 * model. Decodes to raw 16kHz mono PCM via ffmpeg (subprocess, not linked),
 * computes RMS energy per 0.5s window, and flags sustained spikes above a
 * rolling median baseline as candidate applause/laughter/audience-reaction
 * moments — the differentiator this pipeline is built around for
 * live-recording highlight detection.
 */
export declare function detectAudioEnergyEvents(audioPath: string): Promise<AudioEnergyEvent[]>;
