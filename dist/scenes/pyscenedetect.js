import { execFile } from "node:child_process";
import { readFile, unlink } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
/**
 * Parses a scenedetect `list-scenes` CSV file's contents into
 * SceneBoundary[]. Column names, not positions, are matched —
 * PySceneDetect's docs don't pin an exact header spec, so this is
 * deliberately resilient to minor wording differences across versions
 * rather than hardcoding indices.
 */
function parseSceneListCsv(csv) {
  const lines = csv
    .trim()
    .split("\n")
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
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
export class PySceneDetectDetector {
  async detectScenes(videoPath) {
    // list-scenes always *writes* its CSV to a file — confirmed for
    // real against PySceneDetect 0.7.1: -n/--no-output-file suppresses
    // that file, but doesn't redirect the CSV to stdout as its help
    // text implies; it prints a human-readable table instead, not
    // machine-parseable output. So this deliberately omits -n, points
    // -o at the video's own directory, and reads the resulting file —
    // $VIDEO_NAME-Scenes.csv is PySceneDetect's own default naming.
    // -s: RFC 4180 compliance — omit the leading "cutting list" row so
    // the first line is the real column header.
    const outDir = dirname(videoPath);
    const csvPath = join(
      outDir,
      `${basename(videoPath, extname(videoPath))}-Scenes.csv`,
    );
    await execFileAsync("scenedetect", [
      "-i",
      videoPath,
      "detect-content",
      "list-scenes",
      "-o",
      outDir,
      "-s",
    ]);
    try {
      const csv = await readFile(csvPath, "utf8");
      return parseSceneListCsv(csv);
    } finally {
      await unlink(csvPath).catch(() => {});
    }
  }
  snapToScenes(candidate, scenes) {
    if (scenes.length === 0) return candidate;
    const boundaries = scenes.flatMap((s) => [s.startSec, s.endSec]);
    const nearest = (t, pool) =>
      pool.reduce((best, cur) =>
        Math.abs(cur - t) < Math.abs(best - t) ? cur : best,
      );
    const snappedStart = nearest(candidate.startSec, boundaries);
    // Restricted to boundaries strictly *after* the snapped start, so
    // start/end can never collide or invert — snapping both
    // independently to whichever boundary is nearest *each* (the
    // previous logic) could produce a zero-length or even negative-
    // length "clip" whenever both landed nearest the same boundary.
    // Confirmed for real: a video whose content-based scene detection
    // found only a handful of boundaries across ~17 minutes produced
    // exactly this — 5 of 9 AI-suggested highlights collapsed to
    // zero-length clips (see scenestealer-app's ROADMAP.md, 2026-09-07).
    // Falls back to the candidate's own original duration, anchored at
    // the snapped start, when no later boundary exists to snap the end
    // to — still a real, positive-duration clip rather than a
    // degenerate one.
    const laterBoundaries = boundaries.filter((b) => b > snappedStart);
    const snappedEnd =
      laterBoundaries.length > 0
        ? nearest(candidate.endSec, laterBoundaries)
        : snappedStart + (candidate.endSec - candidate.startSec);
    return { startSec: snappedStart, endSec: snappedEnd };
  }
}
