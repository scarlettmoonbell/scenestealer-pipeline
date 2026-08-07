import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(async () => Buffer.from("fake-audio-bytes")),
}));

import { GroqTranscriber } from "./groq-transcriber.js";

describe("GroqTranscriber", () => {
  const apiKey = "test-groq-key";
  let transcriber: GroqTranscriber;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    transcriber = new GroqTranscriber(apiKey);
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function jsonResponse(body: unknown, ok = true, status = 200) {
    return {
      ok,
      status,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    };
  }

  it("posts multipart form data with the audio file and turbo model", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        text: "Full show text.",
        segments: [{ start: 0, end: 1.5, text: "Full show text." }],
      }),
    );

    await transcriber.transcribe("/tmp/show.mp3");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.groq.com/openai/v1/audio/transcriptions");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(`Bearer ${apiKey}`);
    const form = init.body as FormData;
    expect(form.get("model")).toBe("whisper-large-v3-turbo");
    expect(form.get("response_format")).toBe("verbose_json");
    expect(form.get("file")).toBeInstanceOf(Blob);
  });

  it("maps verbose_json segments into Transcript shape", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        text: "Hello world.",
        segments: [
          { start: 0, end: 1.2, text: "Hello" },
          { start: 1.2, end: 2.5, text: "world." },
        ],
      }),
    );

    const result = await transcriber.transcribe("/tmp/show.mp3");

    expect(result).toEqual({
      fullText: "Hello world.",
      segments: [
        { startSec: 0, endSec: 1.2, text: "Hello" },
        { startSec: 1.2, endSec: 2.5, text: "world." },
      ],
    });
  });

  it("throws with the response body when Groq returns an error", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "invalid file" }, false, 400),
    );

    await expect(transcriber.transcribe("/tmp/show.mp3")).rejects.toThrow(
      /Groq transcription failed: 400/,
    );
  });
});
