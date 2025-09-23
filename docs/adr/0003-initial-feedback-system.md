# ADR 003: Initial Feedback System Choice

## Status

Accepted

## Context

We need to collect feedback from pilot participants to:

- Replace placeholder testimonials with real stories
- Identify confusion points and friction
- Understand what's working and what isn't
- Build community wisdom into the practice

The system needs to be:

- Quick to implement (we have eager pilot users waiting)
- Accessible to non-technical users
- Able to preserve anonymity when desired
- Simple to manage initially (one person team)

## Decision

Start with a simple Google Form for initial feedback collection, with manual processing of responses. Plan to evolve to more sophisticated systems as the project grows.

Phase 1 (Now): Google Form + manual processing
Phase 2 (1-3 months): Add Giscus for inline comments
Phase 3 (3-6 months): Explore automation and voting systems

## Consequences

### Positive

- Can launch within 30 minutes
- Zero cost
- Familiar interface for users
- Full control over data
- Easy to export and analyze
- No new dependencies or accounts needed

### Negative

- Manual work to process responses
- No automatic integration with GitHub
- Another silo of information to manage
- Google-dependent (privacy concerns for some users)
- No real-time features

### Neutral

- Sets precedent that we start simple and iterate
- Requires weekly/monthly review discipline

## Alternatives Considered

### Alternative 1: GitHub Issues only

Have people submit feedback as GitHub issues

- Rejected: Too high barrier for non-technical users

### Alternative 2: Typeform/Tally + Zapier automation

Pretty forms with some automation

- Rejected: Added complexity and cost without clear benefit at this scale

### Alternative 3: Custom feedback widget

Build our own feedback system

- Rejected: Premature optimization, delays launch

### Alternative 4: Wait for perfect system

Don't collect feedback until we have ideal setup

- Rejected: Perfect is the enemy of good, need feedback now

## Implementation

1. Create Google Form with these fields:
   - Module practiced
   - Days completed
   - What helped
   - What was difficult
   - Story to share
   - Permission to use story
   - Email (optional)

2. Add form link to:
   - Bottom of each module
   - Worksheets
   - Initial distribution email

3. Weekly review process:
   - Export responses
   - Identify patterns
   - Create GitHub issues for changes
   - Add testimonials to repo

4. Monthly synthesis:
   - Summary of patterns
   - Update to modules based on feedback
   - Thank you to contributors

## Review Date

2025-10-08 (after first month of feedback)

## Future Migration Path

- Export all Google Form data as CSV
- Can import to any future system
- GitHub issues created preserve decision history
- Testimonials in repo maintain attribution

## Notes

This decision embodies the project philosophy: start simple, iterate based on real feedback, don't let perfect prevent good. We choose learning over planning.
