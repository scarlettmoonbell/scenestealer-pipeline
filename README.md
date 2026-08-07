# SceneStealer — Pipeline

The video-processing engine for [SceneStealer](https://github.com/scarlettmoonbell/scenestealer-app):
transcription, scene-boundary detection, AI highlight scoring, and
platform-spec rendering. Depends on
[`scenestealer-connectors`](https://github.com/scarlettmoonbell/scenestealer-connectors)
for storage/publish I/O but has no tenant, billing, or dashboard concepts —
runnable standalone, independent of the SaaS wrapper.

## Pipeline stages

- **`src/transcribe/`** — Groq Whisper Turbo (~$0.04/hr — see "Cost basis"
  below).
- **`src/scenes/`** — real cut/scene-boundary detection via
  [PySceneDetect](https://github.com/Breakthrough/PySceneDetect) (BSD),
  invoked as a subprocess (it's a Python CLI tool, not a JS library) — used
  to snap AI-suggested clip in/out points to actual cuts instead of
  arbitrary mid-scene timestamps.
- **`src/highlight/`** — a cheap audio-energy/applause-and-laughter
  detector (plain DSP, no vendor) feeds a transcript + those events to
  Claude Haiku for highlight scoring. The overall approach is adapted from
  [SamurAIGPT/AI-Youtube-Shorts-Generator](https://github.com/SamurAIGPT/AI-Youtube-Shorts-Generator)
  (MIT) — a working reference pipeline doing the same
  transcribe → LLM-score → reframe sequence — rather than designed from a
  blank page.
- **`src/render/`** — ffmpeg (subprocess, never linked into this package)
  produces platform-specific renditions: face-tracked vertical reframe
  (also adapted from the SamurAIGPT reference) instead of a naive
  center-crop, encode to each target platform's spec.

## Status

**Phase 4 done (2026-08-06):** `GroqTranscriber`, `PySceneDetectDetector
.detectScenes`, `detectAudioEnergyEvents`, and `ClaudeHighlightScorer` are
all real implementations now, covered by 18 vitest tests (fetch and
`child_process.execFile` mocked — no live Groq/Anthropic/ffmpeg/scenedetect
calls in CI). `GroqTranscriber` and `ClaudeHighlightScorer` use plain
`fetch`, matching `scenestealer-connectors`' `PostizPublishProvider`
pattern rather than adding an AI-provider SDK dependency.
`ClaudeHighlightScorer` uses Claude Haiku with structured outputs
(`output_config.format`) to guarantee parseable JSON — the model choice
was already decided in this file's own cost-basis section above, not a
new pick. `detectAudioEnergyEvents` decodes to raw 16kHz mono PCM via
ffmpeg and computes RMS energy per 0.5s window in-process, rather than
parsing ffmpeg's own filter debug output, which isn't well-specified
across versions.

`FfmpegRenderer` (Phase 5, platform-spec rendering) is still the Phase 1
scaffold and throws `not implemented`. See the parent project's
[`ROADMAP.md`](https://github.com/scarlettmoonbell/scenestealer-app/blob/main/ROADMAP.md)
Phase 5 for when that gets built out.

## Cost basis (why build, not buy — full reasoning in the parent project's PLAN.md)

A 2-hour show: transcription ≈ $0.08–$0.36 (Groq/OpenAI), highlight scoring
≈ a few cents (Claude Haiku on a transcript, not raw video). Estimated
total marginal AI cost per show: well under $1. An ffmpeg rendering worker
is required regardless of build-vs-buy (platform-spec encoding is needed no
matter what generates the highlight timestamps), so this cost is
incremental on infrastructure already running.

## Operations

The deployable product that depends on this package is the sibling
[`scenestealer-app`](https://github.com/scarlettmoonbell/scenestealer-app)
repo — its `ROADMAP.md` tracks overall build sequencing. Infrastructure
(the container this pipeline actually runs in, with `ffmpeg` and
`scenedetect` on `PATH`) is provisioned by
[`scenestealer-infra`](https://github.com/scarlettmoonbell/scenestealer-infra).

## Dependencies

**Runtime:** Node `>=22.12.0`, TypeScript `^5.7`. At execution time (not
install time): `ffmpeg` and PySceneDetect's `scenedetect` CLI must be on
`PATH` in whatever container runs this — both invoked as subprocesses, not
linked libraries (see [License](#license) below for why that boundary
matters).

**Key packages:** `@scenestealer/connectors` (installed via git dependency
on `scarlettmoonbell/scenestealer-connectors#main` until formal npm
publishing is worth doing). No AI-provider SDKs added yet — `GroqTranscriber`
and `ClaudeHighlightScorer` will need Groq's and Anthropic's SDKs (or plain
`fetch`) once implemented.

**External services this package's implementations depend on at runtime:**

- **Groq** — Whisper Turbo transcription API.
- **Anthropic** — Claude Haiku, for highlight scoring.

## License

Apache-2.0 — see [`LICENSE`](LICENSE). `ffmpeg` (potentially GPL, if built
with `libx264`) and PySceneDetect (BSD) are both invoked as subprocesses,
never statically linked into this package — the standard boundary that
keeps their licenses from propagating here, per the FSF's own guidance on
separate programs. Full compatibility analysis in the parent project's
`PLAN.md`.
