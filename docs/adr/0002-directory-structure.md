# ADR 002: Directory Structure for On Balance

## Status

Proposed

## Context

We need a directory structure that:

- Supports multiple related but distinct projects (Self-Actualization, Treatise, essays)
- Handles internationalization/localization elegantly
- Allows for module supplements (worksheets, guides, etc.)
- Remains simple and browsable on GitHub
- Scales gracefully as content grows

## Decision

Adopt a hierarchical structure with clear separation between:

1. The main practical work (self-actualization/)
2. Standalone essays (essays/)
3. Future theoretical work (treatise-on-chance/)
4. Shared resources (resources/)
5. Generated artifacts (printables/)

Use README.md for all main content files to leverage GitHub's automatic display.

## Consequences

### Positive

- Clear mental model for contributors
- GitHub automatically displays README.md files
- Easy to add new modules or essays
- Localization stays close to source content
- Natural place for everything (no orphans)

### Negative

- More folders to navigate initially
- Need to move existing content (one-time migration)
- Some redundancy in README.md naming

### Neutral

- Sets precedent for how we organize future content
- Requires documentation of structure

## Alternatives Considered

### Alternative 1: Flat structure

Keep everything at root level with prefixes (module-01-orientation.md)

- Rejected: Won't scale, gets messy fast

### Alternative 2: By content type

Organize by type (modules/, worksheets/, guides/)

- Rejected: Separates related content, harder to find everything for one module

### Alternative 3: Nested by book

Deep nesting (books/self-actualization/part-1/module-1/)

- Rejected: Too much hierarchy, harder to navigate

## Implementation

1. Create new directory structure
2. Move existing content
3. Update all internal links
4. Add .gitkeep files to empty directories
5. Document structure in main README

## Review Date

2025-12-08 (after 3 months of use)

## Notes

This structure optimizes for clarity and growth over minimalism. We choose slight redundancy (multiple README.md files) for better GitHub integration.

## Links

Issue: Relates to #20
