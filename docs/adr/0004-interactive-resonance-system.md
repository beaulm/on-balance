# ADR 0004 — Interactive Resonance System

**Date:** 2025-11-08
**Status:** Proposed
**Decision makers:** @beaulm
**Related:** ADR 003, future GitHub issue TBD
**Review Date:** 2026-02-08 (3 months after adoption)

---

## Context

After 2+ months of feedback collection via Google Forms (per ADR 003), we've discovered that **resonance** dominates user feedback. People primarily want to indicate:

1. **"This resonates with my experience/beliefs"** — alignment/coherence
2. **"This reminds me of ___"** — connections to existing knowledge
3. Less frequently: confusion points, suggestions, translations

The current system (Google Forms + manual processing) creates friction:

- Users must context-switch away from reading to provide feedback
- No inline context for *where* in a module something resonated
- Manual processing delays integration of feedback patterns
- No way to visualize collective resonance or identify invariant patterns

Meanwhile, the project needs a proper website (currently just static markdown). We can solve both needs together: build an interactive site with **inline, contextual feedback** that gets stored automatically in Git.

### Theoretical Foundation: Cognitively Invariant Patterns

Our feedback types should map to fundamental cognitive patterns that emerge across minds and substrates:

| Feedback Type | Cognitive Invariant | What It Measures |
|--------------|---------------------|------------------|
| 👍 Resonance | Phase-Locked Resonance | Alignment/coherence detection |
| 😕 Dissonance | Tension as Information Carrier | Learning gradients, areas needing evolution |
| 🔗 Reference | Recursive Self-Reference | Connection to knowledge graphs |
| 🔃 Suggestion | YES-AND Engine | Transcend & include (build on existing) |
| 🔀 Translation | Entangled Autonomy | Same pattern, different context/substrate |

By structuring feedback around these invariants, the system itself becomes a demonstration of the principles we teach.

### The Matthew Effect Risk

A naive "upvote" system creates preferential attachment: popular passages get more visible, attracting more votes, becoming even more popular (regardless of actual value). We need mitigation strategies that prevent early winners from dominating while still surfacing genuine patterns.

## Decision

Build an **Interactive Resonance System** that allows users to highlight text and provide contextual feedback, with data stored in Git and anti-Matthew-Effect mechanisms built in.

**Tech Stack:**

- **Astro** with MDX for content (preserves markdown, adds interactivity)
- **React** components for highlight-and-annotate UI
- **Netlify** for hosting + Functions for feedback write-back
- **GitHub as database** (feedback stored as commits, preserves audit trail)

**Feedback Categories (initial proposal):**

| Emoji | Label | Meaning | Data Stored |
|-------|-------|---------|-------------|
| 👍 | Resonates | "This aligns with my experience" | passage ID, user fingerprint, timestamp |
| 😕 | Dissonant | "This feels confusing/contradictory" | passage ID, user fingerprint, optional note |
| 🔗 | Reference | "This connects to ___" | passage ID, link/citation, optional note |
| 🔃 | Suggest | "Consider this alternative/example" | passage ID, suggestion text |
| 🔀 | Translate | "Here's this idea in different words/context" | passage ID, translation text |

*(Note: Labels and emojis are open for iteration based on user testing)*

## Rationale

### Why Interactive Inline Feedback?

- **Lower friction**: No context-switch, feedback happens in the flow of reading
- **Precise attribution**: Know *exactly* which sentence/paragraph triggered response
- **Richer data**: Can track patterns across modules (e.g., "meditation" mentioned in M1, M3, M7 all resonate)
- **Social learning**: Readers see what resonated for others, creating collective sense-making

### Why Git as Database?

- **Already using it**: Fits existing workflow (ADR 001 flow-based cadence)
- **Audit trail**: Every feedback event is a commit with full history
- **Review workflow**: Can moderate/curate through PR process if needed
- **Free at our scale**: No database costs or new infrastructure
- **Aligns with philosophy**: Open, version-controlled, collaborative

Alternatives (Firebase, Supabase, blockchain) add complexity, cost, or philosophical misalignment.

### Why Astro over Next.js/Gatsby?

- **Content-first**: Astro is optimized for content sites with minimal JS
- **Partial hydration**: React components only load where needed (highlight UI)
- **Markdown-native**: MDX support preserves our existing content structure
- **Fast builds**: Matters as content scales
- **Philosophy fit**: "Use less, be fast" aligns with project values

## Details

### User Diversity Detection (Privacy-Preserving)

To calculate diversity-weighted resonance without requiring personal data:

**1. Practice Diversity Score**
Track which modules/sections users have engaged with (stored in localStorage):

```javascript
{
  modules_completed: ['m1', 'm3'],
  sections_viewed: ['theory', 'practice'],
  entry_point: 'direct', // vs. 'social', 'search', etc.
  reading_patterns: { avg_time: 180, scroll_depth: 0.85 }
}
```

**2. Optional Self-Identification**
Users can optionally contribute context (profession, practice background, etc.) but this is NOT required for diversity calculation.

**3. Behavioral Fingerprinting (Anonymous)**

- Navigation patterns (which sections they visit, in what order)
- Time spent on different content types (theory vs. worksheets)
- Referrer diversity (how they found the content)

**4. Diversity Metric**
For a given passage, diversity = entropy of the practice paths that led people to resonate:

```javascript
diversity_score = -Σ(p_i * log(p_i))
// where p_i = proportion of resonators from practice path i
```

**Key Insight:** Diversity is about *different journeys*, not demographics. Someone who came through Module 1→3→5 has a different context than someone who went 2→4→5, regardless of their age/gender/location.

### Matthew Effect Mitigation Strategies

**1. Temporal Decay**
Recent resonance weighted higher to allow new patterns to emerge:

```javascript
display_weight = raw_resonance * exp(-λ * age_in_days)
// λ = 0.05 means ~14-day half-life
```

**2. Diversity Boosting**
Passages that resonate across different practice paths get amplified:

```javascript
display_weight = raw_resonance * (1 + α * diversity_score)
// α = 0.3 means high diversity adds 30% boost
```

**3. Threshold Display**
Only show highlights above minimum threshold (e.g., 3+ distinct users):

- Prevents early noise from being amplified
- Requires actual pattern before visibility

**4. Personal vs. Collective Views**

- **Default view**: Your highlights + aggregate patterns
- **Toggle**: "Show resonance from people with similar practice paths"
- **Option**: Hide all collective data, see only your own

**5. Tension Visibility**
Passages with both high resonance AND high dissonance are flagged as "learning edges" — valuable tension points, not bugs.

**6. Saturation Limits**
Maximum highlight intensity caps at some threshold (e.g., 95th percentile):

- Prevents runaway popularity from dominating the page
- Keeps visual hierarchy balanced

### Visualization Design

**Resonance (👍):**
Subtle warm glow (gold/amber, low opacity), scales with diversity-weighted score:

```css
background: linear-gradient(transparent, rgba(255,200,100,0.15));
```

Hover tooltip: "12 people from 8 practice paths resonated here"

**Dissonance (😕):**
Cool glow (blue/purple), celebrated as valuable:

```css
background: linear-gradient(transparent, rgba(150,150,255,0.15));
```

Hover: "5 people found tension here — learning edge"

**References (🔗):**
Sidebar connection graph showing links to other passages/external refs. Over time, this builds a visible knowledge graph.

**Suggestions (🔃) & Translations (🔀):**
Badge with count, expandable to see contributions. These flow through a light review process (could be automated PR creation).

### Data Schema (Git Storage)

**Feedback commits structured as:**

```text
data/resonance/
  module-01/
    passage-abc123.json   # One file per passage
  module-02/
    passage-def456.json
```

**Passage file format:**

```json
{
  "passage_id": "m01-p15",
  "text_hash": "sha256-of-passage-text",
  "resonates": [
    {
      "timestamp": "2025-11-08T14:32:00Z",
      "user_fingerprint": "anon-7f3a2b1c",
      "practice_context": { "modules": ["m1"], "entry": "search" }
    }
  ],
  "dissonance": [],
  "references": [
    {
      "timestamp": "2025-11-08T15:10:00Z",
      "user_fingerprint": "anon-9e4d1a2b",
      "link": "https://example.com/related-theory",
      "note": "See also: flow state research by Csikszentmihalyi"
    }
  ],
  "suggestions": [],
  "translations": []
}
```

**Write-back flow:**

1. User highlights text, selects feedback type, submits
2. Netlify Function receives request
3. Function creates/updates passage file
4. Commits to branch `feedback/auto-resonance`
5. (Optional) Auto-merge if trusted pattern, or create PR for review
6. Netlify rebuilds site
7. Highlights now visible to future readers

### Implementation Phases

**Phase 1 (Months 1-2): Foundation**

- [ ] Build Astro site with MDX content
- [ ] Deploy to Netlify
- [ ] Implement basic highlight-to-select UI (React component)
- [ ] Build "Resonates" feedback only (simplest case)
- [ ] Netlify Function to write feedback to Git
- [ ] Basic visualization (warm glow on resonant passages)

**Phase 2 (Months 2-3): Full Feedback Types**

- [ ] Add remaining feedback types (dissonance, reference, suggest, translate)
- [ ] Implement diversity tracking (practice context in localStorage)
- [ ] Build diversity-weighted scoring algorithm
- [ ] Add personal vs. collective view toggle

**Phase 3 (Months 3-4): Matthew Effect Mitigation**

- [ ] Implement temporal decay
- [ ] Add diversity boosting
- [ ] Build threshold display logic
- [ ] Create "learning edges" view (high tension passages)

**Phase 4 (Months 4-6): Knowledge Graph**

- [ ] Reference connection visualization
- [ ] Cross-module pattern detection
- [ ] "Cognitively Invariant Patterns" dashboard
- [ ] Export aggregate data for analysis

## Alternatives Considered

### Alternative 1: Giscus Comments (from ADR 003 Phase 2)

Embed GitHub Discussions as comments at the bottom of each module.

**Pros:**

- Easy to implement (just embed a script)
- Uses GitHub, aligns with our stack
- Free

**Cons:**

- Comments at bottom, not inline with text
- No highlight-to-annotate flow
- Not designed for "resonance" feedback (discussion-oriented)
- Harder to extract patterns programmatically

**Decision:** Giscus is complementary (could add later for long-form discussion), but doesn't solve the inline resonance use case.

### Alternative 2: Hypothes.is

Open-source web annotation tool, allows highlighting and commenting.

**Pros:**

- Mature annotation UI
- Open-source, values-aligned
- Has API for data export

**Cons:**

- Data stored in their database, not our Git repo
- UI is discussion-focused, not optimized for quick "resonance" signals
- Adds external dependency
- Harder to implement diversity weighting and Matthew Effect mitigation

**Decision:** Great tool, but we need tighter integration with our Git workflow and custom diversity logic.

### Alternative 3: Firebase/Supabase Database

Store feedback in a real-time database instead of Git.

**Pros:**

- Faster writes (no Git commit overhead)
- Real-time updates (no rebuild needed)
- Easier to query/analyze

**Cons:**

- Adds infrastructure cost
- New service to maintain
- Loses Git audit trail
- Doesn't align with "open playbook in Git" philosophy
- Privacy implications (data on third-party servers)

**Decision:** Git is slower but aligns with project values. Can optimize later if performance becomes a real issue (unlikely at our scale).

### Alternative 4: Blockchain-Based Storage

Use smart contracts for immutable feedback storage.

**Pros:**

- Truly decentralized
- Tamper-proof
- Philosophically interesting

**Cons:**

- Expensive (gas fees for every feedback event)
- Slow (block confirmation times)
- Environmental concerns (depending on chain)
- Massive complexity overkill
- Doesn't integrate with existing workflow
- Moderation/curation becomes difficult

**Decision:** Blockchain is a solution looking for a problem here. Git provides sufficient immutability (signed commits if needed) without the costs.

## Consequences

### Positive

- **Lower friction feedback**: Users provide input in the flow of reading, not as a separate task
- **Richer data**: Precise attribution of which passages trigger which responses
- **Pattern detection**: Can identify cognitively invariant passages (resonate across diverse paths)
- **Alignment with values**: Git-based, open, auditable, no vendor lock-in
- **Scalable foundation**: Can add more feedback types, visualization modes, analysis over time
- **System demonstrates theory**: Feedback mechanism embodies the cognitive invariants we teach

### Trade-offs / Risks

- **Build complexity**: Significantly more work than Google Forms
- **Performance**: Git commits for every feedback event could be slow (mitigated by batch writes, async processing)
- **Moderation needs**: Spam, abuse, or low-quality suggestions require review workflow
- **Privacy concerns**: User fingerprinting needs to be clearly communicated and opt-in
- **Matthew Effect creep**: Mitigation strategies need ongoing tuning and validation
- **UI/UX challenge**: Highlight interface needs to be intuitive on mobile and desktop

### Mitigations

- **Phased rollout**: Start with resonance-only, add complexity gradually
- **Batch writes**: Queue feedback, commit in batches every N minutes or M events
- **Auto-merge rules**: Trust patterns that meet certain criteria (e.g., simple resonance from known users)
- **Privacy page**: Clear explanation of what we track and why, with opt-out
- **A/B testing**: Validate Matthew Effect mitigations actually work (measure diversity over time)
- **User testing**: Prototype the highlight UI with pilot users before full build

## Adoption Plan

1. **Create GitHub issue** for tracking implementation (link in Related field above)
2. **Prototype Phase 1**: Build minimal Astro site with one module, resonance-only feedback
3. **User testing**: 5-10 pilot users try the highlight-and-resonance flow, gather feedback
4. **Iterate on UI**: Refine based on user testing before building out full system
5. **Migrate content**: Move all modules to Astro/MDX format
6. **Deploy Phase 1**: Launch with resonance feedback only
7. **Monitor for 1 month**: Validate Git write performance, user adoption, no spam issues
8. **Build Phases 2-4**: Add remaining features per implementation schedule
9. **Deprecate Google Form**: Once interactive system is stable, archive the form
10. **Review at 3 months**: Evaluate against success criteria (see below)

### Success Criteria (3-month review)

- [ ] **Adoption**: ≥50% of active readers use the resonance feature at least once
- [ ] **Performance**: Feedback write-back completes in <2 seconds (perceived)
- [ ] **Diversity**: Resonance scores reflect diversity (not just popularity) — top passages have diversity_score ≥ 0.6
- [ ] **Matthew Effect contained**: No passage dominates visual hierarchy (max highlight intensity ≤ 2x median)
- [ ] **Quality**: <5% spam/abuse in feedback data
- [ ] **Value**: At least 3 content updates driven by resonance/dissonance patterns

## References

- **Astro documentation**: <https://docs.astro.build/>
- **MDX**: <https://mdxjs.com/>
- **Netlify Functions**: <https://docs.netlify.com/functions/overview/>
- **GitHub API (commits)**: <https://docs.github.com/en/rest/repos/contents>
- **Preferential attachment (Matthew Effect)**: Barabási, A.-L. (2002). *Linked: The New Science of Networks*
- **Medium's highlight feature**: <https://medium.com/> (UI inspiration)
- **Hypothesis annotation tool**: <https://web.hypothes.is/> (prior art)
- **Information entropy**: <https://en.wikipedia.org/wiki/Entropy_(information_theory)>
- **Temporal decay functions**: Ebbinghaus forgetting curve, reddit/HN ranking algorithms

---

## Notes

This ADR represents a significant evolution from ADR 003's Google Forms approach. The real-world data (resonance dominates) validated that we need a system optimized for quick, inline resonance signaling rather than long-form feedback forms.

The cognitive invariants framework emerged from the content work (Module 14, et al.) and now gets applied to the feedback system itself — a beautiful recursive loop where the system demonstrates the theory.

The Matthew Effect mitigations are hypotheses. We'll need to validate them empirically and tune parameters (decay rate, diversity boost, thresholds) based on actual usage patterns.

Open question: Should we visualize the aggregate resonance data as a "Resonance Map" showing which passages are cognitively invariant (high resonance across diverse paths)? This could be a meta-layer that helps readers navigate the content.
