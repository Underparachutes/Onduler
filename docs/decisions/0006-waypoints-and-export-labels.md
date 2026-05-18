# 0006 — Waypoint (user-facing rename of milestone) and export labels in user vocabulary

**Status:** Accepted
**Date:** 2026-05-18

## Decision

The user-authored marker-within-a-swell — previously called "Milestone" in user-facing surfaces — is renamed **Waypoint**. The schema table remains `milestones`; all code identifiers (`MilestonesSection.tsx`, `app/actions/milestones.ts`, `milestone.*` props, etc.) stay where they are. This is the same internal/external vocabulary split already in use for `builds` (user-facing: "shape"). It is a UI-copy change, not a refactor.

Separately and pairing with the rename: **data exports use user-facing vocabulary, not schema column names.** The current `/api/export` JSON download labels its top-level arrays with raw table names (`swells`, `motions`, `logs`, `wave_checkins`, `groups`) and is missing milestones/waypoints entirely. Going forward, exports translate to the words the user reads in the app — `waypoints`, `swells`, `motions`, `logs`, `wave_checkins` (translation TBD), `groups` — so when the user opens the file they recognize what they're looking at.

## Why

### Why waypoint

"Milestone" was the one user-facing term that didn't live in the ocean. Tide, Wave, Swell, and Motion are all in the water family; Milestone was highway construction — a generic project-management word that pulled against the rest of the voice. Waypoint is nautical/navigational without being surf jargon: most users know it from GPS, hiking, or boating, so it fits the metaphor family without expanding the niche-vocabulary load the way "buoy" or "marker buoy" would. The "drown in surf lingo" risk doesn't apply to waypoint the way it would to more specialized water-words.

Semantically, a waypoint is a marker on a journey — exactly what the entity represents. The mild conceptual tension with the swells-aren't-destinations doctrine (ADR 0002 and the May 2026 weekly-cycle decision: "Swells are not destinations. They are philosophies the user wants their life to feel full of") is resolved by reading waypoints as *intermediate markers within an ongoing rhythm*, not endpoints of it. A swell is a rhythm; a waypoint is a thing you're navigating toward inside that rhythm. Recurring waypoints are even more obviously rhythmic-not-destinational; one-shots are the closest to a destination, but a one-shot completion still leaves the swell rolling.

The locked user-facing surf vocabulary expands from four terms (Tide, Wave, Swell, Motion) to five (adding Waypoint). That's a real change to the design heuristic — it's intentional, not creep.

### Why the schema and code don't move

Same reasoning as build/shape: the database name `milestones` is correct internally, has indexes and FKs and ADR 0004 wiring referencing it, and renaming it would be migration risk for zero user-visible benefit. Internal stability + expressive surface is the better trade. Future ADRs and design conversations can use either word as the context demands; "waypoint" when talking about the user experience, "milestones" when talking about the table or code.

### Why export-as-translation

Users export their data because they want to read it, share it, archive it, or pull it into a different tool. The JSON they get should be legible to them — they should recognize the words from the app, not have to remember that `milestones` means waypoints or that `motion_swells` is the junction. The internal/external split that protects code stability also protects export legibility, as long as we translate at the export boundary. The translation layer is one place to add it (the export route), one place to maintain it, and it costs effectively nothing.

Also: the current export omits milestones/waypoints entirely. That's a real data-loss surface for anyone using the export as backup. Fixing that and translating keys is the same change.

## Vocabulary entry (replaces previous "Milestone" entry in PROJECT.md vocabulary table)

| Term | Meaning |
|---|---|
| **Waypoint** | A user-authored marker within a swell — a point the user is navigating toward inside the swell's ongoing rhythm, not an endpoint of it. Two kinds: recurring (e.g. publish weekly) and one-shot (e.g. start a band). Completing a waypoint celebrates and may add bonus points to the swell. Internal table name remains `milestones`. |

## Working agreement (added to PROJECT.md)

**Data exports use user-facing vocabulary, not schema column names.** Exports (the current JSON download at `/api/export`, and any future format) label data with the words the user sees in the UI — Waypoint, Swell, Motion, Group, Tide, Wave — not internal table names like `milestones` or `motion_swells`. The schema and code identifiers stay where they are; the export is a translation layer. When a user opens their exported file, they should recognize the words. Same internal/external split already used for build/shape and milestone/waypoint.

## Implications

- **PROJECT.md** — vocabulary table updated (Milestone row → Waypoint); data model `milestones` row annotated with "User-facing name: Waypoint"; ADR 0004 decision summary's Milestones paragraph updated to Waypoints; new decision summary section added for ADR 0006; new working agreement bullet for export labeling; ADR 0004 reference annotated as amended by ADR 0006.
- **ADR 0004** — short Amended-on note at the top pointing to ADR 0006. Body unchanged; still accurate as schema/internal language.
- **Memory** — `onduler_design_heuristic.md` updated to expand the locked user-facing surf vocabulary from Tide/Wave/Swell/Motion to Tide/Wave/Swell/Motion/Waypoint.
- **Code rename work (next dedicated roadmap session)**:
  - UI copy sweep: every visible string referencing "Milestone" / "Milestones" → "Waypoint" / "Waypoints" across `SwellProficiencyView.tsx`, `MilestonesSection.tsx`, related empty states, completed-collapse text, button labels, page titles, etc. Particular attention to count-based pluralization ("1 finished waypoint" vs "3 finished waypoints").
  - Component/file/action identifiers (`MilestonesSection.tsx`, `app/actions/milestones.ts`, `milestone.*` props): optional. Internal names can stay per the split; default is to leave them alone unless rename is cheap and improves grep-ability for future-us. If renamed, the schema table name `milestones` still does not move.
  - Data export at `/api/export`:
    - Add waypoints (the missing `milestones` query) to the response so backups are complete.
    - Translate top-level keys to user-facing vocabulary: `milestones` → `waypoints`. Existing keys already mostly match user-facing words (`swells`, `motions`, `groups`, `logs`), so the translation is light. `wave_checkins` is borderline — defer that key-rename decision to the session that does the work, since "wave_checkins" is the surface name in PROJECT.md too.
    - Audit any nested keys that leak schema language (e.g., `motion_id` inside log rows is fine — it's an internal reference — but consider whether to also surface `motion_name` more prominently, which is already done).
    - Filename, `exported_at`, `user_email` stay as-is — those are export-format metadata, not user-data labels.
- **No schema migration.** Table stays `milestones`. RLS, indexes, FKs, ADR 0004's schema definition all unchanged.

## Alternatives considered and rejected

**Full rename — schema, code, and UI.** Rejected. The schema rename costs migration risk and ADR-amendment churn for zero user-visible benefit. The build/shape split is already proven as a pattern that keeps internal stability without forcing surface compromises.

**Different ocean-family term (Marker buoy, Beacon, Bearing, Lighthouse, Drift point, Buoy).** Considered. Waypoint won because (a) it carries the journey-marker meaning most plainly, (b) it's the most mainstream of the candidates — least risk of feeling like the app is performing its theme, and (c) it doesn't read as cute or precious in the way a more obscure water-word would.

**Keep "Milestone."** Rejected per this ADR's argument. The hesitation was always "is the rename worth a contract edit?" — answer is yes, because Milestone is currently the one user-facing word pulling against the surf voice and removing that friction tightens the whole vocabulary.

**Export raw schema and explain in docs.** Rejected. Exports should be self-describing. If a user opens the file six months later they shouldn't need documentation to read it.

**Translate exports at consumption time (e.g., a separate "exported-for-humans" endpoint).** Rejected as over-engineering for a single-user app. One export, translated at the boundary, is sufficient.

## Origin

Decision reached in a Cowork design session on 2026-05-18. Josh: "I want to change milestones to waypoints. I don't want to drown in the surf lingo, but I feel like that fits better." Recommendation accepted with the internal/external split applied (table stays `milestones`). Export-labeling working agreement added in the same conversation: "if the user exports data they get UI text over their data so they know what it is." The rename + export translation is queued as its own discrete roadmap session ahead of the motion-side cadence work, so the cadence session inherits the renamed copy rather than shipping new strings in the old vocabulary.
