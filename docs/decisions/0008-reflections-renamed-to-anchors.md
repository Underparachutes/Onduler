# 0008 — Reflections surface renamed to Anchors

**Status:** Accepted
**Date:** 2026-05-20
**Amends:** ADR 0007 (Reflections surface, cycle-close ceremony, and bottom-nav rename)

## Decision

The surface formerly named **Reflections** (renamed two days ago in ADR 0007 from the original **Log**) is renamed **Anchors**. The four bottom-nav surfaces become: **Motions / Swells / Anchors / Settings**. The anchor icon already in place on the Reflections tab carries forward unchanged — it was the right icon for the wrong word.

The rename extends to the user-facing language for the entries themselves. The cycle-close ceremony writes an **anchor** (formerly a reflection); the `+` button on the page opens a *"drop an anchor"* free-form entry; the persistent library at the journal sub-route is **"your anchors"**. The schema table `reflections` does **not** rename — same internal/external split already in use for `milestones`/Waypoint and `builds`/shape. Code identifiers (`/app/actions/reflections.ts`, `getWeekCeremonyState`, etc.) can stay where they are; this is a UI-copy and route change, not a refactor.

The previously-collided JSON column `user_settings.mvs_anchors` (which stores per-shape "still showing up" motions on welcome-back from a wave — ADR 0004 §8) renames to **`user_settings.mvs_motions`**. The word "anchor" now belongs to the surface; the welcome-back motion set takes the more literal name. Welcome-back copy ("Still showing up: {motion 1} · {motion 2}") is unaffected — it never used the word "anchors" on screen anyway.

Two small accompaniments ship with the rename:

- **"Not all those who wander are lost"** is added as a quiet line on the locked Anchors page, under the breathing hex silhouette. Tertiary typography weight, same color/letterspacing as the existing cadence label.
- **Hex-pulse visibility fix.** The `slow-breathe 4s ease-in-out infinite` animation in `LockedPage.tsx` (lines 57–74) is currently imperceptible on iOS. The breathe keyframe needs a contrast or amplitude bump — final values to be tuned live during the implementation session.

## Why

### Why Anchors

The framing comes from Josh's testing session: *"Your swells anchor you to who you are as a person. If you drift away from them with your motions you become out of sync."* That sentence does work in one beat that ADR 0007's "the mirror where you adjust yourself" did in a paragraph — it tells the user what the surface is *for* without explaining the mechanism. The cycle-close ceremony reads as a literal anchoring against drift; the radar visualizes the drift; the journal becomes a record of every time the user re-anchored.

Reflections was always a placeholder. ADR 0007 acknowledged that the surface needed a name that positioned it as *change*, not diagnostics — Reflections was the best available word inside the original conversation, but it stayed in the head (a passive verb-noun) instead of moving into the body (a load-bearing physical metaphor). Anchors moves the surface back into the water family — Tide, Wave, Swell, Motion, Waypoint, Anchor — which tightens the vocabulary without expanding the niche-lingo load (anchor is fully mainstream; users don't need to be taught what one is).

### Why rename the entries too

The internal/external split (build/shape, milestone/waypoint) holds the schema steady while the surface evolves. Surface = Anchors; the act of writing one is *dropping an anchor*; a saved entry is *an anchor*. The cycle-close ceremony entry is *this week's anchor*. This is the maximally cohesive option — the alternative (surface = Anchors, entries still called "reflections") would create a visible vocabulary mismatch the user would notice immediately: bottom nav says Anchors, but the page button says "New reflection."

The poetic load also lands harder. "Drop an anchor" is a tactile invitation to do the thing the surface is for — pause, locate yourself, hold for a beat. "Reflect" is a head verb; "drop an anchor" is a body verb. Onduler's voice prefers the body verb.

### Why the schema table stays

Same reasoning as 0006: renaming the `reflections` table costs real migration risk (RLS, FKs, indexes, ADR 0007's wiring) for zero user-visible benefit. The table is the storage shape; the surface is the user shape; the two don't need to share a word. Pattern is already proven with `milestones`/Waypoint and `builds`/shape. Future ADRs and design conversations use "anchor" when talking about the user experience, "reflections" when talking about the table or code.

### Why mvs_motions for the column rename

The literal choice. The column stores motion IDs (per shape — a dict of `{ build_key: [motion_id, ...] }`); calling it `mvs_motions` describes exactly what's in it without introducing a new vocabulary word. The `mvs_` prefix preserves the "minimum viable shape" framing that ADR 0004 §8 introduced — the auto-resolved top-2 most-logged motions that still show up when a user returns from a wave.

`mvs_reflections` was Josh's first instinct ("the least friction") and was rejected because it transfers the collision to a freshly-deprecated word. `keystone_motions` was considered and rejected for introducing a new metaphor word ("keystone") into the vocabulary load when "mvs_motions" already says what it is.

### Why "Not all those who wander are lost"

Josh's testing notes flagged this. The line is Tolkien (technically Bilbo's poem to Aragorn in *The Lord of the Rings*) and is already in the cultural drift to the point that no attribution is needed. It pairs cleanly with the locked Anchors page because the page itself is a designed wandering surface — blurred hex silhouette, drifting tide lines, no numbers, no dates. The line affirms that the user isn't behind, isn't failing, isn't being measured; they're in the early part of a longer rhythm. It also pairs with the rename: an anchor is what you drop when you choose to stop wandering for a beat, but you can wander honorably between drops.

Placement is tertiary — below the existing display copy ("Glimpses of where you've been. Come back as you log.") and the cadence label ("weekly"). Italicized; faint color; small. Not the loudest line on the page.

### Why fix the hex pulse now

The locked Anchors page is doing all of the lifting before any cadence unlocks — for a new user, this is the *only* version of the surface they see for at least their first week. If the hex isn't visibly breathing, the page reads as static, which under-delivers on the "designed wandering" promise. The breathe is what makes the page feel alive without quantifying anything. Fix is small (amplitude / opacity-delta / blur on the keyframe) and lives in the same session as the rename since both surfaces touch `LockedPage.tsx`.

## Schema migration

Single column rename. No data movement.

```sql
ALTER TABLE user_settings RENAME COLUMN mvs_anchors TO mvs_motions;
```

`supabase-migration.sql` line 125 updated. RLS policies, indexes, and any downstream queries (`app/settings/shape/page.tsx`, `app/actions/welcomeback.ts`, `app/wave/return/welcome/page.tsx`) take the new column name in the same commit.

The `reflections` table, `chapters` table, and all related indexes / RLS policies stay exactly as defined in ADR 0007.

## Route and file moves

- `/reflections` → `/anchors` (page, ceremony, journal sub-route)
- `/reflections/ceremony/week` → `/anchors/ceremony/week`
- `/reflections/journal` → `/anchors/journal` (sub-route name follows the new surface name)
- Directory move: `app/reflections/` → `app/anchors/`
- All `revalidatePath('/reflections')` calls update to `/anchors`
- `getWeekCeremonyState`, `getUnlockState`, and the action file at `app/actions/reflections.ts` can stay named as-is (internal name); the path can also stay (internal). Renaming the action file is optional grep-improvement work, not required.

URL change is a break for any bookmarks but acceptable at pre-launch user count of one.

## Copy sweep

Every visible string referencing Reflections or "reflection" inside the surface gets reviewed:

- Bottom-nav `label: 'Reflections'` → `'Anchors'` (`app/components/BottomNav.tsx`, line 30)
- `pendingReflection` prop name on `BottomNav`: keep (internal). The tide-pulse behavior is unchanged. Alternative: rename to `pendingAnchor` for grep-ability; defer the call to the implementation session.
- Page `h1`: `Reflections` → `Anchors`
- Cycle-close-ceremony banner CTA copy: `Reflect on last week →` → `Drop this week's anchor →` (or similar; final wording in implementation)
- Ceremony page in-flight copy: keep the two prompts as-is (*"What did you expect to see this week?"* / *"What did you see?"*). They're about noticing, not about the word "reflect"; renaming them would damage the design.
- Ceremony completion: where the user previously "wrote a reflection," they now "dropped an anchor." Subtle copy in completion confirmation.
- `+` button affordance on `/anchors`: opens a *"drop an anchor"* free-form entry (replaces "new reflection").
- Journal sub-surface `/anchors/journal` heading: **Your anchors** (replaces "your reflections"). Chapter separators unchanged.
- Locked page (`LockedPage.tsx`): existing display copy *"Glimpses of where you've been. Come back as you log."* stays. New tertiary line below cadence label: *"Not all those who wander are lost."*
- Settings `welcome_back_mode` description / "Anchors editor" naming: the existing Settings → Your shape page has an "Anchors editor" section under the primary slot (ADR 0004 §8). This section's name now collides directly with the new surface name. Rename to **"Still-showing-up motions"** or **"Anchors when you return"** — final wording in implementation. The data model is `mvs_motions`; the surface name should mirror the storage shape's intent ("the motions that show up when you ease back in from a wave").
- Banned-word audit: continue per existing working agreement (tasks / activities / goals / domains).

The two ceremony prompt strings deserve a specific protect: they survive the rename unchanged. They are not "reflection prompts" semantically — they are *anchoring prompts*, and they already read correctly under the new surface name without rewording.

## Vocabulary table update (PROJECT.md)

The vocabulary lock expands from five terms (Tide / Wave / Swell / Motion / Waypoint) to six, adding **Anchor**. Surface name *and* entry-level word are the same item in the vocabulary table — the internal/external split is implementation detail, not user vocabulary.

| Term | Meaning |
|---|---|
| **Anchor** | Both the surface where the user notices and adjusts themselves (formerly Reflections — see ADR 0008), and an entry written there. A weekly/monthly/quarterly/yearly cycle-close ceremony writes an anchor; the `+` button drops a free-form anchor any time. The metaphor: swells anchor you to who you are; the surface is where you check whether your motions are still aligned with them, and drop a marker each time you do. Internal table name remains `reflections`. |

The five-term list expands accordingly in the design-heuristic memory (`onduler_design_heuristic.md`): **Tide / Wave / Swell / Motion / Waypoint / Anchor**.

## Working-agreement amendments

### Amend: four-surface split

Existing language: *"Motions is the daily ritual surface; Swells is the strategic surface; Reflections is the mirror where you adjust yourself; Settings is configuration."*

Update to: *"Motions is the daily ritual surface; Swells is the strategic surface; Anchors is where you notice and re-align — the surface where you drop a marker against drift; Settings is configuration."*

Role split (ritual / strategy / re-alignment / configuration) is unchanged in shape; only the third surface's name and one-line role moves. The "Today / Log are the prior names of Motions / Reflections" historical note expands to include "Reflections is the prior name of Anchors (see ADR 0008)."

### Amend: bottom nav

Update the four nav-item names to **Motions / Swells / Anchors / Settings**. The hide-back-button-on-top-level rule extends naturally to `/anchors`.

### Amend: cross-page navigation press feedback

No change to the agreement itself — `active:scale-[0.97]` on bottom-nav items still applies. The Anchors tab inherits the existing tide-pulse + dim-other-tabs invitation pattern from ADR 0007 unchanged.

## Implications

- **PROJECT.md edits**: vocabulary table gets the new **Anchor** entry; the current "Reflections surface" line in *Current state of the build* gets annotated `Renamed to Anchors per ADR 0008 (queued)`; the four-surface working agreement and the bottom-nav agreement update per above; a new decision summary section gets added pointing to this ADR; ADR 0007 reference is annotated as amended by ADR 0008. Vocabulary table entry for Waypoint stays unchanged.
- **ADR 0007**: short Amended-on note at the top pointing to ADR 0008. Body stays — still accurate as the decision that created the surface; only the name moves.
- **ADR 0004**: short editorial note that "MVS anchors" in §8 is now called "MVS motions" in code and surfaces (the design concept is unchanged).
- **Memory**: `onduler_design_heuristic.md` updated to expand the locked user-facing surf vocabulary from Tide/Wave/Swell/Motion/Waypoint to Tide/Wave/Swell/Motion/Waypoint/Anchor.
- **Code rename work (next dedicated roadmap session, gated on Josh unlocking the locked page)**:
  - Schema migration: `ALTER TABLE user_settings RENAME COLUMN mvs_anchors TO mvs_motions;`
  - File / directory moves per the section above.
  - `revalidatePath` sweep.
  - Copy sweep per the section above.
  - Settings → Your shape: rename the section currently labeled "Anchors editor" to "Still-showing-up motions" (or "Anchors when you return" — final wording in implementation).
  - "Not all those who wander are lost" added to `LockedPage.tsx` as a tertiary line.
  - Hex `slow-breathe` keyframe tuning — bump amplitude / opacity-delta until the breathe is visible on iOS. Verified live on Josh's phone before merge.
- **Marketing site**: when one exists, the explanatory page (referenced in ADR 0007 as "marketing site explains the pattern") uses Anchors as the surface name and explains "drop an anchor" naturally.

## Alternatives considered and rejected

**Keep Reflections.** Considered. Reflections is a perfectly fine word and would have been the answer in most habit apps. Rejected because Onduler is committed to a tight, water-family vocabulary (six terms, no more), and Reflections sat outside it — a head verb in a body-verb voice. Anchors brings the surface back into the family without expanding the vocabulary count.

**Rename surface only, keep entries as "reflections."** Considered. Lower copy effort. Rejected because the bottom-nav label + button-copy mismatch would be immediately visible to the user (tab says Anchors, button says "New reflection"). Maximal cohesion is the right call when the surface itself is small and copy-light.

**Use a neutral entry word like "note" or "mark."** Considered. Avoids both collisions but loses the metaphor's weight. Rejected — Anchor is already the surface name, so making the entry-word neutral would only confuse the relationship between surface and entry.

**Full rename — schema, code, and UI.** Rejected per the same reasoning as ADR 0006: the `reflections` table is correctly named internally, has indexes / FKs / RLS / ADR 0007 wiring referencing it, and renaming the storage layer is migration risk for zero user benefit. Internal stability + expressive surface is the proven pattern.

**`mvs_reflections` for the column rename.** Considered (Josh's first instinct). Rejected because it transfers the word collision to a deprecated word — the column would survive in code as a vocabulary fossil pointing at a surface name no longer in use.

**`keystone_motions` for the column rename.** Considered. Adds a new metaphor word ("keystone") to the vocabulary load when the literal `mvs_motions` already says what it is. Rejected for vocabulary discipline.

**Wait to rename until Anchors fully unlocks for Josh.** Considered. Rejected — the rename is doc-only at the ADR stage, and the implementation session can happen any time. Decoupling the decision from the implementation timing means Claude Code can pick this up when Josh is ready without re-litigating the naming.

**Re-attribute "Not all those who wander are lost" to Tolkien on the page.** Considered. Rejected as the line has drifted into the cultural commons enough that attribution would read as belaboring. The locked page is vibe-only — adding "— J.R.R. Tolkien" would mechanize it.

## Origin

Decision reached in a Cowork doc-mode session on 2026-05-20, three days after ADR 0007 shipped. Josh's testing notes flagged a list of small and large items, and the rename surfaced as the largest spec-level conflict: *"Reflections should be changed to anchors. Your swells anchor you to who you are as a person. If you drift away from them with your motions you become out of synch."* The framing was strong enough to override the freshly-shipped Reflections rename — caught while only one user has interacted with the surface, with negligible migration cost.

The journal-entry rename (reflection → anchor) and the column rename (mvs_anchors → mvs_motions) were resolved in the same conversation via the AskUserQuestion tool. The "Not all those who wander are lost" line was Josh's own placement suggestion ("I like not all those who wander are lost on the locked anchors page"). The hex-pulse tuning task was raised by Josh in the same testing notes — *"the design spec said its supposed to be beating/pulsing slower than a heartbeat but it's not coming through as doing anything on my phone"* — and folded into the same implementation session since it touches the same file.

Implementation queued on the roadmap as its own discrete session, gated on Josh's choice to do the work when he's ready in Claude Code.
