import { describe, expect, it, vi } from "vitest";

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

import { detectAudioEnergyEvents } from "./audio-energy.js";

const SAMPLE_RATE = 16_000;
const WINDOW_SAMPLES = SAMPLE_RATE * 0.5;

/** Builds raw 16-bit signed PCM: one 0.5s window per amplitude in `windowAmplitudes`. */
function buildPcmBuffer(windowAmplitudes: number[]): Buffer {
  const samples = new Int16Array(windowAmplitudes.length * WINDOW_SAMPLES);
  windowAmplitudes.forEach((amplitude, w) => {
    samples.fill(amplitude, w * WINDOW_SAMPLES, (w + 1) * WINDOW_SAMPLES);
  });
  return Buffer.from(samples.buffer);
}

describe("detectAudioEnergyEvents", () => {
  it("shells out to ffmpeg with 16kHz mono s16le output", async () => {
    execFileMock.mockImplementation((_cmd, _args, callback) => {
      callback(null, { stdout: buildPcmBuffer([1000, 1000]), stderr: "" });
    });

    await detectAudioEnergyEvents("/tmp/audio.wav");

    expect(execFileMock).toHaveBeenCalledTimes(1);
    const [cmd, args] = execFileMock.mock.calls[0]!;
    expect(cmd).toBe("ffmpeg");
    expect(args).toEqual([
      "-i",
      "/tmp/audio.wav",
      "-f",
      "s16le",
      "-acodec",
      "pcm_s16le",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-",
    ]);
  });

  it("flags a sustained window above the rolling median baseline as an event", async () => {
    // 4 quiet windows + 1 loud window (index 3) — median stays low, the spike stands out.
    execFileMock.mockImplementation((_cmd, _args, callback) => {
      callback(null, {
        stdout: buildPcmBuffer([1000, 1000, 1000, 20000, 1000]),
        stderr: "",
      });
    });

    const events = await detectAudioEnergyEvents("/tmp/audio.wav");

    expect(events).toHaveLength(1);
    expect(events[0]!.startSec).toBeCloseTo(1.5);
    expect(events[0]!.endSec).toBeCloseTo(2.0);
    expect(events[0]!.intensity).toBeGreaterThan(2);
  });

  it("merges consecutive loud windows into a single event", async () => {
    execFileMock.mockImplementation((_cmd, _args, callback) => {
      callback(null, {
        stdout: buildPcmBuffer([1000, 1000, 20000, 20000, 1000]),
        stderr: "",
      });
    });

    const events = await detectAudioEnergyEvents("/tmp/audio.wav");

    expect(events).toHaveLength(1);
    expect(events[0]!.startSec).toBeCloseTo(1.0);
    expect(events[0]!.endSec).toBeCloseTo(2.0);
  });

  it("returns no events when audio is uniformly quiet", async () => {
    execFileMock.mockImplementation((_cmd, _args, callback) => {
      callback(null, {
        stdout: buildPcmBuffer([1000, 1000, 1000, 1000]),
        stderr: "",
      });
    });

    expect(await detectAudioEnergyEvents("/tmp/audio.wav")).toEqual([]);
  });

  it("returns an empty array when there's not even one full window of audio", async () => {
    execFileMock.mockImplementation((_cmd, _args, callback) => {
      callback(null, { stdout: Buffer.alloc(10), stderr: "" });
    });

    expect(await detectAudioEnergyEvents("/tmp/audio.wav")).toEqual([]);
  });
});
