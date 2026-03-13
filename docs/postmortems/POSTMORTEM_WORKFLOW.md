# Postmortem Workflow Spec for Claude Code

> **How to use this file:** Add a reference to it in your root `CLAUDE.md` so Claude Code picks it up on every session. When you say "run a postmortem on X" or "write a postmortem for incident Y", Claude Code will follow this workflow.

---

## Trigger Phrases

Claude Code will enter the postmortem workflow when the developer says any of:

- `"run a postmortem on [incident/event]"`
- `"write a postmortem for [description]"`
- `"postmortem: [description]"`
- `"conduct a postmortem"`

---

## Core Philosophy (Non-Negotiable)

Before any writing begins, Claude Code operates under these axioms — sourced directly from Google SRE practice:

1. **Blameless by design.** Systems fail, not people. No individual names appear in failure or root-cause sections — only roles and component names.
2. **Action items are the product.** A postmortem without follow-through is indistinguishable from silence. Every postmortem must produce at least one `P0` or `P1` action item.
3. **Publish fast, publish wide.** Draft within 48 hours of resolution. Delay erodes memory and trust. *Exception: security incidents — see Security Incident Mode.*
4. **Measure or it didn't happen.** If impact cannot be quantified, produce a best-effort estimate and label it as such.
5. **Stop the bleeding before root-causing.** The postmortem is written *after* service is restored, not during the incident. Claude Code should ask: "Is the service restored?" before drafting anything.
6. **Multiple causes, not one villain.** Real failures have several contributing factors. Stopping at the proximate cause ("engineer ran the wrong command") is always wrong. The question is: what system condition *permitted* that to cause harm? And was there only one such condition?

---

## When to Write a Postmortem (Trigger Criteria)

Define these *before* an incident happens, not during one. A postmortem is required for any event meeting one or more of the following:

| Trigger | Notes |
|---------|-------|
| User-visible downtime or degradation | Any endpoint degraded beyond baseline for >5 minutes |
| Data loss of any kind | Including partial, temporary, or recoverable loss |
| On-call engineer intervention | Rollback, manual rerouting, emergency fix — any unplanned manual action |
| Resolution time above 1 hour | Even if users were not visibly affected |
| Monitoring failure | Problem was discovered manually, not by an alert — the absence of an alert IS the incident |
| Security or credential exposure | Suspected unauthorized access, exposed secrets, data breach |
| Any stakeholder request | Any team member may request a postmortem for any event |
| **Deploy or config push causing degradation** | **Binary/config pushes cause ~68% of outages at Google (37% binary, 31% config). If a deploy broke something, always write a postmortem.** |

> **ArtVerse-specific:** Any GitHub Actions workflow failure causing a broken production state, or any triggered rollback (automatic or manual), automatically qualifies.

---

## Two-Phase Model: Incident → Postmortem

Google SRE maintains a strict distinction between two separate artifacts:

```
Phase 1 (DURING incident):    Incident State Document  ← live, messy, real-time
                                         ↓  feeds into
Phase 2 (AFTER resolution):   Postmortem Document      ← structured, analytical, permanent
```

**Claude Code operates in Phase 2 only.** If asked during an active incident, respond: *"Is the service restored? The postmortem is written after resolution. During the incident, focus on: stop the bleeding → preserve evidence (logs, screenshots) → restore service."*

If an Incident State Document exists (chat thread, notes, log dump), ask for it before drafting — it dramatically improves postmortem accuracy.

---

## Workflow Steps

### Step 1 — Gather Context

Claude Code asks for the following in a single message:

1. **Incident title** — short, factual (e.g., "DB connection pool exhaustion caused 503s on /artworks")
2. **Incident date and duration** — start + end timestamps, ISO format preferred
3. **Severity** — P0 (total outage), P1 (major degradation), P2 (partial), P3 (minor)
4. **Postmortem trigger** — which criterion from the table above was met
5. **Roles involved** — roles only, no names (e.g., "on-call engineer", "backend lead")
6. **What changed last before the incident started?** — recent deploy, config change, schema migration, dependency update, environment variable change. *This is the single highest-yield starting question: ~68% of outages trace to a push or config change.*
7. **Detection method** — alert / user report / manual observation
8. **Immediate mitigation** — what stopped the bleeding?
9. **Is this a security incident?** — credential exposure, unauthorized access, suspected compromise? If yes, see **Security Incident Mode** before proceeding.
10. **Supporting material** — logs, error messages, timeline notes, link to Incident State Document if one exists.

For any unknown item, Claude Code writes: `UNKNOWN — fill in before publishing`. It never invents data.

---

### Step 2 — Draft the Document

Create the file at:

```
docs/postmortems/YYYY-MM-DD-<slug>.md
```

Fill it using [POSTMORTEM_TEMPLATE.md](./POSTMORTEM_TEMPLATE.md).

**Writing rules:**

| Rule | Why |
|------|-----|
| Factual, neutral language only | Emotional language destroys psychological safety |
| No individual names in failure sections | Blameless culture only works if it's consistent |
| Every impact claim needs a number or an estimate | Unmeasured impact cannot be confirmed as fixed |
| Root cause goes at least 2 levels deep | Past the human action, to the system gap |
| Document multiple contributing causes separately | Forcing a single root cause oversimplifies real failures |
| "What changed last" must always be answered | Deploy/config = top failure triggers; never skip this |
| Timeline is strictly chronological | Readers reconstruct the incident; disorder adds cognitive load |

---

### Step 3 — Root Cause Analysis

Use a two-part approach:

#### Part A: "What changed last?" (highest-yield, always first)

Before any 5-Whys work, explicitly correlate the incident start time with the change log. Was there a recent deploy, config push, schema migration, environment variable update, or dependency change? If yes, this is likely the trigger. Document it even if it's not the root cause.

#### Part B: Multi-Hypothesis Analysis

For each identified failure mode, run a 5-Whys chain. Real failures often have **multiple independent contributing causes** — document each as a separate chain. Don't force a single narrative.

```
Failure mode 1: [description]
  Why? → [first-order cause]
  Why? → [second-order cause — usually the system gap]
  Why? → [third-order cause — the design decision that permitted the gap]

Contributing factor: [separate condition that amplified the failure]
  Why? → ...
```

Stop each chain at a **system gap** — a missing safeguard, a design choice, or a process failure that a code review would flag. Never stop at a human action.

> *Per SRE Book Ch 12: plan for a future where everyone is exactly as fallible as they are today. Trying to "fix" people is less reliable than fixing systems.*

---

### Step 4 — Generate Action Items

Produce a minimum of **3 action items** across these types:

| Type | Meaning |
|------|---------|
| `prevent` | Eliminates the root cause |
| `mitigate` | Reduces blast radius if it recurs |
| `detect` | Catches it faster next time |
| `repair` | Restores a degraded system capability |
| `document` | Captures knowledge to prevent confusion |

**Each item must have:**
- Specific, testable description: verb + object + success criterion
- Type (above)
- Priority: `P0`, `P1`, or `P2`
- Role/owner placeholder: `[role]`
- Tracking issue placeholder: `[GH-???]`

**From Google's VP of 24/7 Operations:** *"A postmortem without subsequent action is indistinguishable from no postmortem. All postmortems following a user-affecting outage must have at least one P[01] item."*

Mark any action item that needs more context with `⚠️ NEEDS DETAIL`.

### Step 4b — Create GitHub Issues for Action Items

After the postmortem is reviewed and approved, create a GitHub issue for each action item that does not already have one. **Every issue must include the `postmortem` label** in addition to its regular priority and category labels. This ensures all postmortem-driven work is traceable.

```bash
gh issue create --title "<action item title>" \
  --label "postmortem" --label "<priority label>" --label "<category label>" \
  --body "From postmortem: docs/postmortems/YYYY-MM-DD-slug.md — Action Item #N ..."
```

After creating all issues, update the postmortem document to replace `[GH-???]` placeholders with the real issue numbers.

---

### Step 5 — Self-Review Checklist

Before presenting the draft, run this checklist and append a `## Review Status` section:

- [ ] No individual names in failure or root-cause sections
- [ ] Every impact claim has a number or explicit estimate
- [ ] Root cause analysis goes at least 2 levels deep (past the human action)
- [ ] Multiple contributing factors documented where present
- [ ] "What changed last" explicitly investigated and documented
- [ ] At least one `prevent`-type action item
- [ ] Every action item has a priority and owner placeholder
- [ ] Key incident data collected for posterity (timestamps, metrics, error messages)
- [ ] Timeline is complete and chronological
- [ ] Glossary covers domain-specific terms
- [ ] A reader unfamiliar with ArtVerse could understand what happened
- [ ] File saved to `docs/postmortems/YYYY-MM-DD-<slug>.md`

Report any failed checks to the developer before finishing.

---

### Step 6 — Commit the Draft

Commit message:

```
docs(postmortem): add draft postmortem for [incident title]

Severity: [P0/P1/P2/P3]
Trigger: [which trigger criterion applied]
Date: [YYYY-MM-DD]
Status: Draft — pending review and action item tracking
```

Do **not** push. The developer reviews the diff, assigns real owners and GitHub issue numbers, then pushes.

---

## Security Incident Mode

> Activate when the incident involved **credential exposure, suspected unauthorized access, data breach, or any compromise** — not just a reliability failure.

Security incidents require fundamentally different handling. Source: *Building Secure and Reliable Systems* (Google, 2020), Chapters 17–18.

| Aspect | Reliability Incident | Security Incident |
|--------|---------------------|-------------------|
| Distribution | Share as widely as possible | **Restrict until investigation completes** |
| Initial audience | All engineers | Incident response roles only |
| Recovery steps | Restore service | Restore service + rotate credentials + sanitize data |
| Root cause framing | System gap that permitted the failure | System gap that permitted the compromise + attacker methodology |
| Action items | Standard types | Must include credential rotation and access review |

**If security incident mode is active, Claude Code must:**

1. Add a `⚠️ SECURITY INCIDENT` banner at the top of the document
2. Set `distribution: restricted` in the frontmatter
3. Add a `## Credential and Secret Rotation` section listing all credentials, tokens, and secrets that were potentially exposed and require rotation
4. Add a `## Security-Specific Action Items` section separate from reliability action items
5. **Not commit the file** until the developer explicitly confirms it is safe to do so
6. Not add the postmortem to the public `docs/postmortems/README.md` index until instructed

---

## Postmortem Lifecycle States

| State | Meaning | Who advances it |
|-------|---------|----------------|
| `Draft` | Document created, not yet reviewed | Developer reviews |
| `In Review` | Shared with all incident participants for input | Reviewer signs off |
| `Action Items Open` | Review complete; GitHub issues filed per action item | Action item owner |
| `Final` | All items closed or explicitly deferred with rationale | Lead engineer |

**An unreviewed postmortem is indistinguishable from no postmortem.** The `Status:` field must always reflect the actual state.

---

## ArtVerse-Specific Failure Domains

When conducting postmortems for ArtVerse incidents, use this table as a guide for root cause investigation. **Investigate the ⭐ domains first — deploy and config changes cause the majority of outages.**

| Domain | Components | Primary failure modes | Priority |
|--------|-----------|----------------------|----------|
| **CI/CD pipeline** | GitHub Actions, GHCR, deploy scripts, rollback mechanism | Bad deploy reaching prod, rollback not triggering, broken image build, wrong env vars | ⭐ First |
| **Infrastructure config** | Docker Compose, environment variables, VPS isolation, Docker networks | Env var drift between dev/prod, port conflicts, volume permissions, network misconfiguration | ⭐ First |
| **Data layer** | PostgreSQL via Drizzle ORM, DatabaseStorage singleton, migrations | Connection pool exhaustion, schema migration failures, singleton state corruption, migration-deploy race | Second |
| **API layer** | Express routes, auth middleware, rate limiting | 5xx cascades, auth token mishandling, N+1 queries, unhandled promise rejections | Second |
| **3D Experience** | Three.js museum scene, asset streaming | Asset loading failures, memory leaks in scene lifecycle, WebGL context loss | Third |
| **Storage** | Artwork file storage, IPFS references | Upload failures, broken asset references, storage quota exhaustion | Third |

**Rollback as evidence:** ArtVerse has rollback built into the CI/CD pipeline. If rollback was *not* triggered during an incident, document why — was it unneeded, unavailable, or not attempted? This should always appear in Lessons Learned.

---

## Anti-Patterns to Reject

Claude Code must flag and refuse to include any of:

- Individual names in failure or root-cause sections
- Root cause analysis that ends at a human action without going deeper
- Vague action items: "improve monitoring", "fix the bug", "train the team"
- Action items without priority or owner placeholder
- Emotional language ("disaster", "catastrophic failure", "unbelievable")
- Impact sections with no numbers and no estimate attempt
- A single clean root cause when multiple contributing factors were clearly present

---

*Grounded in: Google SRE Book (Ch 12 Effective Troubleshooting, Ch 14 Managing Incidents, Ch 15 Postmortem Culture, Appendix D Example Postmortem), Google SRE Workbook (Ch 10, Appendix C Postmortem Analysis Data), and Building Secure and Reliable Systems (Ch 17–18).*
