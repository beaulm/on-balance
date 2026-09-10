# Operations Documentation

This directory contains templates and documentation for On Balance project operations, following the flow-based cadence established in [ADR 0001](../adr/0001-flow-based-cadence.md).

## Workflow Cadence

### Weekly Heartbeat (10 minutes)

- **Purpose:** Track board movement, identify blockers, maintain flow
- **Template:** [heartbeat-template.md](heartbeat-template.md)
- **Schedule:** Every Sunday morning (feeds the Sunday-evening weekly retro)
- **Output:** Create `heartbeat/YYYY-MM-DD.md` with current week's status

### Monthly Synthesis (30-45 minutes)  

- **Purpose:** Analyze themes, adjust policies, plan next bets
- **Template:** [synthesis-template.md](synthesis-template.md)
- **Schedule:** 1st of each month, reviewing the prior calendar month
- **Output:** Create `synthesis/YYYY-MM.md` with month's analysis

## File Organization

```text
docs/ops/
├── README.md                  # This file
├── heartbeat-template.md      # Weekly heartbeat template
├── synthesis-template.md      # Monthly synthesis template
├── heartbeat/                 # Weekly heartbeat files
│   ├── 2024-08-26.md         # Week of Aug 26, 2024
│   ├── 2024-09-02.md         # Week of Sep 2, 2024
│   └── ...
└── synthesis/                 # Monthly synthesis files
    ├── 2024-08.md            # August 2024 synthesis
    ├── 2024-09.md            # September 2024 synthesis
    └── ...
```

## Creating a Heartbeat

1. Copy the [heartbeat-template.md](heartbeat-template.md). If starting from the prior heartbeat, restore any missing template sections and replace the prior week's entries.
2. Create `heartbeat/YYYY-MM-DD.md` (Sunday date)
3. Fill in the template with current week's data:
   - Board movement (completed, in progress, promoted, and other moves)
   - Metrics snapshot (PRs, issues, WIP, build status)
   - Notable outcomes and blockers
   - Next week focus areas

### Consistency rules

**Separate the snapshot from movements and trends.** Under Board Movement,
"In Progress (Now)" lists only the items in Now at the reporting cutoff. The other
subsections record transitions during the reporting window:

- **Completed (Now → Done):** Items that moved from Now to Done.
- **Promoted (Next → Now):** Items that moved from Next to Now.
- **Other Moves:** Any other column changes, including parking, blocking, or resuming
  an item. Include the item, source → destination, and reason. For example,
  `#52 — Now → Later; parked pending re-evaluation` belongs here, not under Completed.

Record each transition in its matching subsection, even if an item moves more than
once during the window. Use `None` when a subsection has no entries. Put streaks and
trends (such as "Nth consecutive week") in Notable Outcomes; rewrite that section
and verify its claims against the relevant heartbeats each week.

**Count Now occupancy at the same reporting cutoff.** `Current WIP` is the number of
distinct items in Now, reported as `N/2`, consistent with the limit in
[ADR 0001](../adr/0001-flow-based-cadence.md). List each of those items once under
"In Progress (Now)", including items carried over from prior weeks. Count a promoted
item if it remains in Now, even when work has not started; annotate that status
without reducing the count. An item outside Now at the cutoff does not belong in
that list or count. Describe parked work elsewhere, such as Next Week Focus, if relevant.

Check the final list against current board state and the recorded movements before
counting it. `0/2` is correct only when Now is empty. A Next → Now → Done item appears
under both Promoted and Completed; a Next → Now → Later item appears under Promoted
and Other Moves. Neither remains under In Progress unless it returns to Now before
the cutoff, and any other items still in Now continue to count.

Older heartbeats can contain inconsistent lists or counts; copying them does not
establish a counting convention. In particular, `heartbeat/2026-01-20.md` and
`heartbeat/2026-02-02.md` report `0/2` alongside promotions without recording an exit
from Now. Rebuild the snapshot rather than carrying those inconsistencies forward.

## Creating a Synthesis

1. Copy the [synthesis-template.md](synthesis-template.md)
2. Create `synthesis/YYYY-MM.md` (the prior month — the one being analyzed, not the month you're writing in)
3. Review that month's heartbeats and metrics to fill in:
   - Flow summary and DORA-style metrics
   - What compounded vs. what didn't work
   - Theme analysis and process adjustments
   - Next month's top 3 bets

## Metrics to Track

Following ADR 0001, we track lightweight DORA-style metrics:

- **PR lead time:** Time from PR open to merge (rolling median)
- **Deployment frequency:** How often we publish releases/printables  
- **Change failure rate:** Percentage of PRs requiring revert/hotfix
- **Time to restore:** Duration from broken build detection to fix

These metrics are captured in both heartbeats (snapshot) and synthesis (trends/analysis).

## Board Management

The GitHub Project board follows these principles:

- **Columns:** Now, Next, Later, Blocked, Done
- **WIP Limits:** Now ≤ 2 items (solo maintainer)
- **Pull System:** Only move Next → Now when under WIP limit
- **Issue-driven:** Every change starts with an Issue, PRs link via `Closes #NN`

Heartbeats track board movement; synthesis reviews board health and adjusts WIP limits if needed.
