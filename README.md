# On Balance — Open Playbook

**Umbrella:** On Balance  
**Tracks:** *Self-Actualization for the 21st Century* (practice) • *A Treatise on Chance* (theory)

This repo is the source of truth (Markdown). We publish to a static site and export printables (PDF/EPUB).  
Contributions welcome via PRs under the license chosen below.

## Structure
```txt
content/           # modules in Markdown (MD/MDX)
docs/adr/          # architectural decision records
docs/policies/     # accessibility and safety policies
docs/              # setup docs
evidence/          # anonymized pilot summaries
printables/        # exported PDFs/EPUBs
site/              # static site (placeholder + Netlify ready)
scripts/           # build/export helpers
.github/           # CI, templates
```

## Getting Started
1. Choose a license in `LICENSE` (see `LICENSE-TEXT-CC-BY-SA-4.0.txt` or `...-NC-...`).  
2. Install deps: `npm i`.  
3. Build printables: `make pdf` or `make epub` (requires pandoc; see `docs/SETUP_PDF.md`).  
4. Run checks: `npm run check`.

## Versioning
- SemVer per module (content): `major.minor.patch`  
  - **major**: meaning/structure changes  
  - **minor**: examples/sections/printables added  
  - **patch**: clarity/typos
- See `CHANGELOG.md` and each module front-matter.

## Accessibility
See `docs/policies/ACCESSIBILITY_CHECKLIST.md`. All modules must pass before publishing.

## Feedback
- Open an issue (`bug`, `accessibility`, `evidence-gap`, `request`)  
- Anonymous reader form (link TBD) lives in each module.

## Credit
Signed as **Beau & Contributors — The On Balance Project**. See `AUTHORS.md` and `CONTRIBUTORS.md`.
