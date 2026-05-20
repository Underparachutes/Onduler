# Testing notes — 2026-05-20

Josh's field notes from testing the app after the Reflections surface shipped (ADR 0007, 2026-05-18). Captured here so nothing falls off the list. Each item is triaged: where it lives now (ADR, roadmap session, quick-win batch, investigation, future spec, or parked).

## Raw notes (verbatim, in Josh's order)

1. Add a color to the progress bars for each theme
2. Move the swell edit features to be inline when you click into the swell
3. Connect other apps (just add the feature as a future spec)
4. Update the icon to something with a border and more wave-like. Origami vibe but looks like a chart — maybe an organic swell shape
5. Move the drag-and-drop action to motion checkboxes
6. Add lines under each motion to mimic paper
7. Add motion screen should look better
8. Default dark mode change to black background
9. Allow motions to be sorted by swells; if a motion exists in two swells duplicate the motion and when it's clicked, allocate points to the swell it's under — also allow one-click complete
10. Fonts feel off — swap so Manrope is heading and IBM Plex is body, just for Swells and Motions
11. The bottom navigation bar switches sizes — should be standardized
12. Pick 20 colors using Adobe CC (Josh)
13. Do away with the search bar
14. Progress bars should be colorful
15. Reflections should be changed to Anchors — your swells anchor you to who you are; if you drift away from them with your motions you become out of sync
16. The waves on the anchor page should be closer together — closer to the bottom = more in the forefront, overlapping waves hide the wave behind them, all waves touching
17. Sub-tasks should be able to count as the whole task — rock climbing / kayaking / swimming should each total whole points for Move; same with cooking, want to know what I cooked but it counts toward full points for Cook
18. The goals bar should be dynamic, ombré in color like Logbook at the very top of the screen
19. "Not all those who wander are lost" — incorporate somewhere
20. The app is still super slow — investigate fix
21. Wide-screen mode needs to be built
22. Add a plus sign when inside a swell to add more motions to that swell
23. Allow motions to be dragged into another motion to make sub-motions, and make sure there's an option to turn off point distribution where the parent motion's points are distributed to subs — track Move sub-activities (kayak, swim, weight lift) each worth their own points
24. When groups are toggled off, hide the group names in Settings
25. I don't feel any haptics
26. Still haven't figured out where to adjust the logged motions — feature could open up before the first-week shape reveal; could also be a `+` on top-right of Anchors that opens a grid editor for review and edit
27. The hex shape on the Anchors page — design spec said it should be beating/pulsing slower than a heartbeat but it's not coming through on my phone; might need contrast or density bump
28. Need to add point editing for Waypoints
29. App integration — meditation app, cooking app, exercise app — points added directly through those apps so I only have to track what isn't connected
30. Three Whys methodology for setting up a Swell (optional, CBT/positive-psychology). Example: "I want to spend this weekend writing/coding/building this project." → Why #1 (motions): "Because I want to see if this idea works in the real world." → Why #2 (swells): "Because I love turning chaos into something elegant and functional." → Why #3 (Anchors): "It gives me a sense of creative agency and self-reliance."

## Triage

### Resolved this session — folded into ADR 0008

- **#15 — Reflections → Anchors.** Josh decided: rename the surface. Entries also rename (drop an anchor / your anchors). Internal `reflections` table preserved per the internal/external split. `user_settings.mvs_anchors` JSON column renamed to `mvs_motions` to free the word. Route `/reflections` → `/anchors`. Locked-page line ("Not all those who wander are lost" — item #19) added on the same page. Hex-pulse contrast tuning (item #27) folded into the same session since both touch `LockedPage.tsx`.
- **#19, #27** — see above.

### Resolved this session — small spec clarifications

- **#9 — "duplicate motions per swell."** Reinterpreted with Josh as a *view mode on Motions*, not data duplication. A new "by swell" toggle on the Motions page lists motions under each swell-section-header, with the same motion appearing visually under every swell it feeds. Tap any instance to log once; credit distributes per existing `contribution_weight` allocations (ADR 0003 unchanged). Scoring system untouched. Moved to the quick-win batch (own line on the roadmap below).
- **#17 + #23 — sub-motion points distribution mode.** Josh's lean confirmed: when submotion rollup mode is on, logging swim + kayak = 20 pts, not 10. Mechanically: a per-parent `submotion_mode` setting (`distribute` = current auto-divide behavior; `rollup` = each child carries parent's full pts). Default for new parents = `distribute` to preserve current behavior. Submotion-create flow surfaces the choice on first add. Queued as part of the un-hide-submotions session (existing `SUBMOTIONS_ENABLED` flag flips at the same time).

### Polish batch (one session — surgical, no spec risk)

These are atomic UI changes that share no architectural risk. Ship them together for momentum.

- **#1 + #14** — Colored progress bars per swell. Use each swell's stored color on its weekly progress bar across Motions / Swells / Anchors. The previously-softened weekly-aggregate bar on `/swells` (3px tall, `bg-th-border`) stays soft as a teaching bar; the per-swell row bars take their swell color.
- **#5** — Drag handle moves to the motion checkbox. The rest of the row becomes a clean tap target for log/unlog. Existing `touch-action: none` rule on dnd-kit lists (working agreement in PROJECT.md) applies to the checkbox element rather than the whole row.
- **#6** — Paper lines under each motion row. Subtle bottom border, off-white in dark mode, off-paper in light. Doesn't add visual weight; just reinforces the paper-list aesthetic.
- **#8** — Default dark mode true black (`#000`) background. Affects Default theme dark variant. Bolinas / Biarritz dark variants stay theme-tinted.
- **#11** — Standardize bottom-nav height. Currently varies across pages — pick one canonical height and lock it.
- **#13** — Remove the search bar on Motions. Unused since the by-swell sort affordance arrives in the same batch.
- **#22** — `+` button inside a swell's proficiency view to add motions in-context. Opens the existing keyboard-takes-over add-motion form, scoped to that swell (motion-swell link auto-created at the swell's default contribution-weight).
- **#24** — When groups toggle is off in Settings, hide the group name + color rows below the toggle.
- **#9 (view mode)** — "By swell" sort on Motions page (third toggle alongside Flat / Grouped).

### Visual / typographic experiments (own session each — design-heavy)

- **#2** — Inline swell editing. Move name / color / weekly target out of the detail sheet into edit-in-place on the per-swell proficiency view. Affects `/swells/[id]` surface; medium-touch.
- **#4** — App icon redesign. **Josh doing in claude.ai/design.** Brief: organic swell shape, with a border; not a chart. Origami vibe was directionally right, execution was off.
- **#7** — "Add Motion" screen polish. Aesthetic pass; surface is keyboard-takes-over per the existing working agreement, but the form layout above the keyboard reads as unfinished.
- **#10** — Font swap experiment. Try Manrope as heading, IBM Plex as body, scoped to **Swells and Motions only** initially. Compare against the current IBM Plex display + Manrope body pairing from the design handoff. Live A/B in dev — pick a winner before merging anywhere else.
- **#16** — Anchors-page wave layering. Bring waves closer together; rule = closer to the bottom = more in the forefront; overlapping waves hide the wave behind them; all waves touching. Affects `WaveField.tsx` parameters (or its consumer in `LockedPage.tsx`).
- **#18** — Ombré dynamic top-of-screen progress bar (like Logbook). Different from the per-swell colored bars in the polish batch — this is the *daily* progress bar at the top of Motions, gradient-fills as the day progresses.

### Bigger features (own session each)

- **#21** — Wide-screen / desktop layout. Currently mobile-first; desktop reads as stretched mobile. Real layout pass needed — likely a sidebar nav replacing the bottom nav at `md:` breakpoint, multi-column where it makes sense.
- **#26** — Logged-motions editor. Two placement ideas, both good: (a) opens up *before* the first-week shape reveal so a new user can correct mis-logs before they see their shape; (b) `+` on top-right of Anchors that opens a grid editor for review and edit. Need to pick one or layer both. Surface design.
- **#28** — Point editing for Waypoints. Currently set on create; needs an edit affordance on the proficiency view's Waypoints section.
- **#30 — Three Whys for Swell setup.** Optional CBT-shaped flow that maps cleanly onto Onduler's existing Motion → Swell → Anchor stack (Why #1 = motion, Why #2 = swell, Why #3 = identity / anchor). Triggered when creating a new swell during onboarding or from Settings → Your shape. Skip-is-always-a-door applies. Substantial copywriting + UX design; deserves its own session.
- **#23 (un-hide submotions + rollup mode)** — see Resolved above. Per-parent `submotion_mode` setting; flips `SUBMOTIONS_ENABLED` on at the same time.

### Investigations (debugging, not features)

- **#20** — App performance ("still super slow"). Likely candidates: dashboard SSR has been parallelized but there may be N+1 queries on the swells page or the per-swell proficiency view's constellation render; the SwellRadar polygon math runs on every period change. Profile dashboard, swells page, and proficiency view; check for unnecessary re-renders and untyped query bloat.
- **#25** — Haptics not firing. Check whether the haptic API is being called at all (logging path through `quickLogMotion`); whether the user's device has the API enabled at the browser level; whether the `user_settings.haptic_enabled` flag is reaching the trigger.

### Future spec (not now, but commit to writing the doc)

- **#3 + #29 — App integrations.** Meditation / cooking / exercise apps push their completion → Onduler logs → swell points accrue automatically. Spec lives at `docs/specs/app-integrations.md` (to be written). Sketches the integration shape (OAuth + webhook per provider? generic ingest endpoint? Shortcuts/Watch-first?), the mapping from external completions to motions, and the conflict story (what if both the user and the integration log the same motion in the same window).

### Parked / Josh-owned

- **#12** — 20 colors via Adobe CC. Josh's task. Inputs the theme palettes once picked.
- **#4** — App icon. Josh's task (claude.ai/design).

## Roadmap deltas

PROJECT.md `Roadmap (next sessions)` table updates to add the queued sessions surfaced in this triage. Sessions D, E, F (Reflections D/E/F per ADR 0007) stay queued as-is — they belong to the Anchors surface and will be renamed in their own session row to track the surface rename.

See PROJECT.md for the updated table.
