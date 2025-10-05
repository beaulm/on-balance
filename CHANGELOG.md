## Unreleased

- content: expand Attention as Lever to full essay format with companion worksheet (#10)
  - Expand Module 3 from outline to complete essay with theory and practice
  - Add comprehensive practice worksheet with 7-day experiment framework
  - Fix markdown linting errors and update linting configuration
- infra: refactor directory structure for better organization (#20)
  - Move content from `content/modules/` to `content/`
  - Rename module index files from `index.md` to `README.md` for better compatibility
  - Update export script to use new content paths
- docs: add ROADMAP.md for project planning and milestones
- docs(changelog): document the changelog maintenance workflow (#29)

## 2025-08-22 — v1.2

- fix: resolve Markdownlint violations
- build(printables): set pandoc defaults (xelatex + Unicode fonts) to avoid missing glyphs
- build(printables): align export task with new pandoc defaults
- chore(ops): add GitHub Projects setup script (creates project + adds issues)
