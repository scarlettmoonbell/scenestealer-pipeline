# GitHub Actions Workflows

What each workflow in this directory does, when it runs, and why.

## checks.yml

**Triggers:** `pull_request` (no path filter — every PR) and
`workflow_call` (available for future reuse, no caller yet — this is a
library package with no deploy step of its own).

- **checks** — `npm ci` (resolves `@scenestealer/connectors` via its git
  dependency, which runs that package's own `prepare` build step
  automatically), then `typecheck`, `lint`, `format`, `build`, `test`.

**Not yet added, tracked as a known gap** (see the parent project's
`ROADMAP.md`): SHA-pinning every `uses:` line, a Trivy filesystem scan, and
a gitleaks secret scan — same reasoning as `scenestealer-connectors`'
workflows/README.md.

## dependabot.yml

Weekly version-update PRs for the `npm` ecosystem (root) and the
`github-actions` ecosystem (root). Dependabot **security alerts** should
also be enabled at the repo-settings level (Settings → Security).
