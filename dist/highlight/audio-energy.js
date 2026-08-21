import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
const SAMPLE_RATE = 16_000;
const WINDOW_SEC = 0.5;
const WINDOW_SAMPLES = SAMPLE_RATE * WINDOW_SEC;
/** Sustained energy must exceed the rolling baseline by this multiple to count as an event. */
const SPIKE_MULTIPLIER = 2;
/** A full-length show's raw 16kHz mono PCM stays well under this even at ~3 hours. */
const MAX_BUFFER_BYTES = 1024 * 1024 * 1024;
/** Root-mean-square amplitude of a window of 16-bit signed PCM samples, normalized to [0, 1]. */
function rms(samples) {
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
        const normalized = samples[i] / 32_768;
        sumSquares += normalized * normalized;
    }
    return Math.sqrt(sumSquares / samples.length);
}
/**
 * Plain DSP over the audio track's loudness envelope — no vendor, no ML
 * model. Decodes to raw 16kHz mono PCM via ffmpeg (subprocess, not linked),
 * computes RMS energy per 0.5s window, and flags sustained spikes above a
 * rolling median baseline as candidate applause/laughter/audience-reaction
 * moments — the differentiator this pipeline is built around for
 * live-recording highlight detection.
 */
export async function detectAudioEnergyEvents(audioPath) {
    const { stdout } = await execFileAsync("ffmpeg", [
        "-i",
        audioPath,
        "-f",
        "s16le",
        "-acodec",
        "pcm_s16le",
        "-ac",
        "1",
        "-ar",
        String(SAMPLE_RATE),
        "-",
    ], { encoding: "buffer", maxBuffer: MAX_BUFFER_BYTES });
    const samples = new Int16Array(stdout.buffer, stdout.byteOffset, Math.floor(stdout.length / 2));
    const windowCount = Math.floor(samples.length / WINDOW_SAMPLES);
    if (windowCount === 0)
        return [];
    const windowRms = [];
    for (let w = 0; w < windowCount; w++) {
        const start = w * WINDOW_SAMPLES;
        windowRms.push(rms(samples.subarray(start, start + WINDOW_SAMPLES)));
    }
    // Median, not mean, so a few genuinely loud windows don't drag the
    // baseline up and mask themselves.
    const sorted = [...windowRms].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const baseline = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    const threshold = baseline * SPIKE_MULTIPLIER;
    const events = [];
    let eventStart = null;
    let eventPeak = 0;
    for (let w = 0; w < windowCount; w++) {
        const level = windowRms[w];
        if (level >= threshold) {
            if (eventStart === null) {
                eventStart = w * WINDOW_SEC;
                eventPeak = level;
            }
            else {
                eventPeak = Math.max(eventPeak, level);
            }
        }
        else if (eventStart !== null) {
            events.push({
                startSec: eventStart,
                endSec: w * WINDOW_SEC,
                intensity: baseline > 0 ? eventPeak / baseline : eventPeak,
            });
            eventStart = null;
        }
    }
    if (eventStart !== null) {
        events.push({
            startSec: eventStart,
            endSec: windowCount * WINDOW_SEC,
            intensity: baseline > 0 ? eventPeak / baseline : eventPeak,
        });
    }
    return events;
}
