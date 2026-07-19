export interface SceneBoundary {
  startSec: number;
  endSec: number;
}

/**
 * Wraps PySceneDetect (BSD-3-Clause), a Python CLI tool — invoked as a
 * subprocess (`scenedetect` on PATH), not a native TS dependency. This is
 * the same subprocess boundary ffmpeg is called across; see README.md's
 * "Open-source building blocks" section.
 */
export interface SceneDetector {
  detectScenes(videoPath: string): Promise<SceneBoundary[]>;
  /** Snaps a candidate [start, end] window to the nearest real cut points. */
  snapToScenes(candidate: { startSec: number; endSec: number }, scenes: SceneBoundary[]): {
    startSec: number;
    endSec: number;
  };
}
