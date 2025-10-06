# CHANGELOG maintenance workflow

This process keeps the public change log and version markers in sync with the
work that lands in the repository.

## 1. Capture entries as work lands

- Keep an `## Unreleased` section at the top of `CHANGELOG.md`. Add a one-line
  summary for every merged PR.
- Prefix each bullet with the Conventional Commit type (and optional scope) from
  the PR title, for example `feat(content): add decision trees`.
- Link to the merged PR or issue where it helps future readers find context.

## 2. Prep for a release

- Decide the next semantic version by reviewing which modules changed; follow
  the guidance in the repository README and module front matter.
- **Repository version** (in `package.json`):
  - Reflects overall project maturity and infrastructure readiness
  - Pre-1.0: Beta phase until full reading experience is production-ready (live site + polished PDF/EPUB output)
  - Version bumps should align with significant content or infrastructure milestones
- Update any version metadata that ships with the release (module front matter
  fields such as `version` and `last_updated`, printable exports, or supporting
  worksheets).
- Align any repository-level version strings (for example `package.json`) with
  the new release version when needed.

## 3. Publish the log entry

- Move the accumulated bullets from `## Unreleased` into a new top section titled
  `## <YYYY-MM-DD> — v<new-version>`.
- Group bullets by theme (Content, Docs, Infra, etc.) if that makes the entry
  easier to scan.
- Double-check that links to PRs or issues resolve and that the formatting passes
  `npm run check`.

## 4. After the release

- Commit the changelog and version bumps together with a `docs(changelog): …`
  style message.
- (Optional) Note the release in the heartbeat or synthesis docs so operations
  timelines stay aligned.
