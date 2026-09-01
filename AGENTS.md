## Development

```bash
npm install
npm run build      # tsc -p tsconfig.json
npm run typecheck   # tsc --noEmit
npm run lint
npm run test        # vitest run
```

No dev server — this is a library package, consumed by `scenestealer-app`'s
worker. Running any implementation that touches `ffmpeg`/`scenedetect`
locally requires both on `PATH`.

**`dist/` is committed, not gitignored** — deliberately, not an
oversight. Same reasoning as `scenestealer-connectors`' AGENTS.md:
consumed as a `github:owner/repo#main` git dependency, and pnpm
resolves that via a tarball download rather than a real `git clone` —
confirmed neither `prepare` nor `postinstall` ever runs there (no
`.git` directory to key off). **Run `npm run build` and commit the
result whenever `src/` changes** — nothing else builds it for you.

## Pre-commit hooks

`.pre-commit-config.yaml` mirrors `checks.yml`/`docs.yml`/`actionlint.yml`
locally, before a commit happens — see the comments at the top of that
file for exactly what's included. Install once per machine (`brew install
pipx && pipx install pre-commit`), then activate once per clone:
`pre-commit install`.

## Documentation

- [`.conventions/CONVENTIONS.md`](.conventions/CONVENTIONS.md),
  [`.conventions/DEVOPS.md`](.conventions/DEVOPS.md),
  [`.conventions/INTERFACE.md`](.conventions/INTERFACE.md) — this
  account's cross-project engineering conventions; read before starting
  any nontrivial work.
- [PySceneDetect docs](https://www.scenedetect.com/) — `scenedetect` CLI
  usage, what `PySceneDetectDetector` shells out to.
- [FFmpeg documentation](https://ffmpeg.org/documentation.html) — what
  `FfmpegRenderer` shells out to.
- [Groq API docs](https://console.groq.com/docs) — Whisper Turbo endpoint.
- [Anthropic API docs](https://docs.anthropic.com/) — Claude Haiku, used
  for highlight scoring.
- Sibling repo [`scenestealer-app`](https://github.com/scarlettmoonbell/scenestealer-app)'s
  `PLAN.md` for the full product context this package fits into.
