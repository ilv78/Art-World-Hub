# Multi-Device Development Workflow

**Status:** Active
**Last Updated:** 2026-04-10
**Issue:** [#444](https://github.com/ilv78/Art-World-Hub/issues/444)

## Overview

ArtVerse development happens on two machines:

- **Laptop** (`Dell`) — primary, behind NAT, intermittently online
- **VPS** (`liviu@<dev-vps>:/home/liviu/app`) — always-on personal dev account on a **separate Webdock VPS** from the production deploy host. The concrete hostname is kept out of the public spec; see local memory or `~/.ssh/config`.

Because the laptop is not reliably reachable inbound, **all state synchronization flows through GitHub** (`origin = github.com/ilv78/Art-World-Hub`). There is no direct laptop ↔ VPS rsync.

This document defines a deterministic handoff protocol so work — including a dirty working tree — can be paused on one machine and resumed on the other with no manual fiddling.

## Three keywords

The developer drives the workflow with three keywords. Both Claude instances (laptop + VPS) read this spec and follow it identically.

| Keyword | When to use |
|---|---|
| `park` | "I'm stopping here. I want to continue on the other machine." |
| `resume` | "I just sat down at the other machine. Get me back to where I was." |
| `sync` | "I finished work on the other machine and it's merged. Bring this one up to date." |

Recognize aliases:

- `park` ≡ "park it" ≡ "handoff"
- `resume` ≡ "pick up" ≡ "continue"
- `sync` ≡ "catch up"

---

## `park` — pause and hand off

### Preconditions

- Working tree may be clean or dirty.
- Current branch is **not** `main`. If it is, refuse and ask the developer to name a feature branch first (per the no-direct-push rule, incident #97).
- `origin` remote configured and reachable.

### Procedure

1. Confirm the current branch with `git branch --show-current`. If `main`, refuse and stop.
2. If the working tree is clean **and** HEAD is already pushed to origin: nothing to park. Tell the developer "nothing to park, working tree is clean and already pushed". Stop.
3. Stage everything: `git add -A` (catches tracked + untracked, respects `.gitignore`).
4. Build the structured commit message — see [WIP commit format](#wip-commit-format) below. Extract the "what was I doing / what's next" content from the conversation context; ask the developer if it's not obvious.
5. Commit with a HEREDOC so the body's newlines are preserved.
6. Push: `git push -u origin <branch>`.
7. Report the SHA, branch, and one-line summary so the developer can confirm the park is safely on GitHub before closing the lid.

### WIP commit format

**Subject:** `[WIP-PARK] <branch> — <one-line summary>`

**Body:**

```
Issue: #NNN (or "none")
Machine: <hostname>
Was doing: <2-3 sentences>
Status: working | broken | mid-refactor
Next step: <what the other machine should do first>
Files in focus:
  - path:line — note
  - path:line — note
Notes: <anything else the other Claude needs>
```

The marker `[WIP-PARK]` in the subject is what `resume` searches for. **Do not change it.**

---

## `resume` — pick up on the other machine

### Preconditions

- Working tree is **clean**. If dirty, refuse and ask the developer either to commit/`park` first or to explicitly confirm overwriting. The protocol is conservative — never silently destroy local edits.
- `origin` reachable.

### Procedure

1. `git fetch --all --prune`.
2. Find the most recent parked commit across all remote branches:
   ```
   git log --all --remotes --grep='\[WIP-PARK\]' --format='%H %D %s' -1
   ```
3. If no parked commit found, report "no parked commit found" and offer to run `sync` instead. Stop.
4. Extract the branch from the commit's refs. If the parked commit appears on multiple branches, pick the one whose tip **is** the parked commit (the most recent park).
5. **Refuse-loud check:** confirm the parked commit is the tip of its branch on the remote. If newer commits sit above it, something is off (CI bot? other-machine resume already happened?). Stop and brief the developer instead of mutating state.
6. Check out the branch: `git checkout <branch>` (create a local tracking branch if needed).
7. Fast-forward to the remote: `git pull --ff-only`.
8. Read the commit message body and extract the structured fields (Was doing, Next step, Files in focus, Notes).
9. **Unpack the WIP commit:** `git reset --mixed HEAD~1`. The working tree is now dirty exactly as the developer left it on the other machine; the WIP commit is gone from local history.
10. **Clean origin too:** `git push --force-with-lease origin <branch>`. This removes the WIP commit from GitHub so a future `resume` doesn't double-pop it. `--force-with-lease` (not `--force`) protects against the case where another commit slipped in since the fetch.
11. Brief the developer in a short paragraph:

    > You parked from `<machine>` at `<timestamp>`. You were on issue #N: `<was doing>`. Status: `<status>`. Suggested next step: `<next step>`. Files in focus: `<list>`. Working tree restored, ready to continue.

### Why mixed reset + force-with-lease

- `--mixed` keeps the working tree contents but resets the index, mirroring "I never committed these changes" — what the developer expects.
- `--force-with-lease` is safe: if the remote branch has moved since the fetch (e.g. someone pushed a new commit), the push fails and we stop instead of clobbering concurrent work.

---

## `sync` — catch up after work merged on the other machine

### Preconditions

- Working tree is **clean**. If dirty, offer to `park` first, then continue.

### Procedure

1. `git fetch --all --prune`.
2. Switch to `main`: `git checkout main`.
3. Fast-forward: `git pull --ff-only`. If FF fails (local commits on main), refuse and brief the developer — there should never be local commits on main per the no-direct-push rule.
4. List remote feature branches with new commits compared to local (`git branch -r --no-merged main`). Report them.
5. List local branches whose upstream is gone — merged & deleted on origin (`git branch -vv | awk '/: gone]/{print $1}'`). Offer to delete them.
6. If a feature branch was checked out before `sync`, offer to rebase it onto fresh `main`: `git rebase main`. Surface conflicts; do not auto-resolve.
7. Brief the developer:

    > main is up to date at `<SHA>`. `<N>` feature branches have new commits on origin. `<M>` stale local branches can be cleaned up.

---

## Edge cases

### Parking on `main`
Refuse hard. Direct work on `main` is forbidden by project policy (incident #97). Tell the developer to make a feature branch first: `git checkout -b feature/<slug>`.

### Resuming with a dirty working tree
Refuse. Show what's dirty (`git status -s`) and ask the developer to either commit/`park` the local changes first, **or** explicitly confirm they want to discard them. Never silently overwrite.

### No parked commit found during `resume`
Tell the developer, then offer to either run `sync` (catch up to main) or check out a specific branch by name.

### Parked commit is NOT at branch tip on origin
Something has happened on the remote since the park (CI commit, double-resume, hand-edit). Stop. Brief the developer with what's between the parked commit and the branch tip and let them decide.

### Multiple parked branches
The developer parked branch A on the laptop and branch B on the VPS without resuming in between. The `git log` search returns both. Pick the most recent by commit timestamp and brief the developer that another parked branch (B) also exists, so they can resume it later if intended.

### `force-with-lease` push rejected on resume
The remote branch moved after the `fetch`. Stop, re-fetch, re-evaluate. **Do not** fall back to plain `--force`.

### Conflicts during `sync` rebase
Surface the conflict files; do not auto-resolve. The developer drives conflict resolution.

### Working on a long-lived branch (e.g. `redesign/v3`)
Same protocol — `park` and `resume` work on any branch except `main`. `sync` only updates `main`; it does not touch long-lived feature branches.

### `.gitignore`d files (`.env`, `resend.key`, etc.)
Not synced. Both machines already have these in place. If a new env var or secret file is introduced, the developer must place it on both machines manually before `resume` will succeed in running the dev server.

---

## Recovery

If a `resume` goes sideways, the parked commit is recoverable from the local reflog or from origin:

```bash
git reflog                            # find the [WIP-PARK] SHA in local reflog
git fetch origin                       # or re-fetch if the local copy is gone
git checkout -b recover-park <SHA>     # restore the parked commit on a recovery branch
```

The structured commit body is the source of truth for "what was I doing", so as long as the SHA exists somewhere, the context is recoverable.

---

## One-time setup (already complete)

Documented for posterity and for the next time a new dev machine is added.

### Both machines need

- Repo cloned (`git clone https://github.com/ilv78/Art-World-Hub.git`)
- `gh` CLI installed and authenticated (`gh auth login`) — used for issue/PR operations
- A working `git push` to `origin` (laptop uses HTTPS via the `gh` credential helper; VPS uses SSH via `git@github.com:` remote — both fine, the protocol doesn't care which)
- Local-only files in place: `.env`, `resend.key` — copied manually on first setup, not synced through git
- Node.js + npm at the version pinned in the repo

### Current machines

| Machine | Hostname | Repo path | User |
|---|---|---|---|
| Laptop | `Dell` | `/home/liviu/code/Art-World-Hub` | `liviu` |
| VPS | `<dev-vps>` (kept out of public spec) | `/home/liviu/app` | `liviu` |

### Laptop SSH alias (convenience only)

Configure an SSH alias in `~/.ssh/config` for the dev VPS so non-Claude remote ops are short (e.g. `ssh <your-dev-vps-alias> 'tail -f ~/app/server.log'`). The literal config and the actual hostname are kept out of the public spec. **The protocol itself never SSHes from one machine to the other** — all sync is via GitHub.

### Detecting which machine you're on

`hostname` returns `Dell` on the laptop and the Webdock node name on the VPS. Write whichever it returns into the `Machine:` field of parked commits.

---

## Why this design

| Concern | Choice | Alternative rejected |
|---|---|---|
| Sync channel | GitHub | Direct laptop↔VPS rsync — laptop not reliably reachable inbound |
| Carrying dirty state | WIP commit with magic marker `[WIP-PARK]` | `git stash push` — doesn't push to remote by default, awkward to share across machines |
| Carrying context | Structured commit body | Sentinel file in repo — needs special-casing in `.gitignore`, easy to leak |
| Removing WIP from history on resume | `git reset --mixed HEAD~1` + `git push --force-with-lease` | Leaving the WIP commit in history — pollutes git log, confuses CI, breaks "is this branch ready to merge?" checks |
| Force-push safety | `--force-with-lease` | Plain `--force` — can clobber concurrent work |

---

## Quick reference

```bash
# park (laptop or VPS)
git add -A
git commit -m "[WIP-PARK] <branch> — <summary>" -m "<structured body>"
git push -u origin <branch>

# resume (other machine)
git fetch --all --prune
git log --all --remotes --grep='\[WIP-PARK\]' --format='%H %D %s' -1
git checkout <branch>
git pull --ff-only
git reset --mixed HEAD~1
git push --force-with-lease origin <branch>

# sync (other machine, after merge)
git fetch --all --prune
git checkout main
git pull --ff-only
git branch -vv | awk '/: gone]/{print $1}'   # stale local branches
```
