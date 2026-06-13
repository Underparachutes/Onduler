# Anchors refinement + photo legibility v2

*Brainstorm session 2026-06-05 (Cowork). Implementation in Claude Code.*

This spec captures four changes from a riff session over the new aesthetic brief and the
photo-upload screenshots. Two of them **amend** decisions in
`docs/specs/background-image-legibility.md`; those amendments are noted inline there too so the
two files do not contradict.

Posture check against the aesthetic brief (`docs/aesthetic-sensibility.md`): Anchors should read
as a journal-shaped surface, not a second dashboard. Every change below pulls toward that. The
reflective content leads; the stat breakdowns sink below it.

---

## 1. Calendar icon on Anchors goes to the journal

**Decision (supersedes legibility spec §"Calendar icon").** On the Anchors sticky bar, the
calendar icon navigates to `/anchors/journal`, not to Motions week-view.

Rationale: the legibility spec argued for one cross-app verb ("go correct your record") so the
calendar always lands on the editable week-view log. That logic holds on Motions and Swells. On
Anchors it does not. The journal *is* the record of the reflective surface, and the brief wants
Anchors to feel like its own place. Sending the calendar to the journal keeps the icon meaningful
without forcing Anchors to borrow the dashboard's meaning.

### Implementation

In `app/anchors/components/AnchorsToolbar.tsx`, the calendar `<Link>` currently points to
`/dashboard` with `aria-label="Go to motions"`. Change to:

- `href="/anchors/journal"`
- `aria-label="Go to your journal"`
- **Swap the glyph from the calendar to a book/journal icon** (decided 2026-06-05). The
  calendar glyph reads as "go to a date grid"; on Anchors the destination is the journal, so the
  icon should say "book." Keep the same `h-4.5 w-4.5`, stroke width 2, line-icon style, and the
  same position (left of the progress bar).

Replace the calendar `<svg>` body with this book glyph (lucide "book" shape, matches the existing
line-icon family):

```jsx
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
</svg>
```

This is Anchors-only. The calendar glyph stays as-is on Motions and Swells (those still go to the
editable week-view record).

### Retire the redundant journal link

With the calendar now opening the journal, the standalone "See all in your journal" text link
(rendered inside `InlineAnchorLog`) is redundant. Remove it. The calendar icon is the single
journal affordance on the unlocked Anchors surface.

The "Your past anchors" link on `/anchors/new` stays. That's a different context (you just dropped
an anchor, here's where it lives) and the calendar isn't present there.

---

## 2. Move the anchor entries up, above the stats

**Decision.** New section order on the unlocked Anchors page, top to bottom:

1. Sticky bar (period selector + anchor count + toolbar) *(unchanged)*
2. Pending-ceremony tiles *(unchanged)*
3. Hint card *(unchanged)*
4. **Radar** (`SwellRadar`)
5. **Anchors** (`InlineAnchorLog`) ← moved up
6. **By swell** breakdown
7. **Daily**
8. **Waves**
9. **Coming together** (locked-cadence tiles) *(unchanged, stays last)*

The reflective content (the anchor entries the user actually wrote) now sits directly under the
radar, above the by-swell and daily breakdowns. This is the journal-shaped ordering from the
brief: what you noticed leads, the measurement supports.

### Implementation, `app/anchors/page.tsx`

The current render order inside the unlocked return is: `SwellRadar` → then a
`totalValue === 0 ? <empty> : <>By swell / Daily / InlineAnchorLog / Waves</>` block.

Two moves:

1. **Pull `InlineAnchorLog` out of the `totalValue === 0` gate** and render it immediately after
   `SwellRadar`, unconditionally. Anchors should show whether or not motions were logged this
   period. Today, a period with zero logs hides the anchor entries entirely behind "No motions
   logged for this period." That's wrong for a journal surface: you can drop an anchor in a quiet
   week, and you should still see it.

2. **Keep By swell / Daily / Waves inside the `totalValue === 0` gate** in their current order. If
   there are no logs, those three correctly collapse to the empty line. The empty-line copy stays
   but moves below `InlineAnchorLog`.

Resulting JSX shape:

```
<SwellRadar … />
<InlineAnchorLog … />            // always rendered
{totalValue === 0 ? (
  <p>No motions logged for this period.</p>
) : (
  <>
    {/* By swell */}
    {/* Daily */}
    {/* Waves */}
  </>
)}
{/* Coming together (locked cadences) */}
```

Empty-state copy on the `totalValue === 0` branch: keep it present-tense and non-deficit per the
brief's voice rules. "No motions logged for this period." is acceptable as-is (it's a neutral
statement of fact, not "you're behind"). Leave it.

---

## 3. Light-mode legibility: dark shadow in both modes

**Decision (supersedes legibility spec §1 "Text-shadow on secondary text").** Use a single dark
text-shadow on photo surfaces in **both** light and dark mode. Drop the mirrored white-shadow
rule entirely.

```css
text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
```

Rationale, from the screenshots: the mirrored `rgba(255,255,255,0.7)` halo in light mode turns
colored text over a bright photo into a blurry sticker outline (see the Motions screenshot, the
blue motion names over the sky). A white glow on light-ish text over a light photo is the worst
case. A dark shadow only ever adds edge contrast, never a glow, so it behaves on light photos and
dark photos alike. This is the durable choice and it kills the blur.

Opacity dialed to `0.5` (down from the dark-mode `0.7` starting value) so it reads as a crisp
edge, not a drop shadow, in both modes.

### Implementation

Same scoping strategy the legibility spec already calls for: one global rule via an
`.on-photo-text` class on `<body>` when a background image is active, scoped to muted/secondary
text. The only change from that spec is the value (single dark shadow, `0.5`) and dropping the
light-theme branch.

Keep:

- The weight bump (§2 of the legibility spec): `--th-muted` text 400 → 500 on photo surfaces.
- The radar perimeter label weight bump (§4): 500 → 600.
- The radar backing rect (§3, Option A) and gradient fades (§5). Those are mode-agnostic already.

### Testing addition

The legibility spec's three test photos stand. Add one explicit pass: **light theme + bright
beach photo**, screenshot Motions and Swells, confirm the motion names and "Last week: N pts"
stats are crisp with no halo. This is the exact failure in the screenshots; it's the regression
gate.

---

## 4. Horizontal overflow / "floating indent" fix

**Symptom.** On Anchors (mobile), the page scrolls horizontally and content can be pushed off
screen to the right. Something also reads as a "weird floating indent."

**What's already correct.** The Anchors page wrapper is byte-identical to Motions:
`flex min-h-full flex-col items-center px-5` on the outer div, `w-full max-w-[22rem] lg:max-w-none`
on the inner column. So the wrapper is not the cause; one child on Anchors is wider than the
column and dragging the scroll width out.

Note: the `<body>` already carries `overflow-x-hidden` (`app/layout.tsx`). So the symptom may
present as content *clipped* off the right edge rather than a true horizontal scroll. Either way
the cause is the same (an over-wide child), and the fix below is the same. Don't lean on the body
guard as the fix; find and constrain the child.

### Implementation

1. **Find the offending child.** In devtools, with the mobile viewport active, walk the Anchors
   DOM for any element whose rendered width exceeds the `max-w-[22rem]` column (352px). Prime
   suspects, in order:
   - `SwellRadar`: its wrapper is `overflow-hidden`, so it *should* clip, but confirm the
     wrapper's own width isn't exceeding the column (the SVG `viewBox` extent is `(RADIUS + LABEL_PAD + 40) * 2`; verify the `<svg>` element renders at `w-full`, not at its intrinsic `VB_SIZE` px).
   - The `Coming together` `WaveField` canvas (DPR-aware; confirm it's `w-full`, not a fixed
     pixel width).
   - Any fixed-width column in the by-swell or daily rows (`w-20`, `w-16`, `w-14`) combined with
     `flex-1` (should be safe, but confirm the row sums to no more than the column width at 320px).

2. **Add a belt-and-suspenders guard.** On the outer scroll container for the Anchors route, add
   `overflow-x-hidden`. This contains any future stray-wide child without papering over the real
   one (fix the child first; keep the guard so a regression can't reintroduce a full-page
   horizontal scroll).

3. **"Floating indent."** Once the over-wide child is found and constrained to the column, the
   indent should resolve (it's almost certainly the narrower content sitting beside a child that
   bleeds wider, making the column look inset). Verify against Motions side by side at the same
   viewport: the left edge of every Anchors section should line up exactly with the left edge of
   the Motions checklist rows.

### Acceptance

At 320px, 375px, and 430px viewport widths, Anchors does not scroll horizontally, and every
content section's left edge aligns with Motions. The radar stays fully visible within the column
(no clipped labels beyond what `overflow-hidden` already trims).

---

## Voice and vocabulary check

No banned words (tasks / activities / goals / domains) introduced. Surf family intact (Anchor,
Swell, Motion, Wave, Tide). No em dashes in any shipped copy. The empty-state and journal-link
copy stay present-tense and non-deficit per the aesthetic brief's voice rules.

## Not in this spec

- The full Anchors sticky-bar rework (3-row layout, eye/calendar/progress). Already specced and
  shipped per the legibility doc and the 2026-06-01 Anchors v2 work. This spec only changes the
  calendar's destination.
- Aesthetic-brief punch-list items (Aquatic Park dusk palette, photographer prompts, hand-drawn
  closing glyph, wake-as-print export). Those are their own sessions.
