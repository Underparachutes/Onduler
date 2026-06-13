export const IMPORT_PROMPT_TEMPLATE = `You're helping me set up Onduler, a habit-tracking app. Based on everything I've shared with you, produce an "Onduler import doc" using the exact format below.

Onduler vocabulary (use these terms only — do NOT use "goals", "tasks", "habits", "activities", or "domains"):
- **Motion**: a daily activity I'd track (e.g., "Meditate", "Move my body", "Write")
- **Swell**: an aspirational area I'm building toward, with a weekly points target (e.g., "Movement", "Creativity"). A motion can contribute to multiple swells.
- **Group**: an organizational bucket for motions (e.g., "Morning routine", "Creative work"). Optional. A motion belongs to one group at most.

IMPORTANT: Output the entire doc inside a single markdown code block (triple backticks) so I can copy the raw text. Use exactly this structure:

\`\`\`
# Onduler Setup

## Swells
- Movement [target: 24]
  - Meditate
  - Move my body
  - Sleep well
- Creativity [target: 20]
  - Read
  - Practice an instrument

## Motions
- Meditate (2 pts)
- Move my body (3 pts)
- Sleep well (1 pt)
- Read (2 pts)
- Practice an instrument (3 pts)

## Groups
- Morning routine
  - Meditate
  - Move my body
- Evening routine
  - Read
  - Sleep well
\`\`\`

Rules:
- List 3-6 swells. Onduler needs at least 3 to draw its shapes.
- List 4-12 motions total. Substantial but not overwhelming.
- Every swell must have at least one motion under it, and every motion must appear under at least one swell.
- Motion points are 1, 2, or 3 — reserve 3 for the highest-effort/highest-impact motions.
- Every swell must include a [target: N]. Set N to about four logs per week of each motion under it: add up the points of the motions inside and multiply by 4. (Movement with a 2-pt and a 3-pt motion gets [target: 20].)
- Groups are optional. Skip the Groups section entirely if no natural grouping exists.
- A motion can appear under multiple swells but only one group.
- Don't add commentary, explanations, or formatting outside the code block. Just the raw markdown doc inside triple backticks.`
