# Operations Documentation

This directory contains templates and documentation for On Balance project operations, following the flow-based cadence established in [ADR 0001](../adr/0001-flow-based-cadence.md).

## Workflow Cadence

### Weekly Heartbeat (10 minutes)

- **Purpose:** Track board movement, identify blockers, maintain flow
- **Template:** [heartbeat-template.md](heartbeat-template.md)
- **Schedule:** Every Monday morning
- **Output:** Create `heartbeat/YYYY-MM-DD.md` with current week's status

### Monthly Synthesis (30-45 minutes)  

- **Purpose:** Analyze themes, adjust policies, plan next bets
- **Template:** [synthesis-template.md](synthesis-template.md)
- **Schedule:** First Monday of each month
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
2. Create `heartbeat/YYYY-MM-DD.md` (Monday date)
3. Fill in the template with current week's data:
   - Board movement (completed, in progress, promoted items)
   - Metrics snapshot (PRs, issues, WIP, build status)
   - Notable outcomes and blockers
   - Next week focus areas

## Creating a Synthesis

1. Copy the [synthesis-template.md](synthesis-template.md)
2. Create `synthesis/YYYY-MM.md` (current month)
3. Review the month's heartbeats and metrics to fill in:
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
