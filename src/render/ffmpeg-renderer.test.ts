import { beforeEach, describe, expect, it, vi } from "vitest";

const execFileMock = vi.fn();
vi.mock("node:child_process", () => ({
  execFile: (...args: unknown[]) => {
    const callback = args[args.length - 1] as (
      err: unknown,
      result: unknown,
    ) => void;
    const cmd = args[0] as string;
    const cmdArgs = args[1] as string[];
    return execFileMock(cmd, cmdArgs, callback);
  },
}));

import { FfmpegRenderer } from "./ffmpeg-renderer.js";

describe("FfmpegRenderer", () => {
  const renderer = new FfmpegRenderer();

  beforeEach(() => {
    execFileMock.mockReset();
  });

  it("throws for smartReframe without touching ffmpeg — deferred to a beta feature", async () => {
    await expect(
      renderer.render({
        sourcePath: "/tmp/show.mp4",
        startSec: 10,
        endSec: 30,
        target: "youtube-full",
        outputPath: "/tmp/out.mp4",
        smartReframe: true,
      }),
    ).rejects.toThrow(/not implemented/);

    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("rejects a clip outside instagram-reels' duration range before touching ffmpeg", async () => {
    await expect(
      renderer.render({
        sourcePath: "/tmp/show.mp4",
        startSec: 0,
        endSec: 2,
        target: "instagram-reels",
        outputPath: "/tmp/out.mp4",
        smartReframe: false,
      }),
    ).rejects.toThrow(/5-90s/);

    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("trims without a crop filter for youtube-full (source aspect preserved)", async () => {
    execFileMock.mockImplementation((_cmd, _args, callback) => {
      callback(null, { stdout: "", stderr: "" });
    });

    await renderer.render({
      sourcePath: "/tmp/show.mp4",
      startSec: 10,
      endSec: 40,
      target: "youtube-full",
      outputPath: "/tmp/out.mp4",
      smartReframe: false,
    });

    expect(execFileMock).toHaveBeenCalledTimes(1);
    const [cmd, args] = execFileMock.mock.calls[0]!;
    expect(cmd).toBe("ffmpeg");
    expect(args).toEqual([
      "-y",
      "-ss",
      "10",
      "-to",
      "40",
      "-i",
      "/tmp/show.mp4",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "/tmp/out.mp4",
    ]);
  });

  it("crops to 9:16 with closed GOP for instagram-reels", async () => {
    execFileMock.mockImplementation((_cmd, _args, callback) => {
      callback(null, { stdout: "", stderr: "" });
    });

    await renderer.render({
      sourcePath: "/tmp/show.mp4",
      startSec: 0,
      endSec: 15,
      target: "instagram-reels",
      outputPath: "/tmp/reel.mp4",
      smartReframe: false,
    });

    const [, args] = execFileMock.mock.calls[0]!;
    expect(args).toEqual([
      "-y",
      "-ss",
      "0",
      "-to",
      "15",
      "-i",
      "/tmp/show.mp4",
      "-vf",
      "crop=ih*9/16:ih",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-flags",
      "+cgop",
      "-c:a",
      "aac",
      "/tmp/reel.mp4",
    ]);
  });

  it("propagates a real ffmpeg failure", async () => {
    execFileMock.mockImplementation((_cmd, _args, callback) => {
      callback(new Error("ffmpeg exited with code 1"), null);
    });

    await expect(
      renderer.render({
        sourcePath: "/tmp/show.mp4",
        startSec: 0,
        endSec: 15,
        target: "youtube-full",
        outputPath: "/tmp/out.mp4",
        smartReframe: false,
      }),
    ).rejects.toThrow(/ffmpeg exited/);
  });
});
