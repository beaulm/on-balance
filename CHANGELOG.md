## Unreleased

## 2026-05-13 — v1.0.0

**First production release.** Ships the platform — an Astro site deployed on Netlify with the interactive resonance system — alongside the first official module (Attention as Lever v1.0.0). On Balance exits beta.

### Platform

- feat(site): add v1.0 landing page, OG metadata, and cairn favicon (#99)
- feat(site): add base styles and responsive layout (#56)
- feat(site): configure content collections with symlink to source content (#54)
- feat(site): initialize Astro project with MDX and React support (#53)

### Interactive resonance system

- feat(site): add resonance count tooltips on hover (#79)
- feat(site): add resonance visualization with warm glow (#76)
- feat(site): add rate limiting and robust error handling to resonance function (#74)
- feat(site): persist resonance data to GitHub via Contents API (#70)
- feat(site): add Netlify Function for recording resonance (#68)
- feat(site): store selection data in W3C Web Annotation format (#65)
- feat(site): add resonance feedback popup UI (#61)
- feat(site): add text selection detection component (#59)

### Content

- content(attention-as-lever): replace body with v1.5.3 draft (#93)

### Bug fixes

- fix(netlify): drop CDN/browser cache on get-resonance to surface fresh writes (#96)
- fix(netlify): resolve deploy context from handler context object, not just env (#95)
- fix(netlify): isolate non-production resonance data to data/resonance-staging (#94)
- fix(site): defer resonance tooltip to touchend on mobile (#91)
- fix(site): detect long-press and settle selection before showing popup (#82)
- fix(site): defer selection popup until touchend on mobile (#81)

### Docs & Infrastructure

- docs: add ADR 004 for Interactive Resonance System (#35)
- ops(netlify): add Node.js version specification (#57)
- chore: ignore site/node_modules in markdownlint scripts (#67)

### Ops

- ops: weekly heartbeat tracking and monthly syntheses (multiple PRs)

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
