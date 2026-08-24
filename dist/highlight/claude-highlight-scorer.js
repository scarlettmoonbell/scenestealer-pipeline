const HIGHLIGHTS_SCHEMA = {
  type: "object",
  properties: {
    highlights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          startSec: { type: "number" },
          endSec: { type: "number" },
          score: {
            type: "number",
            description:
              "0-1, how likely this window is a strong standalone highlight",
          },
          reason: { type: "string" },
        },
        required: ["startSec", "endSec", "score", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["highlights"],
  additionalProperties: false,
};
/**
 * Feeds the transcript + audio-energy events (applause/laughter spikes) to
 * Claude Haiku to produce ranked highlight candidates. Cheap by design — a
 * few cents per show — see README.md's cost basis. Uses plain `fetch`
 * rather than the Anthropic SDK, matching GroqTranscriber and
 * PostizPublishProvider's existing pattern in this codebase (no AI-provider
 * SDK dependency added). Structured outputs (`output_config.format`)
 * guarantee a parseable response instead of prompting for JSON and hoping.
 */
export class ClaudeHighlightScorer {
  apiKey;
  constructor(apiKey) {
    this.apiKey = apiKey;
  }
  async scoreHighlights(transcript, audioEvents, scenes) {
    const prompt = buildPrompt(transcript, audioEvents, scenes);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        output_config: {
          format: { type: "json_schema", schema: HIGHLIGHTS_SCHEMA },
        },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Claude highlight scoring failed: ${res.status} ${body}`);
    }
    const data = await res.json();
    const textBlock = data.content.find((b) => b.type === "text");
    if (!textBlock?.text) {
      throw new Error("Claude highlight scoring returned no text content");
    }
    const parsed = JSON.parse(textBlock.text);
    return parsed.highlights;
  }
}
function buildPrompt(transcript, audioEvents, scenes) {
  const segmentLines = transcript.segments
    .map((s) => `[${s.startSec.toFixed(1)}-${s.endSec.toFixed(1)}] ${s.text}`)
    .join("\n");
  const audioLines = audioEvents.length
    ? audioEvents
        .map(
          (e) =>
            `[${e.startSec.toFixed(1)}-${e.endSec.toFixed(1)}] intensity ${e.intensity.toFixed(1)}x baseline (likely applause/laughter/audience reaction)`,
        )
        .join("\n")
    : "(none detected)";
  const sceneLines = scenes.length
    ? scenes
        .map((s) => `[${s.startSec.toFixed(1)}-${s.endSec.toFixed(1)}]`)
        .join(", ")
    : "(none detected)";
  return `You are selecting highlight moments from a full-length live theater/performance recording, for short-form clips (social media). Score candidate windows 15-90 seconds long that would work as standalone clips — moments with a clear beginning/end, emotional peak, applause, laughter, or a strong line/moment.

Transcript segments (with timestamps):
${segmentLines}

Audio energy spikes (applause/laughter/audience reaction — weight these highly as highlight signals):
${audioLines}

Real scene/cut boundaries (prefer windows that align close to these):
${sceneLines}

Return the strongest candidate highlight windows, ranked by score, with a brief reason for each.`;
}
