# Anchor prompts: a photographer's-eye theme

*Brainstorm session 2026-06-05 (Cowork). Implementation in Claude Code.*

From the aesthetic brief (`docs/aesthetic-sensibility.md`, §"Anchor prompts"). The current
25-prompt bank, organized as notice / honor / consider / release / invite, is well-tuned. The
brief proposes five prompts in the spirit of how Josh sees: they invite noticing without asking
for narrative. They read as a photographer's prompts, not a coach's.

**Decision.** Add these as a sixth sibling theme rather than folding them into Notice or scattering
them across existing themes. They cohere as a set, and a dedicated bucket honors the brief's
framing and keeps every theme's count balanced.

## Theme

- **Key:** `see`
- **Label:** `See`

`See` sits beside `Notice` deliberately. Notice is about where attention drifted (energy, motion,
the body). See is about the eye: light, weather, beauty, other people's work, the things you
passed. If `See` reads as too close to `Notice` in testing, the fallback label is `Look`. Pick one
and keep it; do not ship both.

## The five prompts

```
{ theme: 'see', text: 'What looked beautiful this week?' }
{ theme: 'see', text: 'What did you notice that wasn’t yours?' }
{ theme: 'see', text: 'What was the weather of your week?' }
{ theme: 'see', text: 'Where did your eye go when you weren’t trying?' }
{ theme: 'see', text: 'What did you walk past more than once?' }
```

Use curly apostrophes to match the existing entries in the file.

## Implementation, `lib/anchorPrompts.ts`

1. Add `'see'` to the `AnchorPromptTheme` union:
   ```ts
   export type AnchorPromptTheme = 'notice' | 'honor' | 'consider' | 'release' | 'invite' | 'see'
   ```
2. Append the five `{ theme: 'see', … }` entries to `ANCHOR_PROMPTS`.
3. Add the label to `THEME_LABELS`:
   ```ts
   see: 'See',
   ```

## Accordion picker, `/anchors/new`

The prompt picker is already a one-theme-at-a-time accordion driven off `THEME_LABELS` /
`ANCHOR_PROMPTS` (per the 2026-05-25 prompt-picker work). Adding a theme to those two sources
should surface the new accordion row automatically. Confirm:

- The new `See` row renders with its five prompts and the `+`/`−` expand indicator.
- Accordion ordering: append `See` as the last row. The established five-row order has muscle
  memory; the new theme arrives at the bottom rather than reshuffling the set.
- If the picker hardcodes a theme order array anywhere (rather than deriving from
  `THEME_LABELS`), add `'see'` to the end of that array.

## Voice and posture

These match the brief's voice rules: present-tense, no second-person achievement language, weather
metaphor explicitly welcome ("What was the weather of your week?"). No banned words. They invite
noticing, not reporting. No further copy review needed.

## Out of scope

- Reordering or rewording the existing 25 prompts.
- Per-theme weighting or randomization changes in how prompts are surfaced.
- Seasonal or time-of-day prompt variation.
