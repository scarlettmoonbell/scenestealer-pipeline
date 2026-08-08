import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { SceneBoundary, SceneDetector } from "./types.js";

const execFileAsync = promisify(execFile);

/**
 * Parses `scenedetect ... list-scenes -n -s` stdout into SceneBoundary[].
 * Column names, not positions, are matched — PySceneDetect's docs don't
 * pin an exact header spec, so this is deliberately resilient to minor
 * wording differences across versions rather than hardcoding indices.
 */
function parseSceneListCsv(csv: string): SceneBoundary[] {
  const lines = csv
    .trim()
    .split("\n")
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const header = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
  // Match on "seconds", not just "time" — "Start Timecode" also contains
  // "time" as a substring and would otherwise be picked over the real
  // "Start Time (seconds)" numeric column (hit this for real: matched
  // "Start Timecode" first, then Number("00:00:00.000") produced NaN).
  const startIdx = header.findIndex(
    (h) => h.includes("start") && h.includes("seconds"),
  );
  const endIdx = header.findIndex(
    (h) => h.includes("end") && h.includes("seconds"),
  );
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(
      `Could not find start/end time columns in scenedetect CSV header: ${lines[0]}`,
    );
  }

  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    return {
      startSec: Number(cols[startIdx]),
      endSec: Number(cols[endIdx]),
    };
  });
}

/**
 * Shells out to the `scenedetect` CLI (from PySceneDetect, BSD-3-Clause)
 * via subprocess exec — never imported as a library, since it's a Python
 * package and this is a TypeScript one. Requires `scenedetect` on PATH in
 * whatever container runs this (the Fly.io worker image, per
 * scenestealer-app's Dockerfile).
 */
export class PySceneDetectDetector implements SceneDetector {
  async detectScenes(videoPath: string): Promise<SceneBoundary[]> {
    // -n: print the scene list to stdout instead of writing a CSV file.
    // -s: RFC 4180 compliance — omit the leading "cutting list" row so the
    // first line is the real column header.
    const { stdout } = await execFileAsync("scenedetect", [
      "-i",
      videoPath,
      "detect-content",
      "list-scenes",
      "-n",
      "-s",
    ]);
    return parseSceneListCsv(stdout);
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
