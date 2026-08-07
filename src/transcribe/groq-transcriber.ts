import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { Transcriber, Transcript } from "./types.js";

/** Shape confirmed against Groq's own docs (console.groq.com/docs/speech-to-text) — only the fields this class actually reads. */
interface GroqVerboseJsonResponse {
  text: string;
  segments: Array<{ start: number; end: number; text: string }>;
}

/**
 * Groq's Whisper Turbo endpoint — chosen over OpenAI's Whisper API purely on
 * cost (see README.md's "Cost basis" section). Swappable behind the
 * Transcriber interface if that math ever changes.
 */
export class GroqTranscriber implements Transcriber {
  constructor(private readonly apiKey: string) {}

  async transcribe(audioPath: string): Promise<Transcript> {
    const bytes = await readFile(audioPath);
    const form = new FormData();
    form.set("file", new Blob([bytes]), basename(audioPath));
    form.set("model", "whisper-large-v3-turbo");
    form.set("response_format", "verbose_json");

    const res = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: form,
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Groq transcription failed: ${res.status} ${body}`);
    }

    const data = (await res.json()) as GroqVerboseJsonResponse;
    return {
      fullText: data.text,
      segments: data.segments.map((s) => ({
        startSec: s.start,
        endSec: s.end,
        text: s.text,
      })),
    };
  }
}
