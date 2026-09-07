import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const execFileMock = vi.fn();
vi.mock("node:child_process", () => ({
  execFile: (
    ...args: [string, string[], (err: unknown, result: unknown) => void]
  ) => {
    const callback = args[args.length - 1] as (
      err: unknown,
      result: unknown,
    ) => void;
    return execFileMock(args[0], args[1], callback);
  },
}));

const readFileMock = vi.fn();
const unlinkMock = vi.fn();
vi.mock("node:fs/promises", () => ({
  readFile: (...args: unknown[]) => readFileMock(...args),
  unlink: (...args: unknown[]) => unlinkMock(...args),
}));

import { PySceneDetectDetector } from "./pyscenedetect.js";

describe("PySceneDetectDetector", () => {
  let detector: PySceneDetectDetector;

  beforeEach(() => {
    detector = new PySceneDetectDetector();
    execFileMock.mockReset();
    readFileMock.mockReset();
    unlinkMock.mockReset();
    execFileMock.mockImplementation((_cmd, _args, callback) => {
      callback(null, { stdout: "", stderr: "" });
    });
    unlinkMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("detectScenes", () => {
    it("invokes scenedetect with the video path and expected flags, then reads the CSV it writes", async () => {
      readFileMock.mockResolvedValue(
        "Scene Number,Start Frame,Start Timecode,Start Time (seconds),End Frame,End Timecode,End Time (seconds)\n" +
          "1,0,00:00:00.000,0.000,120,00:00:04.800,4.800\n",
      );

      await detector.detectScenes("/tmp/show.mp4");

      expect(execFileMock).toHaveBeenCalledTimes(1);
      const [cmd, args] = execFileMock.mock.calls[0]!;
      expect(cmd).toBe("scenedetect");
      expect(args).toEqual([
        "-i",
        "/tmp/show.mp4",
        "detect-content",
        "list-scenes",
        "-o",
        "/tmp",
        "-s",
      ]);
      expect(readFileMock).toHaveBeenCalledWith("/tmp/show-Scenes.csv", "utf8");
      expect(unlinkMock).toHaveBeenCalledWith("/tmp/show-Scenes.csv");
    });

    it("parses CSV rows into SceneBoundary[] by matching header columns", async () => {
      readFileMock.mockResolvedValue(
        "Scene Number,Start Frame,Start Timecode,Start Time (seconds),End Frame,End Timecode,End Time (seconds)\n" +
          "1,0,00:00:00.000,0.000,120,00:00:04.800,4.800\n" +
          "2,120,00:00:04.800,4.800,300,00:00:12.000,12.000\n",
      );

      const scenes = await detector.detectScenes("/tmp/show.mp4");

      expect(scenes).toEqual([
        { startSec: 0, endSec: 4.8 },
        { startSec: 4.8, endSec: 12 },
      ]);
    });

    it("returns an empty array when there are no data rows", async () => {
      readFileMock.mockResolvedValue(
        "Scene Number,Start Time (seconds),End Time (seconds)\n",
      );

      expect(await detector.detectScenes("/tmp/show.mp4")).toEqual([]);
    });

    it("throws if the CSV header has no recognizable start/end time columns", async () => {
      readFileMock.mockResolvedValue("foo,bar\n1,2\n");

      await expect(detector.detectScenes("/tmp/show.mp4")).rejects.toThrow(
        /Could not find start\/end time columns/,
      );
    });

    it("still cleans up the CSV file when parsing throws", async () => {
      readFileMock.mockResolvedValue("foo,bar\n1,2\n");

      await expect(detector.detectScenes("/tmp/show.mp4")).rejects.toThrow();

      expect(unlinkMock).toHaveBeenCalledWith("/tmp/show-Scenes.csv");
    });
  });

  describe("snapToScenes", () => {
    it("snaps a candidate window to the nearest scene boundary timestamps", () => {
      const scenes = [
        { startSec: 0, endSec: 10 },
        { startSec: 10, endSec: 30 },
      ];

      const snapped = detector.snapToScenes(
        { startSec: 8, endSec: 28 },
        scenes,
      );

      expect(snapped).toEqual({ startSec: 10, endSec: 30 });
    });

    it("returns the candidate unchanged when there are no scenes", () => {
      const candidate = { startSec: 5, endSec: 15 };
      expect(detector.snapToScenes(candidate, [])).toEqual(candidate);
    });

    it("never collapses to a zero-length clip when start and end are both nearest the same boundary", () => {
      // Sparse boundaries, confirmed for real against a video whose
      // content-based scene detection found only a handful of cuts
      // across ~17 minutes (see scenestealer-app's ROADMAP.md,
      // 2026-09-07) — a candidate whose own start/end are both close
      // to 130 used to collapse to {130, 130}.
      const scenes = [
        { startSec: 0, endSec: 130 },
        { startSec: 130, endSec: 1016 },
        { startSec: 1016, endSec: 1031 },
      ];

      const snapped = detector.snapToScenes(
        { startSec: 128, endSec: 132 },
        scenes,
      );

      expect(snapped.startSec).toBe(130);
      expect(snapped.endSec).toBeGreaterThan(snapped.startSec);
      expect(snapped.endSec).toBe(1016);
    });

    it("falls back to the candidate's own duration, anchored at the snapped start, when no later boundary exists", () => {
      const scenes = [
        { startSec: 0, endSec: 10 },
        { startSec: 10, endSec: 30 },
      ];

      // Both start and end are nearest the very last boundary (30) —
      // there is nothing later to snap the end to.
      const snapped = detector.snapToScenes(
        { startSec: 29, endSec: 34 },
        scenes,
      );

      expect(snapped.startSec).toBe(30);
      expect(snapped.endSec).toBe(35);
    });
  });
});
