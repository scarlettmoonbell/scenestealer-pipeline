import type { RenderRequest, Renderer } from "./types.js";
/**
 * The face-tracked vertical reframe step is adapted from
 * SamurAIGPT/AI-Youtube-Shorts-Generator's auto-cropping approach (MIT) —
 * see README.md. Requires `ffmpeg` on PATH, built with an H.264 encoder
 * (openh264 preferred over libx264 to sidestep the GPL question entirely —
 * see the parent project's PLAN.md license-compatibility section).
 *
 * Not implemented yet — this is the Phase 1 scaffold.
 */
export declare class FfmpegRenderer implements Renderer {
    render(_request: RenderRequest): Promise<void>;
}
