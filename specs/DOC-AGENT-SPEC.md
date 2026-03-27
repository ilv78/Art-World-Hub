# Documentation Culture Agent — Specification

**Version:** 1.0  
**Owner:** Architecture / DevOps  
**Location in repo:** `specs/DOC-AGENT-SPEC.md`  
**Status:** Active

---

## 1. Purpose & Philosophy

This document specifies the behavior of a Claude-powered Documentation Agent whose job is to **build, enforce, and continuously validate a documentation culture** across the ArtVerse codebase.

The agent operates on a single guiding principle:

> **Documentation is infrastructure, not paperwork.** It is the map by which every developer — human or AI — navigates the codebase. A stale or missing map causes worse decisions than no map at all.

The agent has two modes:
- **Audit Mode** — periodic inspection of the `specs/` folder and codebase for coverage gaps, staleness, and policy violations.
- **Enforce Mode** — triggered on Pull Requests and pushes to `main`, blocking merges if critical documentation gates are not met.

---

## 2. Document Taxonomy

All documentation lives under `specs/`. The following structure is **mandatory**. The agent validates this structure exists and is populated.

```
specs/
├── architecture/
│   ├── OVERVIEW.md              # System-level diagram and narrative
│   ├── ADR/                     # Architecture Decision Records
│   │   └── ADR-XXXX-title.md   # One file per decision
│   └── DATA-MODEL.md            # Database schema narrative (linked to Drizzle schema)
│
├── features/
│   └── <feature-name>/
│       ├── SPEC.md              # Functional specification
│       └── CHANGELOG.md         # Feature-level change log
│
├── workflows/
│   ├── LOCAL-DEV.md             # How to run the project locally
│   ├── CI-CD.md                 # Pipeline explanation and gates
│   └── DEPLOYMENT.md            # VPS deployment steps and rollback
│
├── decisions/
│   └── DECISION-LOG.md          # Lightweight log for minor decisions (not ADR-worthy)
│
└── DOC-AGENT-SPEC.md            # This file
```

### 2.1 File Completeness Rules

Every document must contain, at minimum:

| Field | Required In |
|---|---|
| `# Title` (H1) | All files |
| `**Status:**` (Draft / Active / Deprecated) | All files |
| `**Last Updated:**` | All files |
| `**Owner:**` | SPEC.md, ADR, OVERVIEW, DATA-MODEL |
| `## Context` section | ADR files |
| `## Decision` section | ADR files |
| `## Consequences` section | ADR files |

---

## 3. Validation Rules

The agent enforces rules at three severity levels: **ERROR** (blocks merge), **WARNING** (annotates PR), **INFO** (weekly report only).

### 3.1 Structure Rules (ERROR)

| Rule ID | Description |
|---|---|
| S-001 | `specs/architecture/OVERVIEW.md` must exist and be non-empty |
| S-002 | `specs/workflows/LOCAL-DEV.md` must exist and be non-empty |
| S-003 | `specs/workflows/CI-CD.md` must exist and be non-empty |
| S-004 | Every ADR file must follow naming pattern `ADR-XXXX-*.md` |
| S-006 | `CLAUDE.md` must exist at the repo root |

### 3.2 Staleness Rules (WARNING)

| Rule ID | Description | Threshold |
|---|---|---|
| ST-001 | `specs/architecture/DATA-MODEL.md` not updated after Drizzle schema change | 7 days |
| ST-002 | Any Active `SPEC.md` not touched in | 90 days |
| ST-003 | `OVERVIEW.md` not updated after a new feature SPEC.md is added | 14 days |
| ST-004 | `CI-CD.md` not updated after changes to `.github/workflows/` | 7 days |
| ST-005 | `DEPLOYMENT.md` not updated after changes to `Dockerfile` or `docker-compose.yml` | 7 days |

### 3.3 Consistency Rules (ERROR on main, WARNING on feature branch)

| Rule ID | Description |
|---|---|
| C-001 | A PR that adds a new database migration must reference a DATA-MODEL update or ADR |
| C-002 | A PR that introduces a new top-level Express route must have a corresponding SPEC.md entry or feature spec |
| C-003 | A PR that changes `CLAUDE.md` must have an entry in `specs/decisions/DECISION-LOG.md` |
| C-004 | A PR marked `breaking-change` in its title must have an ADR linked in the PR description |

### 3.4 Quality Rules (INFO)

| Rule ID | Description |
|---|---|
| Q-001 | SPEC.md files with fewer than 100 words are flagged as stubs |
| Q-002 | ADR files missing `## Consequences` section |
| Q-003 | Any unfinished-work placeholder (to-do / to-be-determined) in an Active document |
| Q-004 | Broken internal links between spec files |

---

## 4. Agent Behavior

### 4.1 Trigger Conditions

| Trigger | Mode | Scope |
|---|---|---|
| Scheduled cron (weekly, Monday 08:00 UTC) | Audit | Full `specs/` tree + codebase consistency |
| PR opened or updated | Enforce | Changed files + consistency rules against PR diff |
| Push to `main` | Enforce | Full structure check (S-rules) + staleness snapshot |
| Manual dispatch via `workflow_dispatch` | Audit | Full scan with verbose output |

### 4.2 Audit Mode — Step-by-Step Behavior

```
1. Walk the full `specs/` directory tree
2. For each file: check completeness fields (Section 2.1)
3. Cross-reference git log: compute days since last commit per file
4. Cross-reference codebase: detect schema changes, route additions, Docker changes
5. Apply staleness rules (ST-*) against the computed deltas
6. Apply quality rules (Q-*)
7. Compile report → open GitHub Issue titled:
   "📋 Docs Audit: [date] — [N errors, M warnings, P info]"
8. Assign issue to repo owner
9. Label issue: `docs-audit`
```

### 4.3 Enforce Mode — Step-by-Step Behavior

```
1. Detect changed files in the PR diff
2. Apply structure rules (S-*) — any ERROR → post PR comment + set check status FAILED
3. Apply consistency rules (C-*) against PR diff and linked specs
4. If any ERROR: block merge, post inline PR comment on the offending file
5. If only WARNINGs: post PR comment, allow merge with warning banner
6. Post summary comment using the standard template (Section 4.4)
```

### 4.4 Standard PR Comment Template

```markdown
## 📋 Documentation Agent Report

| Severity | Count |
|---|---|
| 🔴 Errors (blocking) | N |
| 🟡 Warnings | M |
| 🟢 Info | P |

### Errors (must fix before merge)
- [ ] [C-001] Migration `0012_add_artist_table` detected but DATA-MODEL.md not updated. 
      Update `specs/architecture/DATA-MODEL.md` or link an ADR.

### Warnings
- [ ] [ST-004] `specs/workflows/CI-CD.md` last updated 9 days ago.
      `.github/workflows/deploy.yml` was modified in this PR.

---
_Documentation Agent · [View Full Spec](specs/DOC-AGENT-SPEC.md)_
```

---

## 5. GitHub Actions Integration

### 5.1 Workflow File Location

```
.github/workflows/doc-agent.yml
```

### 5.2 Workflow Skeleton

```yaml
name: Documentation Agent

on:
  pull_request:
    types: [opened, synchronize, reopened]
  push:
    branches: [main]
  schedule:
    - cron: '0 8 * * 1'   # Weekly Monday 08:00 UTC
  workflow_dispatch:

jobs:
  doc-audit:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
      pull-requests: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0          # Full history needed for staleness checks

      - name: Run Documentation Agent
        uses: anthropics/claude-code-action@v1    # or your custom runner
        with:
          prompt_file: .github/prompts/doc-agent-prompt.md
          context_files: |
            specs/DOC-AGENT-SPEC.md
            CLAUDE.md
          allowed_tools: "Bash,FileRead,GitLog,GitDiff,CreateIssue,CreatePRComment"
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### 5.3 Claude Code Agent Prompt File

Location: `.github/prompts/doc-agent-prompt.md`

```markdown
You are the ArtVerse Documentation Agent. Your role is defined entirely in 
`specs/DOC-AGENT-SPEC.md`. Read it first and follow it exactly.

## Your current trigger:
MODE: {{TRIGGER_MODE}}   # AUDIT or ENFORCE
PR_DIFF: {{PR_DIFF}}     # present only in ENFORCE mode

## Constraints:
- Never modify source code
- Never modify existing spec files without explicit human approval
- You MAY create new stub files when a gap is detected (S-rules)
- You MAY open GitHub Issues and post PR comments
- All output must follow the templates defined in Section 4.4
- When in doubt about a rule's applicability, post a WARNING, not an ERROR
```

---

## 6. CLAUDE.md Integration

The following section must be present in the root `CLAUDE.md` to make the 
documentation culture visible to every Claude Code session:

```markdown
## Documentation Culture

All documentation lives in `specs/`. Before starting any task:
1. Read `specs/DOC-AGENT-SPEC.md` to understand what must be documented.
2. If adding a new feature → create or update `specs/features/<name>/SPEC.md`.
3. If changing the database schema → update `specs/architecture/DATA-MODEL.md`.
4. If making an architectural decision → create `specs/architecture/ADR/ADR-XXXX.md`.

The Documentation Agent enforces these rules on every PR.
Undocumented changes will block merge.
```

---

## 7. Document Templates

### 7.1 ADR Template (`specs/architecture/ADR/ADR-XXXX-title.md`)

```markdown
# ADR-XXXX: [Decision Title]

**Status:** Draft | Active | Superseded by ADR-XXXX  
**Date:** YYYY-MM-DD  
**Owner:** [name]

## Context
What problem or situation prompted this decision?

## Options Considered
1. Option A — pros / cons
2. Option B — pros / cons

## Decision
What was decided and why.

## Consequences
- Positive: ...
- Negative: ...
- Risks: ...

## References
- [Link to relevant PR, issue, or spec]
```

### 7.2 Feature Spec Template (`specs/features/<name>/SPEC.md`)

```markdown
# Feature: [Feature Name]

**Status:** Draft | Active | Deprecated  
**Last Updated:** YYYY-MM-DD  
**Owner:** [name]

## Summary
One paragraph description of what this feature does.

## User Story
As a [role], I want [capability], so that [value].

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Technical Design
Architecture notes, key components, data flow.

## Dependencies
List of other features or specs this depends on.

## Open Questions
- [ ] Question 1
```

---

## 8. Agent Limitations & Escalation

| Limitation | Escalation Path |
|---|---|
| Agent cannot determine *intent* behind a code change | Human reviewer is authoritative; agent raises WARNING, not ERROR |
| Agent cannot validate technical accuracy of a spec | Quarterly human architecture review |
| Agent cannot infer which ADR applies to a refactor | Developer must link ADR in PR description |
| False positives on staleness rules | Developer may add `docs-skip: ST-XXX` label to PR with justification |

---

## 9. Maintenance of This Spec

This document is itself subject to the documentation culture it enforces.

- Any change to validation rules requires a `DECISION-LOG.md` entry.
- Any addition of a new rule category requires an ADR.
- This file must be reviewed and its `Last Updated` field refreshed at minimum quarterly.

**Last Updated:** 2026-03-12  
**Owner:** Architecture
