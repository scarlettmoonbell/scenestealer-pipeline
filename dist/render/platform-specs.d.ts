/**
 * Confirmed via research against current platform docs — see the parent
 * project's PLAN.md "Platform constraints" section for sourcing.
 */
export declare const PLATFORM_SPECS: {
  readonly "instagram-reels": {
    readonly aspectRatio: "9:16";
    readonly minDurationSec: 5;
    readonly maxDurationSec: 90;
    readonly codec: "h264";
    readonly chromaSubsampling: "4:2:0";
    readonly minFps: 23;
    readonly maxFps: 60;
    readonly closedGop: true;
  };
  readonly "youtube-full": {
    readonly aspectRatio: null;
    readonly codec: "h264";
  };
};
export type PlatformSpecKey = keyof typeof PLATFORM_SPECS;
