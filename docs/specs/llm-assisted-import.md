# Onduler — LLM-Assisted Import Feature Spec

**Date:** May 14, 2026
**Status:** Designed, not yet built.

## The core idea

Most apps require users to learn an import format. Onduler inverts this: the user has a natural-language conversation with their LLM of choice (Claude, ChatGPT, Gemini, etc.), asks the LLM to produce an "Onduler doc" using a prompt template Onduler provides, then uploads the resulting markdown. Onduler parses it and bulk-creates swells, motions, groups, and motion→swell assignments.

The user does no schema work. The LLM does the translation between "my life and goals" and "Onduler-shaped data." Onduler just receives and ingests.

This is the bootstrap experience. A new user can go from zero to a fully-configured Onduler in five minutes by having one good conversation with their LLM.

## Why this is the right shape

The LLM is good at understanding intent ("I want to track health, learning, and creative work; my main daily things are meditation, exercise, reading, writing"). The LLM is good at producing structured markdown when given a template. Onduler is good at executing inserts against its schema. Combining these three plays each tool to its strength.

The alternative — building a guided wizard in Onduler that walks the user through each swell/motion/group field — has been done by every habit app. It's slow, full of friction, and produces shallow setups because users get bored or fatigued mid-wizard.

LLM-assisted import lets the user spend their setup time *thinking about their life*, not clicking buttons.

## User flow

1. New user signs up → onboarding screen.
2. Onboarding offers three paths: **Quick start** (pre-selected motions), **Build your own** (manual setup), **Import from your AI** (the new path).
3. Import screen shows:
   - A short explanation of what to do
   - A big "Copy prompt" button that puts a ready-made prompt on the clipboard
   - A file upload area (drag-drop or tap-to-pick)
   - "Cancel" / "Back" controls
4. User goes to their LLM, pastes the prompt, adds their context ("here's a transcript of our last conversation about my goals" / "here's some notes I've taken about what I want to focus on"), gets back a markdown document.
5. User saves or copies the markdown, returns to Onduler, uploads.
6. Onduler parses and shows a preview: *"We'll create 3 swells, 12 motions, 2 groups. Confirm?"*
7. User confirms → entities are bulk-inserted → user lands on Dashboard with everything ready.

For existing users, the same import flow is available at Settings → Import. Behavior is append-only: nothing existing is touched. If a swell name or motion name collides with an existing one, skip the duplicate (or append " (2)" to the imported name — TBD).

## The prompt template

The user copies this prompt and feeds it to their LLM of choice along with their own context. The exact wording will need iteration; this is the starting draft:

> You're helping me set up Onduler, a habit-tracking app. Based on everything I've shared with you, produce an "Onduler import doc" using the exact format below.
>
> Onduler vocabulary (use these terms only — do NOT use "goals", "tasks", "habits", "activities", or "domains"):
> - **Motion**: a daily activity I'd track (e.g., "Meditate", "Move my body", "Write")
> - **Swell**: an aspirational area I'm building toward, optionally with a points target (e.g., "Be healthy", "Be a learner"). A motion can contribute to multiple swells.
> - **Group**: an organizational bucket for motions (e.g., "Morning routine", "Creative work"). Optional. A motion belongs to one group at most.
>
> Output format (markdown, exactly this structure):
>
> ```
> # Onduler Setup
>
> ## Swells
> - Be healthy [target: 50]
>   - Meditate
>   - Move my body
>   - Sleep well
> - Be a learner [target: 30]
>   - Read
>   - Practice an instrument
>
> ## Motions
> - Meditate (2 pts)
> - Move my body (3 pts)
> - Sleep well (1 pt)
> - Read (2 pts)
> - Practice an instrument (3 pts)
>
> ## Groups
> - Morning routine
>   - Meditate
>   - Move my body
> - Evening routine
>   - Read
>   - Sleep well
> ```
>
> Rules:
> - List 4-12 motions total. Substantial but not overwhelming.
> - Motion points are 1, 2, or 3 — reserve 3 for the highest-effort/highest-impact motions.
> - Swell targets are optional weekly point targets — only include them if a number feels meaningful given the motions inside.
> - Groups are optional. Skip the Groups section entirely if no natural grouping exists.
> - A motion can appear under multiple swells but only one group.
> - Don't add commentary, explanations, or formatting outside the structure above. Just the markdown doc.

The user pastes their context (conversation history, journal notes, etc.) below this prompt. The LLM produces a clean markdown doc. The user uploads it.

## Parser behavior

The parser should be **forgiving**. LLMs will sometimes invent fields, use slightly different vocabulary, or vary the markdown structure. The parser should:

- Accept variations on section headers: `## Swells`, `## SWELLS`, `## Swells:`, `# Swells`
- Normalize banned vocabulary: `## Goals` → treat as Swells, `## Tasks` / `## Habits` / `## Activities` → treat as Motions, `## Domains` → treat as Groups
- Extract motion points from parenthetical hints like `(2 pts)`, `(3pt)`, `[2]`, `: 2`
- Extract swell targets from any of `[target: 50]`, `(target 50)`, `→ 50 pts`, `– 50/week`
- Ignore unknown lines silently rather than crash
- Tally a "couldn't parse N lines" count at the end and show it in the preview

When motion-to-swell assignments are listed two ways (inside a Swell's bullet list AND in the standalone `## Motions` section), trust the standalone list for the motion's existence and use the swell-section nesting for assignments. Cross-reference by name (case-insensitive, whitespace-trimmed).

Same for motion-to-group assignments — trust the standalone Motions list for existence; the Groups section nesting is purely the assignment.

## Preview step

Before committing inserts, show the user a preview screen:

> **Ready to import:**
> - 3 swells: Be healthy (target 50), Be a learner (target 30), Be present
> - 12 motions: Meditate, Move my body, Sleep well, Read, Practice, ...
> - 2 groups: Morning routine, Evening routine
> - 5 swell assignments, 4 group assignments
>
> *Couldn't parse 1 line — it'll be ignored.*
>
> [Cancel] [Import]

User confirms → server action does bulk inserts in a transaction → revalidates Dashboard → user lands there with everything in place.

## Implementation notes

- **Onboarding integration:** Add a third button to the Welcome screen alongside "Quick start" and "Build your own": "Import from your AI." Tap → import flow.
- **Settings integration:** New row under Data section, alongside "Export your data." Label: "Import setup from your AI."
- **File handling:** Accept `.md` and `.txt`. Probably also accept paste-into-textarea for users who don't want to fiddle with file uploads. The textarea is honestly easier UX on mobile.
- **Server action:** `importFromMarkdown(userId, markdown: string): ImportPreview`. First pass: parse and return preview (no DB writes). Second action: `confirmImport(userId, parsed: ImportPreview): ImportResult` that does the bulk inserts.
- **Idempotency:** If the user uploads the same doc twice, second upload should detect existing names and skip silently (or surface "already exists" in the preview). Don't create duplicate motions named "Meditate."
- **Error surfacing:** If the doc is unparsable entirely (zero swells, zero motions found), tell the user clearly: "We couldn't find anything to import in this file. Check that the format matches the prompt we gave you, or try regenerating it."

## What this unlocks downstream

Once import is shipped, the same parsing infrastructure can serve other use cases:
- **Export → re-import as a sync mechanism** between two Onduler users (e.g., couples or partners tracking shared goals).
- **Templates** — pre-built Onduler docs Onduler itself ships for common use cases ("Athlete starter pack", "Writer starter pack") that the user can preview and import without involving an LLM.
- **Migration from competitors** — when someone exports their data from Habitica/Streaks/Strides, an LLM can convert that export into an Onduler doc using the same parser.

The import is more architecturally significant than it looks. It's the bridge between Onduler and every other system the user already has.

## Open questions for when this gets built

- **Should the prompt template be versioned?** Probably yes — the format will iterate. Users who copy the prompt from an older version of Onduler shouldn't break the parser. Solve by including a `# Onduler Setup v1` header line that the parser checks.
- **Should we support sub-motions in v1?** The current schema has parent_id for submotions. The prompt template above doesn't include them. Punt to v2.
- **Should we support contribution_weight in v1?** Same — the schema has it (the locked schema migration just added it) but the prompt template treats all assignments as weight 1.0. The LLM probably won't reason well about per-link weights anyway. Punt to v2.
- **Mobile file picker UX:** iOS file picker is awkward. Strongly consider letting the user paste markdown directly into a textarea as the primary path, with file upload as the fallback.
