import type { SceneBoundary, SceneDetector } from "./types.js";

/**
 * Shells out to the `scenedetect` CLI (from PySceneDetect, BSD-3-Clause)
 * via subprocess exec — never imported as a library, since it's a Python
 * package and this is a TypeScript one. Requires `scenedetect` on PATH in
 * whatever container runs this (the Fly.io worker image, per
 * scenestealer-app's Dockerfile).
 *
 * Not implemented yet — this is the Phase 1 scaffold.
 */
export class PySceneDetectDetector implements SceneDetector {
  async detectScenes(_videoPath: string): Promise<SceneBoundary[]> {
    throw new Error("not implemented — see README.md Status section");
  }

  snapToScenes(
    candidate: { startSec: number; endSec: number },
    scenes: SceneBoundary[],
  ): { startSec: number; endSec: number } {
    if (scenes.length === 0) return candidate;
    const nearest = (t: number) =>
      scenes
        .flatMap((s) => [s.startSec, s.endSec])
        .reduce((best, cur) =>
          Math.abs(cur - t) < Math.abs(best - t) ? cur : best,
        );
    return {
      startSec: nearest(candidate.startSec),
      endSec: nearest(candidate.endSec),
    };
  }
}
