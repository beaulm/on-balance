# ADR 0001 — Flow-based cadence over sprints

**Date:** 2025-08-26  
**Status:** Proposed  
**Decision makers:** @beaulm  
**Related:** #11
**Review Date:** 2025-11-26

---

## Context

We need a delivery rhythm that (a) favors small, frequent, reviewable changes; (b) keeps friction low for a mostly-solo maintainer (for now) while still being scalable to collaborators; and (c) aligns with “On Balance” principles of feedback, attention, and compounding.

Classic Scrum-style *time-boxed sprints* push batch size up and increase planning overhead. A *flow-based* system (Kanban-style) emphasizes visualizing work, limiting WIP, and continuously pulling the next most valuable item. Together with trunk-based/GitHub-flow practices and light governance (branch protection + CI), this keeps lead time short and the repo always shippable.

## Decision

Adopt a **flow-based cadence** (no fixed sprints) with:

1. **Board & pull system:** GitHub Project board with columns *Now → Next → Later → Done*. Work is pulled into *Now*; we limit WIP (default WIP=2 while solo).  
2. **Small batches:** Short-lived feature branches, Draft PRs early, **squash merge** to `main`.  
3. **Heartbeat:** Weekly written heartbeat (what moved in *Now*, what was promoted from *Next*).  
4. **Synthesis:** Monthly short synthesis (themes, lessons, next bets).  
5. **Guards:** Branch protection on `main` with required checks (`lint`, `build_epub`), linear history, and auto-delete merged branches.  
6. **Metrics:** Track lightweight flow/DORA proxies: PR lead time (open→merge), deployment frequency (releases/printables cadence), change failure rate (reverted PRs), time to restore (how fast we fix broken builds/content).

This ADR defines **how we work**; module content remains independent.

## Rationale

- **Kanban/flow** reduces planning overhead and encourages continuous improvement with visualized work and WIP limits.  
- **Trunk-based / GitHub flow** with small batches reduces integration pain and keeps `main` releasable.  
- **Branch protection** ensures reviews/status checks gate merges and enforces squash/rebase for linear history.  
- **DORA-style signals** keep attention on outcomes (speed + stability) without heavy process.

## Details

### Board & policies
- **Columns:** *Now* (in progress), *Next* (ready), *Later* (backlog), *Blocked*, *Done*.  
- **Pull, don’t push:** Move from *Next* to *Now* only when under WIP limit.  
- **WIP limits (initial):** Solo: *Now* ≤ 2 items. Revisit when collaborators join.  
- **Issue as the unit of work:** Every change starts with an Issue. PRs link via `Closes #NN`.

### Branching & PRs
- **Naming:** `type/slug-<issue#>` (e.g., `adr/flow-cadence-11`, `infra/ci-cache-22`).  
- **Draft PRs early:** Create a Draft PR as soon as the direction is clear; flip to “Ready” when CI is green.  
- **Merge policy:** **Squash & merge** only; delete head branches after merge.  
- **Templates:** Use specialized PR templates (`adr.md`, `infra.md`, `content.md`) and a minimal default.

### Protection & CI (main)
- **Required checks:** `lint`, `build_epub`.  
- **Linear history:** required; no merge commits.  
- **Up-to-date before merge:** enabled.  
- **Future option:** Enable *merge queue* if/when PR volume rises.

### Cadence rituals
- **Weekly heartbeat (10 min):** Update board, note what shipped, promote 1–3 *Next* items.  
- **Monthly synthesis (30–45 min):** What compounded? Which bets paid off? Adjust WIP, policies, or metrics if needed.

### Metrics (lightweight)
- **PR lead time:** PR opened → merged (rolling median).  
- **Deployment frequency:** How often we publish a printable/site release.  
- **Change failure rate:** % of PRs that require revert/hotfix.  
- **Time to restore:** Duration from detection to fix for a broken build/content regression.

### Definition of Done (DoD)
- CI green; lints and EPUB build pass.  
- PR uses the correct template and includes `Closes #NN`.  
- Any reader-facing change has plain-language summary and stays print-friendly.  
- Board updated; if the work produced follow-ups, open issues and place them in *Next* or *Later*.

## Alternatives considered

1. **Two-week sprints + Scrum rituals**  
   - Pros: familiar to many teams, predictable review cadence.  
   - Cons: higher planning overhead; encourages batching; overkill for a small team.

2. **Gitflow with long-lived branches**  
   - Pros: strict release management.  
   - Cons: slower integration; higher merge pain; not needed for this project’s simplicity.

3. **Ad-hoc “just push to main”**  
   - Pros: minimal ceremony.  
   - Cons: no guardrails; loses code review/CI quality gates and board visibility.

## Consequences

**Positive**
- Shorter feedback loops; easier reviews; always-releasable `main`.  
- Process scales with collaborators (just tighten WIP, add code-owner reviews, or enable merge queue).  
- Clear visibility of work and priorities via the Project board.

**Trade-offs / Risks**
- Requires discipline to keep WIP low and PRs small.  
- Flow metrics are proxies; we’ll recalibrate if we’re optimizing the wrong thing.  
- If PR volume grows, we may need to enable merge queue to maintain velocity.

## Adoption plan
1. Apply/verify branch protection on `main` (status checks, linear history, up-to-date, auto-delete).  
2. Keep the Project board public and use “Auto-add” for Issues/PRs.  
3. Use `Closes #NN` in every PR; prefer Draft PRs early.  
4. Revisit WIP limits and metrics after the first month; formalize heartbeat & synthesis notes in `/docs/ops/`.

## References
- Kanban principles: visualize work, limit WIP, manage flow, evolve policies — Atlassian guide.  
  https://www.atlassian.com/agile/project-management/kanban-principles
- Trunk-based development & small batches — Atlassian CI/CD overview.  
  https://www.atlassian.com/continuous-delivery/continuous-integration/trunk-based-development
- GitHub Flow: short-lived branches, PRs, reviews, status checks.  
  https://docs.github.com/en/enterprise-cloud@latest/get-started/using-github/github-flow
- Branch protection: required checks, linear history, up-to-date requirement.  
  https://docs.github.com/articles/about-required-reviews-for-pull-requests
- Merge queue (optional, for higher volume).  
  https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue
- DORA “four keys” metrics (throughput + stability).  
  https://dora.dev/guides/dora-metrics-four-keys/