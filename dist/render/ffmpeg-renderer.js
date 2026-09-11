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
    // crop/pad filter at all. A 9:16 target either center-crops (fills
    // the frame, cutting off the sides — ffmpeg's crop filter centers
    // by default when x/y aren't given) or pads (keeps the whole source
    // frame, letterboxed with black bars) — requested for real
    // (2026-09-11) after a widescreen stage shot's crop cut off most of
    // the actual picture. Pad's height is computed from the source's
    // own width (iw*16/9), not a fixed pixel size, matching crop's own
    // convention of deriving output size from the input rather than a
    // hardcoded resolution; `max(ih, ...)` guards a source already
    // taller than 16:9 (padding to something shorter than the input is
    // invalid), and `trunc(.../2)*2` keeps the result even, which
    // yuv420p encoding requires.
    if (spec.aspectRatio === "9:16") {
      if (request.fitMode === "pad") {
        args.push(
          "-vf",
          "pad=w=iw:h=trunc(max(ih\\,iw*16/9)/2)*2:x=0:y=(oh-ih)/2:color=black",
        );
      } else {
        args.push("-vf", "crop=ih*9/16:ih");
      }
    }
    args.push("-c:v", "libx264", "-pix_fmt", "yuv420p");
    if ("closedGop" in spec && spec.closedGop) {
      args.push("-flags", "+cgop");
    }
    // Without this, ffmpeg's mp4 muxer writes moov (the atom holding
    // duration/dimensions/sample tables) after mdat (the actual frame
    // data) — confirmed for real (2026-09-11) on a real rendered file:
    // pulled it back from R2 and found mdat at byte 40, moov only at
    // the very end. Many platforms' ingestion (Instagram's included)
    // reads a file's leading bytes to validate it before committing to
    // the full download — moov-last is a well-known cause of an opaque
    // "processing failed" response from exactly that class of consumer.
    // `+faststart` makes ffmpeg do a second pass moving moov to the
    // front; verified locally that it does (byte 32 instead of the
    // file's end). Kept on its own merits (2026-09-12) — standard
    // practice for any mp4 served over HTTP/API, not tied to the
    // specific Instagram failure that first surfaced the moov-last
    // issue, which (see this file's git history) turned out to have a
    // different real cause (apps/api's signed media URL's own query
    // string getting mangled, not the render itself).
    args.push("-c:a", "aac", "-movflags", "+faststart", request.outputPath);
    await execFileAsync("ffmpeg", args);
  }
}
