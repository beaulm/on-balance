## Unreleased

## 2025-10-06 — v0.2.0

**First stable content release** - Repository content is no longer placeholder material. Module 3 (Attention as Lever) expanded to full essay format with companion worksheet.

### Content

- content: expand Attention as Lever to full essay format with companion worksheet (#32)
  - Expand Module 3 from outline to complete essay with theory and practice
  - Add comprehensive practice worksheet with 7-day experiment framework
  - Improve readability through collaboration with reviewers circle
  - Fix markdown linting errors and update linting configuration

### Infrastructure

- infra: refactor directory structure for better organization (#29)
  - Move content from `content/modules/` to `content/`
  - Rename module index files from `index.md` to `README.md` for better compatibility
  - Update export script to use new content paths
- infra: add Claude GitHub actions and fix lint issues (#30)

### Documentation

- docs: add ROADMAP.md for project planning and milestones
- docs(changelog): document the changelog maintenance workflow (#29)
- ops: add weekly heartbeat tracking (multiple PRs)

## 2025-08-22 — v0.1.2

- fix: resolve Markdownlint violations
- build(printables): set pandoc defaults (xelatex + Unicode fonts) to avoid missing glyphs
- build(printables): align export task with new pandoc defaults
- chore(ops): add GitHub Projects setup script (creates project + adds issues)
