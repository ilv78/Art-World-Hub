---
date: 2026-09-18
title: Hard-code the named-artist FAQ internal link directly in shared/faqs.ts rather than building a "featured artist" config
issue: 539
category: Product
---

#539 (Ultraplan Phase 4, following #535/#537/#538) asks for one specific, named artist —
Alexandra Constantin — to gain internal anchor text on more than one page, as a soft SEO
signal tying her name to her profile across the site. The policy and the issue text are
both silent on *how* to represent a link that names one real person inside a general-purpose
static content file (`shared/faqs.ts`, otherwise five generic platform-FAQ entries with no
per-entry identity).

Two shapes were available. (1) Add a generic, admin-configurable "spotlight" mechanism —
an env var or DB flag naming which artist gets an FAQ callout — so a future campaign for a
different artist would not need a code change. (2) Add the sixth `Faq` entry with the
artist's name, answer copy, and profile slug written directly into the array, exactly as the
other five are.

**Chosen: (2), hard-coded.** Reasoning:
- The issue is explicitly a one-off, named campaign ("starting with Alexandra Constantin"),
  not a recurring feature — the parent Ultraplan's own "out of scope" note for the homepage
  spotlight component says as much: dynamic-by-name is "not worth hardcoding a single
  artist" *there*, but the FAQ entry's entire value here is being fixed, exact-match anchor
  text for one indexable Q&A. A config layer would add a lookup, a fallback path, and a
  place for the mechanism to silently point at nothing if the artist is deleted or renamed —
  none of which this one entry needs.
- Precedent: #535 already hard-coded this artist's UUID directly into a migration/decision
  for the same campaign. Consistent with how the rest of `shared/faqs.ts` works — there is
  no admin UI for FAQ copy at all (`specs/features/seo/SPEC.md`); every entry is a PR.
- The `Faq.link` field added to support it (`{ text, href }`) is generic — any future FAQ
  entry, for any artist or otherwise, can reuse it. Only the *data*, not the mechanism, is
  specific to this campaign.
- Resilience: the hard-coded href is the slug (`alexandra-constantin-4493f600`), not a raw
  UUID. `/artists/:slug` 301-redirects retired slugs (#537), so a future name change still
  resolves — the fragile part (the slug string) already has its own reversibility built in
  by an earlier phase.

**Reversible in minutes:** delete or edit the one array entry in `shared/faqs.ts`; no schema,
migration, env var, or admin surface is involved.
