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

1. Copy the [heartbeat-template.md](heartbeat-template.md)
2. Create `heartbeat/YYYY-MM-DD.md` (Sunday date)
3. Fill in the template with current week's data:
   - Board movement (completed, in progress, promoted items)
   - Metrics snapshot (PRs, issues, WIP, build status)
   - Notable outcomes and blockers
   - Next week focus areas

### Consistency rules

Heartbeats are written by opening the prior week's file, so wording carries forward
unless it is deliberately re-checked. Three rules keep the record internally consistent:

- **Board Movement holds state, not trends.** A claim like "Nth consecutive week" is a
  trend, and trend prose parked in a state field survives copy-forward unnoticed — the
  numbers around it get refreshed, the sentence does not. Put streaks in Notable
  Outcomes, which is rewritten each week.
- **"In Progress (Now)" and "Promoted (Next → Now)" must agree** about whether the Now
  slot is occupied. If something is promoted, "In Progress" cannot also report the slot
  empty.
- **WIP counts started work.** A promoted-but-not-yet-started item counts `0/2` (see
  `heartbeat/2026-01-20.md`, `heartbeat/2026-02-02.md`); it counts toward WIP once work
  begins (`heartbeat/2026-03-30.md`). The limit itself is under
  [Board Management](#board-management).

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

- **Columns:** Now → Next → Later → Done
- **WIP Limits:** Now ≤ 2 items (solo maintainer)
- **Pull System:** Only move Next → Now when under WIP limit
- **Issue-driven:** Every change starts with an Issue, PRs link via `Closes #NN`

Heartbeats track board movement; synthesis reviews board health and adjusts WIP limits if needed.
