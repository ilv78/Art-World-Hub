---
title: "[Short factual title — no names, no drama]"
date: YYYY-MM-DD
severity: P0 | P1 | P2 | P3
status: Draft | In Review | Action Items Open | Final
trigger: "[which trigger criterion applied — e.g. deploy causing degradation, monitoring failure]"
distribution: public | restricted
owner: "[Role, e.g. backend lead]"
participants: "[Comma-separated roles]"
components: "[Comma-separated ArtVerse domains affected]"
incident_state_doc: "[Link to live incident notes / Slack thread / log dump, if available]"
---

# Postmortem: [Title]

> **Status:** Draft — not yet reviewed
> **Severity:** [P0–P3]
> **Distribution:** [Public / Restricted — use Restricted for security incidents]
> **Incident date:** [YYYY-MM-DD HH:MM UTC]
> **Published:** [date]

---

## Executive Summary

_One paragraph. What happened, what broke, how it was resolved, and the single most important preventive action. Written for someone outside the team._

---

## Impact

### User Impact

| Metric | Value |
|--------|-------|
| Duration | [HH:MM — from first symptom to resolution] |
| Users / requests affected | [number or estimate — label estimates explicitly] |
| Features / endpoints affected | [list] |
| Error rate during incident | [e.g. "~40% of /artworks requests returned 503"] |

### System Impact

- [ ] API availability degraded
- [ ] Database access affected
- [ ] 3D museum experience impacted
- [ ] Storage / asset retrieval broken
- [ ] CI/CD pipeline affected
- [ ] Security: credentials or data potentially exposed
- [ ] Other: ___

### Data / Security Impact

_Complete this section for any incident involving data loss, credential exposure, or suspected unauthorized access. Mark N/A if not applicable._

- **Data affected:** [describe data type, scope, and whether loss was temporary or permanent]
- **Credentials potentially exposed:** [list service names — specific secrets go in the restricted section]
- **User data at risk:** [yes / no / unknown]

### Revenue / Business Impact

_If applicable. If unknown, note where data will come from._

---

## What Changed Last

_Before investigating root cause, document any recent changes to the system. ~68% of production outages trace to a binary push or config change (Google SRE Workbook, Appendix C). Complete this section even if the change turned out not to be the root cause._

| Change | Type | Timestamp (UTC) | Notes |
|--------|------|-----------------|-------|
| [e.g. Deploy v1.4.2 to production] | [deploy / config / migration / dependency / infra] | [timestamp] | [correlation to incident start] |
| | | | |

_If no recent changes were identified, state that explicitly: "No deploy, config, or infrastructure changes within [X hours] of the incident start time."_

---

## Timeline

_Chronological. Use UTC timestamps. Be specific — "noticed slowness" is not useful; "p95 latency exceeded 2s on /artworks" is._

| Time (UTC) | Event |
|------------|-------|
| HH:MM | [First symptom / alert fired / user report received] |
| HH:MM | [On-call or engineer notified] |
| HH:MM | [Investigation started] |
| HH:MM | [Most recent change identified — see "What Changed Last"] |
| HH:MM | [Root cause identified] |
| HH:MM | [Mitigation applied] |
| HH:MM | [Service restored / incident closed] |

---

## Root Causes and Trigger

### What Changed Last (Summary)

_One sentence linking the change log to the incident, or explicitly stating there was no recent change._

### Trigger

_The immediate, observable event that started the incident._

### Root Cause Analysis

_Use the format below for each identified failure mode. Real incidents often have multiple contributing causes — document them separately. Never stop analysis at a human action; always go deeper to the system condition that permitted the harm._

```
Failure mode 1: [description]
  Why? → [first-order cause]
  Why? → [second-order cause]
  Why? → [system gap — missing safeguard, design choice, process failure]

Contributing factor: [separate condition that amplified or enabled the failure]
  Why? → [cause]
  Why? → [system gap]
```

### Why Wasn't This Caught Earlier?

_Explicitly address: why did the monitoring, CI tests, staging environment, or review process not prevent or detect this sooner?_

---

## Detection

| Field | Value |
|-------|-------|
| Detection method | [Alert / user report / manual observation] |
| Time from failure start to detection | [duration] |
| Alert that fired (if any) | [alert name / description] |
| Why wasn't it caught sooner? | [honest answer] |

---

## Response and Mitigation

### Immediate Mitigation

_What was the fastest action that reduced user impact? Was rollback available and used?_

**Was rollback triggered?** [Yes / No / Not applicable]
If no: [explain why rollback was not used]

### Full Resolution

_What was required to fully restore normal operation?_

### What Slowed Recovery

_Friction points — process gaps, missing tooling, unclear ownership, slow automation._

- 
- 

---

## Credential and Secret Rotation

_Complete for security incidents. Mark N/A if not applicable._

| Credential / Secret | Service | Status | Owner |
|--------------------|---------|--------|-------|
| [e.g. DATABASE_URL] | PostgreSQL | [Rotated / Pending / Not required] | [role] |
| [e.g. GHCR token] | GitHub Container Registry | [status] | [role] |

---

## Lessons Learned

### What Went Well

_Be specific. "Monitoring worked" is weak; "Alert fired within 90 seconds of first 503" is strong._

- 
- 

### What Went Poorly

_System and process gaps only — no individuals, no blame._

- 
- 

### Where We Got Lucky

_Near-misses: things that could have made this much worse but didn't. Honest acknowledgment of luck is a near-miss register._

- 
- 

---

## Action Items

_Minimum 3 items. Every item must have: description, type, priority, owner placeholder, and tracking issue._

| # | Action Item | Type | Priority | Owner | Issue |
|---|-------------|------|----------|-------|-------|
| 1 | [Specific, testable outcome: verb + object + success criterion] | prevent / mitigate / detect / repair / document | P0 / P1 / P2 | [role] | [#N](https://github.com/ilv78/Art-World-Hub/issues/N) |
| 2 | | | | | |
| 3 | | | | | |

**Action item types:**
- `prevent` — eliminates root cause
- `mitigate` — reduces blast radius if it recurs
- `detect` — catches it faster next time
- `repair` — restores degraded capability
- `document` — captures knowledge to prevent recurrence

---

## Security-Specific Action Items

_Complete for security incidents. Mark N/A if not applicable._

| # | Action Item | Type | Priority | Owner | Issue |
|---|-------------|------|----------|-------|-------|
| 1 | [e.g. Rotate all exposed credentials and revoke old tokens] | repair | P0 | [role] | [#N](https://github.com/ilv78/Art-World-Hub/issues/N) |
| 2 | | | | | |

---

## Review Checklist

_Complete before advancing Status from Draft → In Review._

- [ ] No individual names in failure or root-cause sections
- [ ] Every impact claim has a number or explicit estimate
- [ ] Root cause analysis goes at least 2 levels deep (past the human action, to the system gap)
- [ ] Multiple contributing factors documented separately where present
- [ ] "What Changed Last" section is complete
- [ ] At least one `prevent`-type action item exists
- [ ] Every action item has priority and owner placeholder
- [ ] Timeline is complete and chronological
- [ ] "Why wasn't it caught sooner?" is answered
- [ ] Rollback usage (or non-usage) is documented
- [ ] Glossary covers domain-specific terms
- [ ] Document shared with all incident participants for input

---

## Glossary

_Define any ArtVerse-specific or technical terms. Link to internal docs where relevant._

| Term | Definition |
|------|------------|
| [term] | [definition] |

---

## Appendix

_Optional. Raw logs, graphs, Slack excerpts, supporting data. Link to long-form sources; do not embed large logs inline._

- [Link to Incident State Document / Slack thread]
- [Link to relevant monitoring dashboard snapshot]
- [Link to relevant GitHub issue or PR]
- [Link to deploy that was the trigger, if applicable]
