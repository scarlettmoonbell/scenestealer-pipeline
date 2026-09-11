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
      // Without explicit mapping, ffmpeg's default stream selection can
      // carry an iPhone recording's QuickTime timecode track (`tmcd`,
      // linked to its video stream) straight into the output alongside
      // the real video/audio — confirmed for real (2026-09-08): a
      // rendered clip from real theater-show iPhone footage had exactly
      // this as a third `data`-type stream, and Instagram's Content
      // Publishing API rejected the upload outright (error 2207076) on
      // that exact file. `0:a:0?` (trailing `?`) keeps today's graceful
      // behavior for a source with no audio at all — mandatory would
      // hard-fail the render instead of just omitting audio.
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      // `-map` alone does NOT stop this: confirmed for real (2026-09-11)
      // that the SAME 2207076 failure recurred on a render made *after*
      // the fix above shipped. Root-caused with a local repro (a
      // synthetic source built with `-timecode`, matching the real
      // file's exact stream shape): the mov demuxer puts the timecode
      // value on the *video stream's own metadata* (a `timecode` tag),
      // and ffmpeg's mov muxer regenerates a fresh tmcd track from that
      // tag on output — independent of whether the original standalone
      // timecode stream was ever mapped in. Verified locally that only
      // stripping metadata actually removes it; the explicit `-map` above
      // is kept regardless, since it's still correct for genuinely
      // multi-track sources (e.g. a second video/audio stream) that
      // `-map_metadata` alone wouldn't drop.
      "-map_metadata",
      "-1",
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
    // data) — confirmed for real (2026-09-11) on the exact file behind
    // yet another 2207076 failure, *after* both the stream-mapping and
    // metadata-stripping fixes above: pulled the real rendered object
    // back from R2 and found mdat at byte 40, moov only at the very
    // end. Instagram's Content Publishing API reads a file's leading
    // bytes to validate it before committing to the full download,
    // same as most platforms' ingestion — moov-last is a well-known
    // cause of exactly this class of opaque "processing failed" error.
    // `+faststart` makes ffmpeg do a second pass moving moov to the
    // front; verified locally that it does (byte 32 instead of the
    // file's end) against this same real file.
    args.push("-c:a", "aac", "-movflags", "+faststart", request.outputPath);
    await execFileAsync("ffmpeg", args);
  }
}
