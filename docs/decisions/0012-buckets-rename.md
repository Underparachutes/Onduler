# 0012 — Groups renamed to Buckets at the surface

**Status:** Accepted
**Date:** 2026-05-24
**Amends:** ADR 0001 (Groups schema)

## Decision

The user-facing word **Group(s)** is renamed to **Bucket(s)** everywhere it appears on screen. The internal `groups` schema table, FK columns (`motions.group_id`, `swells.group_id`), code identifiers (`createGroup`, `setMotionGroup`, `setSwellGroup`, `groupsEnabled`, the `Group` type, etc.), and the `user_settings.groups_enabled` toggle column all stay. Standard internal/external vocabulary split — same pattern as `milestones`/Waypoint (ADR 0006), `reflections`/Anchor (ADR 0008), and `builds`/Starter sets (ADR 0011).

The locked surf vocabulary expands from seven terms (Tide / Wave / Swell / Motion / Waypoint / Anchor / Wake) to eight with Bucket added.

### User-facing changes

| Surface | Before | After |
|---|---|---|
| Settings section header | "Groups" | "Buckets" |
| Settings section description | "Optional organizational layer…" | "Buckets are an optional organizational layer for your motions and swells." |
| Settings toggle label | "Enable groups" | "Enable buckets" |
| Motion detail sheet chip row label | "Groups" | "Buckets" |
| Swell detail / inline edit chip row label | "Groups" | "Buckets" |
| Motions page group-filter chip row | (chip labels are user-authored bucket names; no change to chips themselves — the surrounding "Groups: …" or empty-state copy renames) | "Buckets: …" |
| Swells page grouped-view section headers | (user-authored bucket names — no change) | (no change) |
| Settings → Bucket detail sub-route copy ("This group contains…") | "This group contains…" | "This bucket contains…" |
| Empty states | "No groups yet" | "No buckets yet" |
| "Not in any group" diagnostic copy on swells page | "Not in any group" | "Not in any bucket" |

User-authored bucket names (the names of the buckets users have created — Health, Work, Side projects, etc.) are unaffected. This rename only touches the noun that describes the concept.

### Internal stays

- Schema table `groups`
- FK columns `motions.group_id`, `swells.group_id`
- `user_settings.groups_enabled` column
- All code identifiers: `Group` type, `createGroup` / `updateGroup` / `deleteGroup` / `setMotionGroup` / `setSwellGroup` actions, `groupsEnabled` prop names, `lib/` helpers
- Route segments that include "groups" (none exist as of this writing — `/settings` houses the section inline)

### Migration

None. This is a string-replacement pass through user-facing copy. No data migration, no schema change. `user_settings.groups_enabled` rows keep their values; only the toggle's display label flips.

## Why

**"Bucket" sounds more like the beach.** Onduler's voice family is water — Tide, Wave, Swell, Motion, Waypoint, Anchor, Wake. "Group" is an outlier in that family: it's procedural-software vocabulary, not coastal vocabulary. "Bucket" sits in the family without being surf-jargon — beach buckets are universal, every reader knows what a bucket is, and it carries the right informal-organizational meaning (a thing you toss stuff into) without claiming more than the mechanism delivers.

**The mechanism is, literally, a bucket.** ADR 0001 describes the concept as "an organizational bucket for motions and swells. No target, no scoring." That word already appears in the description prose. The rename just promotes the word that was already doing the work into the surface label.

**No conceptual change.** Buckets are still optional, still single-membership-per-entity, still shared across motions and swells, still toggle-gated in Settings. ADR 0001's data model decision is unchanged — schema, indexes, RLS policies, FK behavior all stay. This is a pure rename at the user-facing layer.

**Internal/external split keeps the schema steady.** Same pattern proven on `milestones`/Waypoint, `reflections`/Anchor, and `builds`/Starter sets. Renaming the table costs migration risk (RLS, FKs, ~30 query sites, the `groups_enabled` settings column) for zero user-visible benefit — the user never sees the column name.

## Alternatives considered and rejected

**Keep "Group."** Considered. Group is fine; nothing breaks. Rejected because it leaves one term in the user-facing surface that doesn't belong to the water-family voice. Onduler has been tightening that voice across ADRs (0007 → 0008 reframe, 0010 wake, 0011 starter sets), and Group is now the conspicuous outlier.

**Rename to "Folder."** Considered. Common, instantly understood. Rejected because Folder leans even harder toward office-software vocabulary than Group does. Worse fit for the voice.

**Rename to "Reef" or "Bay."** Considered. Stays in the water family. Rejected: both expand the niche-lingo load (users would need to learn what they mean here), and neither carries the informal-organizational meaning Bucket does. Reef has the wrong connotation (something hard, something you crash on); Bay implies a contained body of water (which buckets don't necessarily contain in the user's mind).

**Rename to "Shelf" or "Pile."** Considered. Both informal-organizational. Rejected: neither lands as cleanly as Bucket, and neither has the beach association. Shelf has a productivity-app smell.

**Rename the table too.** Considered. Rejected per the internal/external split pattern — `milestones`, `reflections`, and `builds` all stayed internally for the same migration-risk reason. Same call here.

## Implications

- **PROJECT.md updates:**
  - Vocabulary table (line ~24): rename "Group" entry to "Bucket"; update description to use bucket vocabulary; note the schema table stays `groups`.
  - Vocabulary expansion noted in the Wake ADR 0010 prose updated similarly: locked surf vocabulary now eight terms.
  - Working agreement on internal/external split (around line 387) extended to include `groups`/Bucket.
  - Decisions section gains a summary pointing here.
  - ADR 0001 reference in the Decisions section gets an "amended by ADR 0012" line.

- **Code work** (~20–30 string sites; bulk find-replace then audit):
  - Settings: section header, description, toggle label, bucket-detail sub-route copy.
  - Motion detail sheet: chip row label.
  - Swell detail / inline edit: chip row label.
  - Motions page: group-filter chip row label (chip values unchanged), empty states.
  - Swells page: orphan diagnostic copy ("not in any bucket"), grouped-view treatment unchanged.
  - Onboarding: any reference to groups (likely none — this surface predates groups).
  - Search the codebase for user-facing strings containing "group" (case-insensitive, full-word match) and flip to "bucket" only where the string ends up on screen.

- **Database**: no schema change.

- **ADR 0001**: gets an amendment line at the top pointing here.

- **Marketing**: no impact (buckets don't appear in marketing surfaces).

- **Priority**: low. This is voice-cleanup, not a bug or a workflow change. Ship it alongside another Motions/Settings session rather than burning a dedicated session on it.

## Origin

Decision reached in the Cowork strategy session 2026-05-24, alongside ADR 0013 (Motions surface restructure). Josh's framing: *"I just think buckets sounds more like the beach than groups."* The rename clean-up surfaced naturally — once flagged, the conflict with the water-family voice was hard to unsee. Pinned at the ADR level now and queued for the next batch session that touches Settings or the chip rows, so Code has a complete spec ready when the work lands.
