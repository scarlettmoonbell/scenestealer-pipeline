import type { RenderRequest, Renderer } from "./types.js";
/**
 * The face-tracked vertical reframe step is adapted from
 * SamurAIGPT/AI-Youtube-Shorts-Generator's auto-cropping approach (MIT) —
 * see README.md. Requires `ffmpeg` on PATH, built with an H.264 encoder
 * (openh264 preferred over libx264 to sidestep the GPL question entirely —
 * see the parent project's PLAN.md license-compatibility section).
 *
 * smartReframe is deferred to a beta-phase feature — real face detection
 * (sampling frames, tracking a subject, smoothing a crop path) is a
 * meaningfully bigger undertaking than the mechanical encode/crop this
 * implements. Requesting it throws explicitly rather than silently
 * downgrading to a center-crop, so the gap stays visible instead of
 * quietly producing a worse result than asked for.
 */
export declare class FfmpegRenderer implements Renderer {
  render(request: RenderRequest): Promise<void>;
}
