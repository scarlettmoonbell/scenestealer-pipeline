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
}

/**
 * Shells out to ffmpeg as a subprocess — never linked into this package's
 * own binary. See the parent project's PLAN.md for why that boundary
 * matters regardless of whether the ffmpeg build includes libx264 (GPL).
 */
export interface Renderer {
  render(request: RenderRequest): Promise<void>;
}
