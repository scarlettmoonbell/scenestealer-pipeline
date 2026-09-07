import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PLATFORM_SPECS } from "./platform-specs.js";
const execFileAsync = promisify(execFile);
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
export class FfmpegRenderer {
  async render(request) {
    if (request.smartReframe) {
      throw new Error(
        "smartReframe (face-tracked reframe) is not implemented yet — deferred to a beta-phase feature, see ROADMAP.md",
      );
    }
    const spec = PLATFORM_SPECS[request.target];
    // minDurationSec/maxDurationSec on PLATFORM_SPECS describe what a
    // *platform* will accept when posting, not a constraint on
    // encoding itself — ffmpeg can produce a clip of any length just
    // fine. Confirmed for real (2026-09-07): gating render on this
    // meant a legitimate longer highlight (332s) couldn't be rendered
    // at all, not even to look at or post somewhere without the limit
    // (e.g. as a YouTube video, or a direct download) — moved this
    // check to apps/api's POST /clips/:id/publish instead, right
    // before a clip is actually posted to a specific platform, which
    // is the point where the constraint is real. This function still
    // produces the platform's *format* (aspect ratio, codec, GOP
    // structure) regardless of duration.
    const args = [
      "-y",
      "-ss",
      String(request.startSec),
      "-to",
      String(request.endSec),
      "-i",
      request.sourcePath,
    ];
    // aspectRatio: null (youtube-full) means "preserve the source" — no
    // crop filter at all. 9:16 targets get a plain center-crop for now;
    // ffmpeg's crop filter centers by default when x/y aren't given.
    if (spec.aspectRatio === "9:16") {
      args.push("-vf", "crop=ih*9/16:ih");
    }
    args.push("-c:v", "libx264", "-pix_fmt", "yuv420p");
    if ("closedGop" in spec && spec.closedGop) {
      args.push("-flags", "+cgop");
    }
    args.push("-c:a", "aac", request.outputPath);
    await execFileAsync("ffmpeg", args);
  }
}
