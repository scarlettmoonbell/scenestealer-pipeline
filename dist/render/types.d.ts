import type { PlatformSpecKey } from "./platform-specs.js";
export interface RenderRequest {
  sourcePath: string;
  startSec: number;
  endSec: number;
  target: PlatformSpecKey;
  outputPath: string;
  /** Face-tracked vertical reframe instead of a naive center-crop, for wide stage shots. */
  smartReframe: boolean;
  captionBurnIn?: string;
  /**
   * How a 9:16 target reconciles a source that isn't already that
   * shape. "crop" (default, and the only behavior before this field
   * existed) fills the frame by cutting off the sides/top-bottom.
   * "pad" keeps the entire source frame visible, letterboxed with
   * black bars — requested for real (2026-09-11) after cropping a
   * widescreen stage shot cut off most of the actual picture. No
   * effect on a target with no fixed aspect ratio (youtube-full).
   */
  fitMode?: "crop" | "pad";
}
/**
 * Shells out to ffmpeg as a subprocess — never linked into this package's
 * own binary. See the parent project's PLAN.md for why that boundary
 * matters regardless of whether the ffmpeg build includes libx264 (GPL).
 */
export interface Renderer {
  render(request: RenderRequest): Promise<void>;
}
