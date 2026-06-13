# Background image legibility

*Drafted in brainstorm session, 2026-06-01. Implementation in Claude Code.*

## Why

User-uploaded background images now sit between the sticky header and the bottom nav on every main surface (Motions, Swells, Anchors, Settings). The aesthetic is intentional and worth keeping: full-bleed photo as ambient atmosphere, content sitting directly on it, loading screen showing the photo unobstructed. The reference is editorial / magazine, not app-chrome-over-wallpaper.

Testing across the current ice and orange-figure photos surfaces three specific legibility failures. The fixes below are surgical. They preserve the photo's presence and the magazine feel. They do not add a global frosted scrim, do not darken the whole image, and do not introduce per-image brightness detection.

The principle: the photo is the atmosphere, the text is the focus. Fix only the letters that are losing.

## What's failing

In order of severity:

1. **Small secondary text vanishes against the photo.** Points values on the right of each motion row, "Last week: N pts" stats under each swell, every subtitle in Settings (e.g. "Add to your home screen" under Install Onduler), the "N hidden swell" expander at the bottom of Swells. Anything using `--th-muted` or `--th-secondary` against the photo.

2. **Logs radar slice fills wash out.** The translucent swell-colored fills get eaten by high-frequency photo texture (especially the ice). The polygon reads as a ghost instead of a chart.

3. **Radar perimeter labels lose against bright patches.** The swell name labels around the radar perimeter (Creativity, Adventure, etc.) sit in the most variable luminance zone of the photo.

## What's working (do not touch)

- Solid dark sticky header. Holds its own contrast.
- Bold colored swell name labels (CREATIVITY green, MIND yellow, MOVEMENT orange). Saturation beats luminance.
- Ombré progress bars. Gradient gives them edge contrast.
- Loading screen showing the full photo with the soft `onduler` wordmark centered. This is the gift moment of the photo upload feature.
- Solid dark bottom nav. *(Amended 2026-06-05: the nav becomes a detached floating pill per `bottom-nav-floating-pill-2026-06-05.md`. It stays a solid surface, so contrast is preserved; it just floats off the edge.)*

## Changes

### 1. Text-shadow on secondary text

> **Amended 2026-06-05** (see `anchors-refinement-2026-06-05.md` §3). The mirrored
> white-shadow rule below was tested in light mode and produced a blurry sticker outline on
> colored text over bright photos. Superseded by a single dark shadow in both modes:
> `text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);`. Drop the light-theme white branch. The rest of
> this section (scope, utility-class strategy) still applies.

Add a one-pixel text-shadow to every text element using `--th-muted` or `--th-secondary` as its color token, gated to surfaces where a background image is active.

```css
text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
```

A dark shadow only ever adds edge contrast, never a glow, so it behaves on light and dark photos alike. The shadow is invisible against solid surface tokens. It only does work when the contrast is genuinely fighting it. This is the same trick newspaper editorial layouts have used for a century.

Apply via a single utility class (e.g. `.on-photo-text`) added to body where image background is active, scoped down to muted text via `.on-photo-text [class*="text-th-muted"], .on-photo-text [class*="text-th-secondary"]`. The exact selector strategy is implementer's call. The point is one global rule, not per-component edits.

### 2. Weight bump on muted text

Bump `--th-muted` text on photo surfaces from font-weight 400 to 500. Same scope as the text-shadow rule above. This costs nothing visually on solid surfaces and pulls muted text out of the photo without changing its color.

### 3. Radar gets a tight backing

The Logs radar in `app/components/SwellRadar.tsx` and the Anchors page get a soft rounded backing under the polygon. Two options, pick one in implementation:

**Option A (preferred):** A `<rect>` inside the SVG, drawn first so it sits behind the polygon, filled at `rgba(var(--th-bg-rgb), 0.35)` with the radar's own corner radius. No backdrop-filter. Works everywhere, no iOS PWA risk.

**Option B:** Extend the existing dark header gradient 80 to 100px further down so the top of the radar sits in fade territory. Only addresses the top half of the radar perimeter. Cheaper but less complete.

Option A is the move. It hugs the radar specifically and leaves the rest of the photo open.

### 4. Radar perimeter label weight

Bump the radar perimeter label weight from current (likely 500) to 600. They are already short, capitalized, and small. The weight bump plus the text-shadow from change 1 carries them.

### 5. Gradient fades top and bottom

Add a soft dark gradient fade at both the top and bottom of the photo zone, transitioning from header / nav background into transparent over 24 to 40 pixels of the photo. Implemented as `linear-gradient(to bottom, var(--th-bg) 0%, transparent 100%)` at the top, mirrored at the bottom.

This is the single change that does the most for the magazine-cover feel. Hard edges between solid header and photo read as "two things stuck together." Soft fade reads as "this whole screen is one composition." Editorial layouts always do this.

The fade height should be roughly proportional to the header height so the visual rhythm holds. 32px is a reasonable starting value.

## What we're not doing

- **No global frosted scrim.** Considered and rejected. Kills the photo's presence. The whole reason users upload a photo is to see it.
- **No per-image overlay strength tuning.** Considered and rejected. The fixes above are image-agnostic, so brightness detection buys nothing.
- **No `mix-blend-mode` text tricks.** Goes chaotic fast on mixed-luminance photos.
- **No per-card glass.** Each row getting its own translucent backing changes the visual rhythm and reads as defensive rather than confident.
- **No changes to swell colors, radar slice opacity, or ombré progress bars.** They work.
- **No image cropping, blur preprocessing, or upload-time transforms.** The photo ships as the user uploaded it.

## Testing protocol

Before shipping, screenshot every main surface (Motions, Swells, Anchors, Settings) against three test photos chosen to break things:

1. **Beach noon shot.** Bright everywhere. Stress test for muted text and white slice fills.
2. **Forest shot.** Medium green everywhere. Stress test for swell colors competing with photo greens / yellows.
3. **Black-and-white portrait.** Mixed extreme luminance. Stress test for the radar slice colors looking jarring against monochrome.

If all four surfaces pass on all three photos with the changes above, the user's own uploads will almost certainly pass too.

Compare each screenshot to the same surface with no background image (the existing solid `--th-bg` rendering) to confirm the text-shadow and weight changes are invisible on the no-image baseline.

## Out of scope

- Per-page or per-swell background images (today's scope is the single global image).
- User control over scrim strength, fade height, or photo opacity. Picking a photo is the only knob the user gets.
- AI-assisted photo recommendations or curation.
- Reverting any of these changes per-theme. The fixes apply uniformly across Default, Bolinas, and Biarritz, and across light and dark mode (single dark shadow per the 2026-06-05 amendment).

## Risk notes

The text-shadow approach is durable but only against single-pixel luminance noise. If a user uploads a photo with high-frequency text-like patterns (a page of newsprint, a chart, dense foliage at certain crops), legibility may still degrade. Acceptable: that user uploaded a hostile photo. The app does not try to outguess them.

~~Light themes will need the mirrored white-shadow rule.~~ **Amended 2026-06-05:** light and dark both use the single dark shadow at `0.5` opacity. The earlier white-halo approach turned into a sticker outline on bright photos in light mode; a dark shadow adds edge contrast without a glow in either mode.

---

# Related: Anchors sticky bar rework

The Anchors sticky bar currently shows kicker, cycle label with chevron, three stats (pts total / pts per active day / active days), and a Week/Month toggle. The stats are pulled from the underlying logs, which makes the Anchors page read as a duplicate of the dashboard rather than its own surface. The bar is also visually busy in a way that fights the calmer, journal-shaped intent of Anchors.

Rework the sticky bar to match the Motions sticky pattern (period chevron + calendar icon + progress bar + eye icon) but with anchor-shaped meaning.

## Why now

The photo upload feature exposes how busy the current sticky bar is. Three stat blocks plus toggle pills plus chevron is a lot of chrome sitting on top of a beautiful image. Simpler chrome lets the photo breathe and lets the radar (the real content) lead.

The anchor count progress bar also gives the page a self-contained reason to exist: the dashboard tracks points, Anchors tracks reflection cadence. Two different measurements, two different surfaces.

## Changes

### New sticky bar layout

Match the Motions sticky pattern. Row 1: kicker (`ONDULER`) + `+` (existing). Row 2: cycle label (e.g. "Week of Sunday, May 31") with chevron + anchor count (e.g. "3 anchors"). Row 3: calendar icon + progress bar + eye icon.

Drop the three stat blocks (pts total / pts per active day / active days). Drop the Week/Month toggle pills (the eye icon takes over view switching).

### Calendar icon

> **Amended 2026-06-05** (see `anchors-refinement-2026-06-05.md` §1). On Anchors the calendar
> now navigates to `/anchors/journal`, not Motions week-view. The "correct your record" rationale
> below still governs the calendar on Motions and Swells; Anchors is the exception because the
> journal is the record of the reflective surface. The standalone "See all in your journal" link
> is retired in the same change (calendar is the single journal affordance).

Tapping the calendar on Anchors navigates to `/anchors/journal`.

The calendar icon's job on Motions and Swells is **"go correct your record."** Those are places a user might notice "that's not what actually happened," and a consistent affordance teaches one verb: this icon takes you to the editable week-view log so you can fix it. On Anchors that verb becomes "go to your journal," because the journal is where the reflective record lives.

Posture note: backfilling a forgotten log is still the witness-not-coach posture in action; on Anchors that happens through the inline anchor log and the period chevron rather than the calendar.

### Eye icon

Same eye affordance as the Motions filter icon. Tapping opens a popover with view options: **Week / Month / Quarter / Year**. Options are gated to unlocked cadences (matches the existing period filter locking from the 2026-05-25 batch). Selecting an option switches the anchors page period and the progress bar denominator.

URL guard: if the user navigates directly to `/anchors?period=year` and year is locked, fall back to `week` (existing behavior, keep it).

### Progress bar

Shows anchors logged in the active period over the user's anchor target for that period.

- Anchor count includes every row in `reflections` for the user, scoped to the active chapter, with `created_at` inside the period. Counts both ceremony anchors and free anchors equally.
- Target scales with period: weekly target × N, where N is weeks in the period. Calendar-month / calendar-quarter / calendar-year math from `lib/periods.ts` already handles this.
- Visual: same ombré gradient bar treatment as the daily progress bar on the dashboard. Bar height 3px, denominator readout at `text-[10px]`. Match the softened weekly aggregate pattern from the swells page so the chrome stays quiet.
- Celebration fires on target cross. Same trigger mechanism as swell target crosses. Color: use a calm anchor-appropriate hue, not a swell color.

### User-configurable anchor target

Schema: add `user_settings.anchor_target_per_week int NOT NULL DEFAULT 1`. Migration: `scripts/migrate-anchor-target.sql`.

Settings surface: a new row under Tracking and organization (e.g. "Anchor cadence" or "Anchor target"). Stepper input, range 0 to 7. Setting to 0 hides the progress bar entirely (the user opts out of the target without losing the ability to drop anchors).

Default of 1 maps to: "everyone hits this just by doing the weekly ceremony." Anything above 1 means the user wants journaling cadence on top of ceremony.

Copy in Settings: lead with the recommendation. Something like *"Anchor target — 1 per week recommended. Hitting the weekly ceremony covers this on its own."* Final wording in implementation.

## Voice and posture

The progress bar introduces a target on a surface that has otherwise stayed deliberately untargeted. Two guardrails:

1. **No deficit framing.** Empty state copy below target says something present-tense and inviting, not "you're behind." E.g. "Drop an anchor when something's worth marking" rather than "N more anchors to hit your target."
2. **Celebrate on cross.** Same celebration as swell target crosses. Hitting the anchor target should feel like a small win, mirror-shaped to how motion target crossings feel.

If the user sets target to 0, the progress bar is suppressed entirely. No "0/0" hairline, no empty progress affordance. Eye + calendar stay.

## Locked state

The locked `/anchors` page (engagement floor not met) does not get the new sticky bar chrome. The locked state stays full-bleed vibe surface with only the quiet `+` in the top-right per the existing Anchors + Journal v2 spec. Calendar / eye / progress bar appear only on the unlocked surface.

---

# Related: Content column indent

The photo upload feature exposes that body content runs flush to the screen edge. On solid theme backgrounds this reads as clean. Over a bleeding photo it reads as slapped on. Magazines always carry an inside margin against a full-bleed image; the app should too.

## Change

Bump horizontal padding on the main content column from current value (likely `px-4`, 16px) to `px-5` or `px-6` (20 to 24px). Sticky header and bottom nav stay full-width.

Apply globally rather than gated on photo presence. The extra 4 to 8 pixels of breathing room is harmless on solid backgrounds and necessary over photos. Avoids needing per-surface conditional padding.

## Surfaces affected

Every page that renders content under the sticky header: Motions, Swells, Anchors, per-swell proficiency view, Settings and its sub-routes, journal, locked Anchors, ceremony surfaces. Verify in screenshots that no horizontal layout (the radar SVG width especially) breaks at the new padding value.

## Out of scope

- Vertical indent / spacing between sticky bar and first content row. The current vertical rhythm reads fine; only the horizontal margin needs work.
- Per-theme indent tuning. One value across all themes.


