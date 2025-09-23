## Unreleased

- infra: refactor directory structure for better organization (#20)
  - Move content from `content/modules/` to `content/`
  - Rename module index files from `index.md` to `README.md` for better compatibility
  - Add dedicated `essays/` directory for standalone pieces
  - Update export script to use new content paths
- docs: add ROADMAP.md for project planning and milestones
- docs(changelog): document the changelog maintenance workflow (#29)

## 2025-08-22 — v1.2

- fix: resolve Markdownlint violations
- build(printables): set pandoc defaults (xelatex + Unicode fonts) to avoid missing glyphs
- build(printables): align export task with new pandoc defaults
- chore(ops): add GitHub Projects setup script (creates project + adds issues)
