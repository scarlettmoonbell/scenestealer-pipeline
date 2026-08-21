/**
 * Confirmed via research against current platform docs — see the parent
 * project's PLAN.md "Platform constraints" section for sourcing.
 */
export const PLATFORM_SPECS = {
    "instagram-reels": {
        aspectRatio: "9:16",
        minDurationSec: 5,
        maxDurationSec: 90,
        codec: "h264",
        chromaSubsampling: "4:2:0",
        minFps: 23,
        maxFps: 60,
        closedGop: true,
    },
    "youtube-full": {
        aspectRatio: null, // source aspect ratio preserved
        codec: "h264",
    },
};
