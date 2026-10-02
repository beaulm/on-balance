# Phase 1 Retrospective — Interactive Resonance System

- **Covers:** #37 (Phase 1) and its sub-issues #38–#51, under the epic #36 and [ADR 0004](../adr/0004-interactive-resonance-system.md)
- **Closes:** #52
- **Written:** 2026-10-02
- **Data sources:** pilot feedback form (3 responses), production `data/resonance` branch (all records to date), issues #50 and #51, monthly syntheses for 2026-04 to 2026-09

## Summary

Phase 1 shipped what it set out to build. A reader can highlight any passage, mark it "Resonates", and see a warm glow plus a "N people resonated" count on passages others chose. Every resonance is stored as a commit in the repository. The pilot showed that the interaction is easy to use: every respondent found it obvious, and two of three would use it again.

The pilot did not show demand. Ten readers were invited. Four browsers left resonance during the pilot week, three people answered the form, and nothing at all has arrived since 2026-06-30. Two new modules have been live since 2026-09-21. Phase 2 as written (more feedback types, diversity weighting, Matthew Effect mitigation) solves problems the project doesn't have yet.

**Recommendation: pause Phase 2 as scoped.** Do a small "Phase 1.5" instead: fix how overlapping highlights are counted (#149), make the feature easier to discover, and put the effort into readership. Reopen Phase 2 when a usage trigger fires (see [Recommendations](#recommendations-for-phase-2)).

## What We Built

| Area | Delivered | Issues / PRs |
|---|---|---|
| Site | Astro + MDX site, content collections linked to `content/`, base layout, Netlify deploy | #38–#41; #53, #54, #56, #57 |
| Selection UI | Text-selection detection, "Resonates" popup, mobile selection fixes | #42, #43, #63, #89 |
| Data | W3C Web Annotation `TextQuoteSelector` records, written to `data/resonance` through a Netlify Function and the GitHub Contents API | #44, #47, #48 |
| Robustness | Rate limiting, retriable vs terminal errors, shared origin validation, separate staging data branch for deploy previews | #49, #78, #90, #103 |
| Visualization | Warm glow on resonant passages, count tooltips, immediate "You resonated" highlight | #45, #46, #110 |
| Release | End-to-end verification, v1.0.0, pilot | #50, #97, #51 |

Since Phase 1, resonance is also wired into every module page (`site/src/pages/modules/[...slug].astro`), so the two September modules have it too. Unit, handler and Playwright regression tests were added in #144.

## User Testing Results

### Who took part

- 10 readers invited (#51). The pilot ran from 2026-05-20 to 2026-05-29 on *Attention as Lever*.
- 3 form responses, about 30% of those invited. Devices: phone, desktop (Chrome) and laptop (Chrome). Reading time: 5–15 minutes, and one person read twice.
- 4 distinct browser fingerprints left resonance during the pilot week, and 5 in total.

A fingerprint is an anonymous ID stored per browser in `localStorage`. It approximates "people" but isn't the same thing: one person on two devices counts twice, and two people sharing a browser count once.

### Resonance data

All production records to date, on `attention-as-lever` only:

| Measure | Value |
|---|---|
| Resonance events | 16 |
| Stored passages | 15 |
| Distinct fingerprints | 5 (events per fingerprint: 8, 4, 2, 1, 1) |
| Pilot (05-20 to 05-29) | 13 events from 4 fingerprints, all between 05-21 and 05-26 |
| After the pilot | 06-16 (1 event, new fingerprint); 06-30 (2 events, a pilot fingerprint returning) |
| Since 2026-06-30 | 0 |

What readers chose:

- **Readers agreed more than the display suggests.** Three sentences were chosen by two different readers each:
  - "It's uncomfortable to admit, but our attention patterns are never purely private…"
  - "Your presence becomes a gift rather than an absence…"
  - "Attention is contagious…"

  Each reader's selection covered a slightly different span, so each span got its own passage ID. On the site they show as separate "1 person" highlights. This is filed as #149.
- **Selections cluster on the "why it matters" and relational sections** (offsets ~5,100–6,900: contagion, presence, "how life becomes life"), plus the opening definition ("Attention is pattern amplification") and the love-as-attention passage.
- **Selection length varies widely:** from single words ("contagious", "patterns") to whole multi-line lists (~270 characters).
- **One record is a same-reader double click** about 11 seconds apart. Read-time counts already count distinct fingerprints, so this doesn't inflate what readers see. Since #111 the client also tracks what you've resonated with.

### Form answers against the #51 questions

| Question | Answers (R1 / R2 / R3) | Read |
|---|---|---|
| Noticed it unprompted? | Partly / Partly / Only because of the email | **Discoverability is weak.** Nobody found it fully unprompted. |
| Obvious once seen? | Yes / Yes / Mostly | Clear. |
| Highlight-then-click feel (1–5) | 5 / 5 / 4 | Natural. |
| Confusion or friction? | "Yes" (no detail) / No / "The resonates button wasn't apparent right at the beginning" | Friction is about *finding* the feature, not using it. |
| Worked reliably? | Yes / Yes / Yes, but "my highlights were not saved" | One bug, since fixed (below). |
| Use again? | Maybe / Definitely / Definitely | Positive. |
| Did others' highlights change reading? | Enhanced / N/A (none yet) / Enhanced | The collective glow worked where it showed up. |
| Wanted other reaction types? | No / No / "Being able to leave a comment would be nice" | **No demand for dissonance, reference, suggest or translate.** One request for comments. |
| Errors or glitches? | No / No / own highlights didn't appear after saving | Same bug as above. |

All three offered a follow-up call. The optional calls weren't held.

## Phase 1 Success Criteria

From #37:

| Criterion | Result | Evidence |
|---|---|---|
| Site deployed and accessible | ✓ | Shipped as v1.0.0 (#97) |
| One module fully functional with resonance feedback | ✓ | *Attention as Lever*; now all three modules |
| ≥5 pilot users leave resonance feedback | **Partial** | 4 fingerprints in the pilot week, 5 by 06-16 |
| Feedback data appears correctly in GitHub | ✓ | 16 well-formed records; deploy previews kept out of production data (#90) |
| No major usability blockers | ✓ | One functional bug found and fixed (#110 → #111). Discoverability is a weakness, not a blocker. |
| Feedback write-back < 2 s (perceived) | ✓ | Verified in #50; no complaints from respondents |
| Confident to proceed with Phase 2 (expand feedback types) | **✗** | See recommendations |

From #51: at least 5 users completing testing was met by invitation and resonance, but only 3 people answered the form. The previously unchecked "at least one user returns and uses it again" is **tentatively met**: one pilot fingerprint came back on 2026-06-30, five weeks later, and resonated twice.

The epic's 3-month success criteria (#36: ≥50% adoption among active readers, diversity score ≥0.6, max highlight ≤2× median) **can't be measured**. The site doesn't count active readers, and at five fingerprints, diversity and concentration statistics don't mean anything.

## Answers to the Key Questions (#52)

1. **Did users discover the feature naturally?** Not really. Two of three noticed it but needed the invitation to understand it, and the third found it only because the email mentioned it. The feature has no affordance until you select text.
2. **Did resonance add value to reading?** For the people who used it, yes. Two of three said seeing others' highlights enhanced their reading, and the third had seen no one else's yet.
3. **Were there technical issues that blocked usage?** No. The one functional bug, own highlights not appearing until reload, didn't block use and was fixed in June (#111). Mobile selection bugs were fixed before the pilot (#63, #89). iOS Safari and Windows were never tested (#50).
4. **What should we prioritize next?** Counting accuracy (#149) and discoverability come before new feedback types. See below.
5. **Expand to more modules, or refine with one?** This has already happened: resonance runs on all three modules. The two newer modules have received no resonance since publishing on 2026-09-21, which points to readership rather than content.

## Key Learnings

- **The interaction design works.** Selection plus one button is understood immediately once seen, and rated 5, 5 and 4 for naturalness. Keeping Phase 1 to "Resonates" only was the right call.
- **Readership is the constraint, not features.** Once the invited cohort stopped, usage stopped. No organic readers have used the feature since June. Every Phase 2–4 capability in ADR 0004 assumes more readers than the project has.
- **Readers want to agree with each other.** Three of the 15 passages overlap another reader's choice. The system hides this because free-text spans fragment the passage IDs. Fixing that is the cheapest way to make the collective glow meaningful at low volume.
- **Readers didn't ask for dissonance, reference, suggest or translate reactions.** The one request was for comments, which is closer to ADR 0004's open question about Giscus than to the five-emoji model.
- **Building from foundation to pilot took about three times the plan.** The epic budgeted Phase 1 at months 1–2. The Astro work started 2026-01-11, v1.0.0 shipped 2026-05-13, and the pilot closed 2026-05-29. #50 alone stalled at about a third done for three months (syntheses 2026-02 to 2026-04). The retrospective then sat for four months (2026-06 to 2026-09 syntheses), limited by capacity rather than blocked.
- **Git-as-database held up.** At this volume it has been reliable, auditable and free. Staging isolation (#90) and the follow-up fixes in #94–#96 were the only data-path incidents, and each was fixed the same day.

## Bugs and Issues

| Issue | Status |
|---|---|
| #63 Firefox Mobile: selection limited to one word | Fixed before the pilot (#81, #82) |
| #89 Chrome Android: can't start a selection inside an existing highlight | Fixed before the pilot (#91) |
| #110 Own resonance not shown until reload (pilot form R3) | Fixed (#111, #120) |
| #149 Overlapping selections of the same passage split resonance counts | **Open, found in this retrospective** |
| iOS Safari and Windows never verified (#50) | Untested; no reports. Worth one check before any outreach push. |

## Recommendations for Phase 2

**Decision: pause Phase 2 as scoped in #36, and do a small Phase 1.5 instead.**

Phase 2's diversity-weighted scoring and Phase 3's Matthew Effect mitigation are designed for a crowd. With five fingerprints they would compute noise, and the pilot gave no signal that readers want more reaction types.

Phase 1.5, in priority order:

1. **Fix count fragmentation (#149).** Make agreement between readers visible, which is the point of the glow.
2. **Add a light discoverability hint.** For example, a one-line note near the top of each module ("Highlight any passage that resonates"), or a dismissible first-visit tooltip. This answers ADR 0004's open question on onboarding with the cheapest option.
3. **Put effort into readers, not features.** Distribute the three published modules to more readers. Measuring adoption also needs a privacy-respecting count of readers (for example Netlify's built-in analytics), because the epic's ≥50% adoption criterion has no denominator today.
4. **Consider Giscus for longer comments** (ADR 0004 open question 4) instead of building inline comments, if the comment request comes up again.

**Trigger to reopen Phase 2:** at least 10 distinct fingerprints resonating within any 30-day window, **or** at least 2 independent requests for a specific new reaction type. Until one fires, #36 stays open as the long-term direction with Phase 2–4 unstarted.

**Timeline estimate:** each Phase 1.5 item is about one PR. Given the project's work-and-rest rhythm (syntheses 2026-06 to 2026-09), plan for it to land over one to two focused windows rather than by a calendar date. If the trigger fires, Phase 2 should be re-sized from scratch at that point. The epic's original "months 2–3" estimate was off by about 3× for Phase 1.
