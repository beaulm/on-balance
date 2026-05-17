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

The repo has two npm packages: the root (linting, checks) and `site/` (the Astro
site). Each has its own dependencies, so you need to install in both.

1. Install root deps: `npm install`.
2. Run checks: `npm run check`.
3. Build printables: `make pdf` or `make epub` (requires pandoc; see [SETUP_PDF.md](./docs/SETUP_PDF.md)).

### Site

Most site commands run from the `site/` directory:

1. `cd site`
2. `npm install` — install site deps (Astro, React, etc.).
3. `npm run dev` — start the Astro dev server at <http://localhost:4321>.
4. `npm run build` — build production site to `site/dist/`.
5. `npm run preview` — preview the production build locally.

### Local dev with Netlify Functions (Resonance, etc.)

The Astro dev server on `:4321` does **not** serve `/.netlify/functions/*`. If
you are working on anything that calls a Netlify Function (e.g. the Resonance
feature), use the Netlify CLI from the **repo root** instead — it runs Astro
for you and proxies both pages and functions on a single port:

1. Create a `.env` file at the repo root with the secrets the functions need.
   At minimum, the Resonance functions require `GITHUB_TOKEN` (a fine-grained
   token with Contents: read/write on this repo). `.env` is gitignored — never
   commit it.
2. From the repo root, run `npx netlify dev`.
3. Browse <http://localhost:8888>. Function calls hit
   `/.netlify/functions/<name>` on this port and are served by
   `netlify/functions/*.ts`.

Non-production traffic (local dev, branch deploys, deploy previews) reads and
writes Resonance data to the `data/resonance-staging` branch, so local
experimentation never touches production counts.

#### Generating a `GITHUB_TOKEN`

The Resonance functions read and write JSON files on the `data/resonance` and
`data/resonance-staging` branches of `beaulm/on-balance` via the GitHub
Contents API, so they need a fine-grained personal access token scoped to
this repo.

1. Open <https://github.com/settings/personal-access-tokens/new> (or:
   GitHub → Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → **Generate new token**).
2. **Token name**: anything memorable, e.g. `on-balance local dev`.
3. **Expiration**: pick a short window (30–90 days is plenty for local dev;
   you can always issue a new one).
4. **Resource owner**: `beaulm`.
5. **Repository access**: **Only select repositories** → pick `on-balance`.
6. **Permissions** → **Repository permissions** → set **Contents** to
   **Read and write**. Leave everything else at *No access*.
7. Click **Generate token** and copy the value (it's only shown once).
8. Add it to `.env` at the repo root:

   ```bash
   GITHUB_TOKEN=github_pat_...
   ```

9. Restart `npx netlify dev` so the new value is picked up.

If you don't have write access to `beaulm/on-balance`, reads will succeed but
writes will fail with a GitHub permissions error — coordinate with a
maintainer if you need write access for testing.

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
