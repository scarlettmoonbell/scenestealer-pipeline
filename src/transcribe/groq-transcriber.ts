import type { Transcriber, Transcript } from "./types.js";

/**
 * Groq's Whisper Turbo endpoint — chosen over OpenAI's Whisper API purely on
 * cost (see README.md's "Cost basis" section). Swappable behind the
 * Transcriber interface if that math ever changes.
 *
 * Not implemented yet — this is the Phase 1 scaffold.
 */
export class GroqTranscriber implements Transcriber {
  constructor(private readonly apiKey: string) {}

  async transcribe(_audioPath: string): Promise<Transcript> {
    throw new Error("not implemented — see README.md Status section");
  }
}
