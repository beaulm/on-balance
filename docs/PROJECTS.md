# GitHub Projects — Now/Next/Later Board

Use GitHub Projects (beta) to manage flow (no fixed sprints).

## Quick start

1. Install GitHub CLI: <https://cli.github.com>
2. Authenticate: `gh auth login`
3. Ensure `jq` is installed for JSON parsing: `sudo apt install -y jq` (Linux) or `brew install jq` (macOS)
4. Run the setup script:

```bash
bash scripts/setup_projects.sh
```

The script creates:

- A project named **On Balance — Flow** with fields: `Status` (Now/Next/Later/Blocked/Done), `Type` (Module, Printable, ADR, Infra), and `Priority` (P1/P2/P3).
- Seeds initial issues and adds them to the project.
