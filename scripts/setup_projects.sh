#!/usr/bin/env bash
set -euo pipefail

# Requirements: gh CLI (v2.32+), jq
if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI 'gh' is required. See https://cli.github.com" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "'jq' is required for JSON parsing." >&2
  exit 1
fi

TITLE="On Balance — Flow"
OWNER="${GITHUB_OWNER:-}" # optional: set to org name if making org project

echo "Creating (or locating) project: $TITLE"
if [ -n "$OWNER" ]; then
  PROJ_JSON=$(gh project list --owner "$OWNER" --format json)
  PROJ_URL=$(echo "$PROJ_JSON" | jq -r --arg t "$TITLE" '.[] | select(.title==$t) | .url')
  if [ -z "$PROJ_URL" ]; then
    PROJ_URL=$(gh project create --owner "$OWNER" --title "$TITLE" --format json | jq -r '.url')
  fi
else
  PROJ_JSON=$(gh project list --format json)
  PROJ_URL=$(echo "$PROJ_JSON" | jq -r --arg t "$TITLE" '.[] | select(.title==$t) | .url')
  if [ -z "$PROJ_URL" ]; then
    PROJ_URL=$(gh project create --title "$TITLE" --format json | jq -r '.url')
  fi
fi

echo "Project URL: $PROJ_URL"
PROJ_NUMBER=$(echo "$PROJ_URL" | sed -E 's#.*/projects/([0-9]+).*#\1#')

echo "Ensuring fields exist…"
gh project field-create "$PROJ_NUMBER" --name "Status" --data-type SINGLE_SELECT --options "Now,Next,Later,Blocked,Done" >/dev/null || true
gh project field-create "$PROJ_NUMBER" --name "Type" --data-type SINGLE_SELECT --options "Module,Printable,ADR,Infra" >/dev/null || true
gh project field-create "$PROJ_NUMBER" --name "Priority" --data-type SINGLE_SELECT --options "P1,P2,P3" >/dev/null || true

# Determine repo slug
if git rev-parse --is-inside-work-tree >/dev-null 2>&1; then
  REMOTE_URL=$(git config --get remote.origin.url || echo "")
else
  REMOTE_URL=""
fi
if [ -n "$REMOTE_URL" ]; then
  REPO=$(echo "$REMOTE_URL" | sed -E 's#.*github.com[:/](.*)\.git#\1#')
else
  echo "No git remote found. You can set REPO=owner/name and re-run."
  exit 0
fi

echo "Creating seed issues in $REPO and adding to project…"
make_issue() {
  local title="$1"; shift
  local body="$1"; shift
  local label="$1"; shift
  gh issue create --repo "$REPO" --title "$title" --body "$body" --label "$label" >/dev/null
}

make_issue "ADR: Flow-based cadence over sprints" "Write ADR choosing Kanban flow with weekly heartbeat + monthly synthesis." "ADR"
make_issue "Flip LICENSE to CC BY-SA 4.0 (text)" "Replace LICENSE with CC BY-SA 4.0 legal text." "Infra"
make_issue "Choose code license (MIT vs Apache-2.0)" "Recommend Apache-2.0 for patent grant; otherwise MIT." "Infra"
make_issue "Create repo + initial push" "Initialize git, create remote, push main branch." "Infra"
make_issue "Buy domain and connect Netlify" "Select domain (e.g., on-balance.org or onbalanceproject.com), connect to Netlify." "Infra"
make_issue "Netlify feedback form stub" "Add simple anonymous feedback form page and link from Module 3." "Infra"
make_issue "Pilot Module 3 with 3–5 readers" "Use embedded measures; summarize results in evidence/." "Module"
make_issue "Update Module 3 to v1.1.0" "Apply feedback from docx; bump version and CHANGELOG." "Module"

# Add all open issues to the project
gh issue list --repo "$REPO" --state open --json number | jq -r '.[].number' | while read -r num; do
  gh project item-add "$PROJ_NUMBER" --url "https://github.com/$REPO/issues/$num" >/dev/null || true
done

echo "Done. Open the project: $PROJ_URL"
