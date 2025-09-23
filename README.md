# On Balance — Open Playbook

This repo is the source of truth (Markdown). We publish to a static site and export printables (PDF/EPUB).  
Contributions welcome via PRs under the licenses below.

## Structure

```txt
content/
├── attention-as-lever/
docs/
├── adr/               # Architectural decision records
├── ops/               # Operational docs (heartbeat, synthesis)
└── policies/          # Accessibility and safety policies
printables/            # Auto-generated PDFs and EPUBs
scripts/               # Build and export helpers
site/                  # Static site (placeholder + Netlify ready)
.github/               # CI, templates
```

## Getting Started

1. Install deps: `npm i`.  
2. Build printables: `make pdf` or `make epub` (requires pandoc; see [SETUP_PDF.md](./docs/SETUP_PDF.md)).  
3. Run checks: `npm run check`.

## Versioning

- SemVer per module (content): `major.minor.patch`
  - **major**: meaning/structure changes
  - **minor**: examples/sections/printables added
  - **patch**: clarity/typos
- See [CHANGELOG](./CHANGELOG.md) and each module front-matter.
- Follow the [CHANGELOG maintenance workflow](./docs/ops/changelog-workflow.md) when
  preparing releases.

## Accessibility

See the [accessibility checklist](./docs/policies/ACCESSIBILITY_CHECKLIST.md). All modules must pass before publishing.

## Feedback

- Open an issue (`bug`, `accessibility`, `evidence-gap`, `request`)  
- Anonymous reader form (link TBD) lives in each module.

## Credit

**Beau & Contributors — The On Balance Project**.
See [AUTHORS](./AUTHORS.md) and [CONTRIBUTORS](./CONTRIBUTORS.md).

## Licensing

Content: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
Code: [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0.html)
(see [LICENSE](./LICENSE) & [LICENSES/](./LICENSES/))
