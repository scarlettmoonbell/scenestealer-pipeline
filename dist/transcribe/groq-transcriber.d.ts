import type { Transcriber, Transcript } from "./types.js";
/**
 * Groq's Whisper Turbo endpoint — chosen over OpenAI's Whisper API purely on
 * cost (see README.md's "Cost basis" section). Swappable behind the
 * Transcriber interface if that math ever changes.
 */
export declare class GroqTranscriber implements Transcriber {
    private readonly apiKey;
    constructor(apiKey: string);
    transcribe(audioPath: string): Promise<Transcript>;
}
