# Versioning & Release Policy

## Version Scheme

ArtVerse uses [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).

| Bump | When | Examples |
|------|------|----------|
| **PATCH** (v2.0.→**1**) | Bug fixes, dependency patches, docs-only changes | CSS fix, typo fix, dep bump with no behavior change |
| **MINOR** (v2.**1**.0) | New features, enhancements, non-breaking schema changes | Email login, profile picture upload, new admin panel |
| **MAJOR** (v**3**.0.0) | Breaking API changes, breaking schema migrations, major rewrites | New auth system replacing old one, API v2 |

## When to Declare a Release

A **versioned release** (git tag `vX.Y.Z` + GitHub Release) is declared when a meaningful set of changes has been **deployed to production and confirmed healthy**. Specifically:

### Trigger a release when:

1. **A user-facing feature ships to production** — e.g., new login method, new admin panel, new gallery template. This is a MINOR bump.
2. **A batch of bug/security fixes ships to production** — e.g., all P0 security findings fixed and deployed. This is a PATCH bump.
3. **A breaking change ships to production** — anything that changes API contracts, requires data migration with downtime, or fundamentally changes existing behavior. This is a MAJOR bump.

### Do NOT create a release for:

- Every individual PR merge to main (that's what `release-{run_number}` tags are for)
- Documentation-only changes (specs, postmortems, README updates)
- CI/CD pipeline changes that don't affect the deployed application
- Dependency bumps that don't change application behavior

### Batching guideline

It's fine to batch multiple features/fixes into a single release. A natural rhythm:
- After a feature branch + its follow-up fixes are all deployed and stable
- After a security hardening sprint completes
- Weekly, if there's been a steady stream of small changes

## Release Checklist

### Automated (recommended)

1. **Label issues** — add `release: next` to closed issues that should be in the release
2. **Run the workflow** — GitHub Actions → "Release" → Run workflow
   - Leave bump override empty for auto-detect (MINOR if any `feature`/`enhancement`, else PATCH)
   - Select `minor` or `major` to override
3. The workflow creates a **release PR** (branch `release/vX.Y.Z`) with the updated `CHANGELOG.md`
4. **Review and merge** the PR — CI runs normally, ensuring the CHANGELOG update passes all checks
5. On merge, `release-finalize.yml` automatically:
   - Creates git tag `vX.Y.Z` and GitHub Release
   - Removes `release: next` labels from processed issues
   - Sends Telegram notification

**Prepare:** `.github/workflows/release.yml` (manual dispatch → creates PR)
**Finalize:** `.github/workflows/release-finalize.yml` (runs on PR merge with `autorelease` label)
**Script:** `.github/scripts/prepare-release.sh`

### Manual (fallback)

1. **Verify production is healthy** — check `https://vernis9.art/health`
2. **Update `CHANGELOG.md`**:
   - Move items from `[Unreleased]` into a new `[X.Y.Z] - YYYY-MM-DD` section
   - Group changes under: Added, Changed, Fixed, Security, Removed (as applicable)
3. **Commit the CHANGELOG update** to main (via PR)
4. **Create the git tag and GitHub Release**:
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   gh release create vX.Y.Z --title "vX.Y.Z" --notes "See CHANGELOG.md for details"
   ```

## Relationship to Deployment Tags

ArtVerse has two tagging systems that serve different purposes:

| Tag | Purpose | Created by | Example |
|-----|---------|------------|---------|
| `release-{N}` | Deployment identifier (every push to main) | CI automatically | `release-222` |
| `vX.Y.Z` | Semantic version (milestone marker) | Developer manually | `v2.1.0` |

Both are useful. `release-{N}` tags enable fast rollback to any deployment. `vX.Y.Z` tags mark meaningful milestones for communication and tracking.

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| v1.2.0 | 2026-02-22 | Initial published application |
| v1.2.1 | 2026-02-24 | Docker deploy + Google OIDC auth |
| v1.3.0 | 2026-02-24 | Published app update |
| v2.0.0 | 2026-03-11 | Full CI/CD pipeline (11 steps), testing, migrations, rollback, Telegram notifications |
| v2.1.0 | 2026-03-14 | Email login, security hardening (P0+P1), profile pictures, release management, postmortem workflow |
