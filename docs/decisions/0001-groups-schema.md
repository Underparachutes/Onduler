# 0001 — Groups on swells: extend the existing groups concept to swells

**Status:** Shipped
**Date:** 2026-05-16

## Decision

Extend the existing `groups` concept to apply to swells as well as motions. The implementation:

- Keep the single `groups` table as-is.
- Keep `motions.group_id NULLABLE` (already shipped).
- Add `swells.group_id NULLABLE` FK to `groups`.
- 1:N on both sides — each motion belongs to one group (or none); each swell belongs to one group (or none).

No new tables. No `motion_groups` or `swell_groups` junction tables. No bidirectional sync, inheritance, or mirroring logic. A single "Health" group is a single row that can have both motions and swells pointing at it.

## Why

**Groups are folders, not tags.** Per PROJECT.md's existing locked decision (May 2026), a group answers the question *"where does this live in my list?"* — that's a folder, 1:N. Extending the same model to swells is the minimal consistent change.

**Two user modes drop out of the same shape.** A user who wants mirrored organization between motions and swells tags both with the same groups; a single "Health" group naturally has motions and swells in it. A user who wants independent organization assigns groups to motions and swells separately, with little or no overlap. Both modes work without any special data structures.

**Filter-carry-over across pages works naturally.** If a user filters motions to a group and navigates to swells, the filter persists and the swells page shows swells in that group. For the mirrored user this feels consistent; for the unmirrored user the filter shows nothing on the side that doesn't use that group, which correctly reflects reality.

**The misalignment diagnostic stays available.** A user can still observe whether their motion-side groupings cluster the way their swell-side groupings do. The diagnostic doesn't require M:N or separate tables; it shows up between simple folders on each side.

## Alternatives considered and rejected

**Separate `swell_groups` and `motion_groups` tables, both many-to-many with their respective objects.** This was the direction of an earlier Cowork draft (now superseded by this ADR). It overcomplicated the schema: duplicate group tables, junction tables on each side, and a "carry-over" question (manual port via drag-and-drop, name-matching, explicit link) for users who wanted mirrored organization. The single-table 1:N design eliminates all of that without losing any user-visible capability — including the misalignment diagnostic, which was the original motivation for the separate-tables approach.

**Many-to-many for motions↔groups.** Already considered and rejected in PROJECT.md's existing "Groups vs Swells (May 2026)" decision. Groups are folders; the M:N richness lives in `motion_swells.contribution_weight`, not in groups. Extending to swells follows the same logic.

## Schema (shipped)

```sql
-- Applied to live database; also reflected in supabase-migration.sql
ALTER TABLE swells
  ADD COLUMN group_id UUID NULL REFERENCES groups(id) ON DELETE SET NULL;

CREATE INDEX swells_group_id_idx ON swells (group_id);
```

RLS: existing swell policies already scope to `user_id`. No new policies required.

## Implications

- The `groups` table remains shared across motions and swells.
- A group cannot have a target or contribution weight — that's swells' job. Groups stay purely organizational.
- UI work needs to surface group selection on swell create/edit, mirroring the existing pattern on motion create/edit.
- Filter state can carry across the motions and swells pages (UX choice, not a data-model constraint).
- PROJECT.md's vocabulary section, data-model section, and Decisions section all need surgical updates to reflect this extension and to remove a lingering stale reference to a `motion_groups` junction. Done in the same change set as this ADR.

## Origin

Decision reached in a Cowork design session on 2026-05-16. An earlier draft of this ADR proposed two separate group tables with M:N relationships; that draft was withdrawn after reconciliation with PROJECT.md's existing locked schema (1:N motions↔groups, single `groups` table). The simpler 1:N + shared-table shape preserves the user-visible behavior the M:N draft was trying to enable with much less schema surface.
