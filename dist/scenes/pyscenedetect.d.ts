import type { SceneBoundary, SceneDetector } from "./types.js";
/**
 * Shells out to the `scenedetect` CLI (from PySceneDetect, BSD-3-Clause)
 * via subprocess exec — never imported as a library, since it's a Python
 * package and this is a TypeScript one. Requires `scenedetect` on PATH in
 * whatever container runs this (the Fly.io worker image, per
 * scenestealer-app's Dockerfile).
 */
export declare class PySceneDetectDetector implements SceneDetector {
    detectScenes(videoPath: string): Promise<SceneBoundary[]>;
    snapToScenes(candidate: {
        startSec: number;
        endSec: number;
    }, scenes: SceneBoundary[]): {
        startSec: number;
        endSec: number;
    };
}
