# Conventional Commits

This document outlines the conventional commit standards for the On Balance project.

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to our CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Scopes

Common scopes used in this project:
- **adr**: Architectural Decision Records
- **pdf**: PDF generation/export functionality
- **ci**: Continuous Integration
- **license**: Licensing changes
- **docs**: Documentation
- **PR**: Pull Request templates

### Examples

```
feat(modules): add attention-as-lever practice module

docs(adr): adopt flow-based cadence over sprints

chore(pdf): add pdf to CI

fix(ci): add necessary packages for building printables

docs(license): clarify dual licensing
```

## Branch Naming Convention

Branch names should follow this pattern:
```
<type>/<descriptive-name>-<issue-number>
```

### Examples
- `docs/conventional-commits-23`
- `feat/attention-module-12`
- `fix/pdf-export-issue-45`
- `chore/update-dependencies-78`

## Git Commands for History Cleanup

If you need to clean up commit messages to follow conventional commits:

### Interactive Rebase (for recent commits)
```bash
# Rebase last 5 commits interactively
git rebase -i HEAD~5

# In the editor, change 'pick' to 'reword' for commits to modify
# Save and exit, then update each commit message
```

### Amend Last Commit Message
```bash
git commit --amend -m "feat(modules): add new practice module"
```

### Filter Branch (for extensive history rewrite)
```bash
# Create backup branch first
git checkout -b backup-main

# Return to main and filter
git checkout main
git filter-branch --msg-filter '
  msg=$(cat)
  if [[ "$msg" == Add* ]]; then
    echo "feat: ${msg/Add/add}"
  elif [[ "$msg" == Fix* ]]; then
    echo "fix: ${msg/Fix/fix}"
  else
    echo "$msg"
  fi
' HEAD
```

### Check Commit Messages
```bash
# View recent commits to verify format
git log --oneline -10

# Check all commits match pattern
git log --pretty=format:"%h %s" | grep -v "^[a-f0-9]\{7\} \(feat\|fix\|docs\|style\|refactor\|perf\|test\|build\|ci\|chore\|revert\)"
```

## Pre-commit Hooks

To automatically enforce conventional commits, consider adding a commit-msg hook:

```bash
#!/bin/bash
# .git/hooks/commit-msg

commit_regex='^(revert: )?(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\(.+\))?: .{1,50}'

if ! grep -qE "$commit_regex" "$1"; then
    echo "Invalid commit message format!"
    echo "Format: type[scope]: description"
    echo "Example: feat(modules): add new practice module"
    exit 1
fi
```