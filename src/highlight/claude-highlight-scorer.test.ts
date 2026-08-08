import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClaudeHighlightScorer } from "./claude-highlight-scorer.js";
import type { Transcript } from "../transcribe/types.js";
import type { AudioEnergyEvent } from "./types.js";

describe("ClaudeHighlightScorer", () => {
  const apiKey = "test-claude-key";
  let scorer: ClaudeHighlightScorer;
  let fetchMock: ReturnType<typeof vi.fn>;

  const transcript: Transcript = {
    fullText: "Hello world. Big finish!",
    segments: [
      { startSec: 0, endSec: 2, text: "Hello world." },
      { startSec: 30, endSec: 32, text: "Big finish!" },
    ],
  };
  const audioEvents: AudioEnergyEvent[] = [
    { startSec: 30, endSec: 34, intensity: 4.2 },
  ];
  const scenes = [
    { startSec: 0, endSec: 30 },
    { startSec: 30, endSec: 60 },
  ];

  beforeEach(() => {
    scorer = new ClaudeHighlightScorer(apiKey);
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

  it("posts to the Messages API with Haiku, structured output, and the API key header", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        content: [{ type: "text", text: JSON.stringify({ highlights: [] }) }],
      }),
    );

    await scorer.scoreHighlights(transcript, audioEvents, scenes);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.headers["x-api-key"]).toBe(apiKey);
    expect(init.headers["anthropic-version"]).toBe("2023-06-01");

    const body = JSON.parse(init.body);
    expect(body.model).toBe("claude-haiku-4-5");
    expect(body.output_config.format.type).toBe("json_schema");
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[0].content).toContain("Big finish!");
    expect(body.messages[0].content).toContain("4.2x baseline");
  });

  it("parses the structured JSON response into HighlightCandidate[]", async () => {
    const highlights = [
      {
        startSec: 29,
        endSec: 35,
        score: 0.9,
        reason: "applause + strong line",
      },
    ];
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        content: [{ type: "text", text: JSON.stringify({ highlights }) }],
      }),
    );

    const result = await scorer.scoreHighlights(
      transcript,
      audioEvents,
      scenes,
    );

    expect(result).toEqual(highlights);
  });

  it("throws with the response body when the API call fails", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "rate limited" }, false, 429),
    );

    await expect(
      scorer.scoreHighlights(transcript, audioEvents, scenes),
    ).rejects.toThrow(/Claude highlight scoring failed: 429/);
  });

  it("throws if the response has no text content block", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ content: [{ type: "tool_use" }] }),
    );

    await expect(
      scorer.scoreHighlights(transcript, audioEvents, scenes),
    ).rejects.toThrow(/returned no text content/);
  });
});
