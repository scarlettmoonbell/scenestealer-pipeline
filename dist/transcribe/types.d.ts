export interface TranscriptSegment {
  startSec: number;
  endSec: number;
  text: string;
}
export interface Transcript {
  segments: TranscriptSegment[];
  fullText: string;
}
/** Groq Whisper Turbo by default (~$0.04/hr) — see README.md for the cost math. */
export interface Transcriber {
  transcribe(audioPath: string): Promise<Transcript>;
}
