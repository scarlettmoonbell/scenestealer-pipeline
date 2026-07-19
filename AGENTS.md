## Development

```
npm install
npm run build      # tsc -p tsconfig.json
npm run typecheck   # tsc --noEmit
npm run lint
npm run test        # vitest run
```

No dev server — this is a library package, consumed by `scenestealer-app`'s
worker. Running any implementation that touches `ffmpeg`/`scenedetect`
locally requires both on `PATH`.

## Documentation

- [PySceneDetect docs](https://www.scenedetect.com/) — `scenedetect` CLI
  usage, what `PySceneDetectDetector` shells out to.
- [FFmpeg documentation](https://ffmpeg.org/documentation.html) — what
  `FfmpegRenderer` shells out to.
- [Groq API docs](https://console.groq.com/docs) — Whisper Turbo endpoint.
- [Anthropic API docs](https://docs.anthropic.com/) — Claude Haiku, used
  for highlight scoring.
- Sibling repo [`scenestealer-app`](https://github.com/scarlettmoonbell/scenestealer-app)'s
  `PLAN.md` for the full product context this package fits into.
