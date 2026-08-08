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

import { PySceneDetectDetector } from "./pyscenedetect.js";

describe("PySceneDetectDetector", () => {
  let detector: PySceneDetectDetector;

  beforeEach(() => {
    detector = new PySceneDetectDetector();
    execFileMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function mockCsvOutput(stdout: string) {
    execFileMock.mockImplementation((_cmd, _args, callback) => {
      callback(null, { stdout, stderr: "" });
    });
  }

  describe("detectScenes", () => {
    it("invokes scenedetect with the video path and expected flags", async () => {
      mockCsvOutput(
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
        "-n",
        "-s",
      ]);
    });

    it("parses CSV rows into SceneBoundary[] by matching header columns", async () => {
      mockCsvOutput(
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
      mockCsvOutput("Scene Number,Start Time (seconds),End Time (seconds)\n");

      expect(await detector.detectScenes("/tmp/show.mp4")).toEqual([]);
    });

    it("throws if the CSV header has no recognizable start/end time columns", async () => {
      mockCsvOutput("foo,bar\n1,2\n");

      await expect(detector.detectScenes("/tmp/show.mp4")).rejects.toThrow(
        /Could not find start\/end time columns/,
      );
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
  });
});
