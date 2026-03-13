# Postmortems

This directory contains blameless postmortems for production incidents affecting ArtVerse.

## Writing a postmortem

Tell Claude Code:

> "run a postmortem on [incident description]"

Claude Code will follow [`POSTMORTEM_WORKFLOW.md`](./POSTMORTEM_WORKFLOW.md) and create a new file here.

## Opening a postmortem issue

Use the [Postmortem GitHub issue template](../../.github/ISSUE_TEMPLATE/postmortem.yml).

## Postmortem trigger criteria

A postmortem is required for any of:
- User-visible downtime or degradation
- Data loss of any kind
- On-call engineer intervention (rollback, rerouting, emergency fix)
- Resolution time above 1 hour
- Monitoring failure (discovered manually, not by an alert)
- Security or credential exposure
- Deploy or config push causing degradation

## Index

| Date | Title | Severity | Trigger | Status |
|------|-------|----------|---------|--------|
| 2026-03-13 | [Admin section code pushed directly to main](./2026-03-13-issue-8-direct-push-to-main.md) | P2 | On-call intervention (rollback) | Draft |

> Update this table when a new postmortem is added, or ask Claude Code to update it.
