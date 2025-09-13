# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**On Balance** is an open playbook repository for self-actualization practices and theory. The project consists of modular content written in Markdown that gets exported to static sites and printable formats (PDF/EPUB).

## Repository Structure

- `content/modules/*/` - Individual practice modules, each with `index.md` as the main content
- `docs/adr/` - Architectural Decision Records documenting project decisions
- `docs/policies/` - Accessibility guidelines, pandoc configuration, and conventional commits
- `printables/` - Generated PDFs and EPUBs (build artifacts)
- `scripts/export.sh` - Core export script for PDF/EPUB generation
- `site/` - Static site generation (placeholder + Netlify deployment)

## Development Commands

### Essential Commands
- `npm install` - Install dependencies (markdownlint)
- `npm run check` - Run all checks (currently just markdown linting)
- `npm run lint:md` - Lint all markdown files using markdownlint

### Build Commands
- `make pdf` - Export all modules to PDF format (requires pandoc + LaTeX)
- `make epub` - Export all modules to EPUB format (requires pandoc)

### Export Requirements
- **Pandoc** is required for all exports
- **LaTeX engine** (xelatex, lualatex, or pdflatex) needed for PDF generation
- See `docs/SETUP_PDF.md` for detailed installation instructions
- Export script automatically detects available LaTeX engines

## Content Architecture

### Module Structure
Each module follows this pattern:
```
content/modules/{module-name}/
├── index.md          # Main content with YAML frontmatter
├── worksheet.md      # Practice worksheets
└── [variations].md   # Additional formats/templates
```

### Module Frontmatter
Required YAML metadata includes:
- `title` - Module display name
- `version` - SemVer versioning (major.minor.patch)
- `last_updated` - ISO date format
- `summary` - Brief description
- `mvp_time_per_day` - Time commitment guidance
- `tags` - Content categorization
- `license` - Content licensing (CC BY-SA 4.0)

### Versioning Strategy
- **Major**: Meaning or structural changes
- **Minor**: New examples, sections, or printables
- **Patch**: Clarity improvements, typo fixes

## Quality Standards

### Markdown Linting
- Configured via `.markdownlint.json`
- Disabled rules: MD013 (line length), MD033 (HTML tags), MD041 (first line heading)
- All markdown must pass linting before commits

### Accessibility Requirements
- All modules must pass accessibility checklist in `docs/policies/ACCESSIBILITY_CHECKLIST.md`
- Required before publishing any content

## Export System

The `scripts/export.sh` script:
1. Finds all `index.md` files in content modules
2. Uses pandoc with defaults from `docs/policies/pandoc.yaml` if available
3. Generates both PDF and EPUB for each module
4. Gracefully handles missing LaTeX engines
5. Names output files based on module directory name

## Git Workflow

- Main development happens on feature branches
- Branch naming: `<type>/<description>-<issue-number>` (e.g., `docs/conventional-commits-23`)
- Follow [Conventional Commits](docs/policies/CONVENTIONAL_COMMITS.md) specification
- Current branch: `main`
- Uses conventional commit messages and pull request workflow
- Pull request templates available in `.github/`

## Licensing

- **Content**: CC BY-SA 4.0 (Creative Commons)
- **Code**: Apache-2.0
- Both licenses documented in `LICENSE` and `LICENSES/` directory

## Important Instructions

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.