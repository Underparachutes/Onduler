# Onduler — Claude Code session guide

## Read this first, every session

Always read `PROJECT.md` in this folder at the start of every session before responding to anything. PROJECT.md is the source of truth — product spec, vocabulary, design principles, data model, roadmap, and working agreements. Do not rely on memory from prior sessions; the file is the contract.

## Trigger phrase: "Onduler, Onduler"

When the user says **"Onduler, Onduler"**, that means they're ready to build. Do the following, in order:

1. **Recap where we left off.** Look at recent git log and the "Current state of the build" and "Roadmap" sections in PROJECT.md. Briefly summarize what was last shipped and what's next.
2. **Propose the next concrete step** based on the roadmap. Pick the next session's work, or pick up an unfinished thread from the prior session. State the choice and the rough scope.
3. **Wait for go-ahead** before writing code, then proceed.

## Ending a session

When the user signals they're wrapping up (or you hit a natural stopping point):

1. **Summarize what we did** in this session — bullet list, concrete.
2. **Queue the next session** — name what comes next from the roadmap, or what got deferred.
3. **Suggest a commit message** if there are uncommitted changes. Keep it short and present-tense (e.g. "Add intent toggle to motion creation").
4. **Update PROJECT.md** if anything in this session shifted the spec — current state of the build, roadmap, deferred items. Surgical edits, not rewrites.

## Working agreements (from PROJECT.md)

- Josh is not a professional developer. Walk through steps explicitly. Assume no implicit knowledge.
- Direct tone. No flattery. Push back when wrong.
- Stack is locked: Next.js (App Router), TypeScript, Tailwind, Supabase, Vercel. Don't propose alternatives.
- Default to action. State the choice, let the user redirect. Don't pile on clarifying questions when a reasonable default exists.
- Targeted edits over full rewrites. Surgical changes only. A prior rewrite accidentally reverted visual design — that lesson is permanent.
- Apply the vocabulary in PROJECT.md consistently. Motions, swells, groups, tide/wave. Never "tasks," "activities," "goals," "domains" in user-facing copy.
- Apply count-based pluralization in all UI strings.
- Follow the mirror principle in reports and empty states.
- Commit straight to `main`. No feature branches — the E2EE work that warranted them is done (decided 2026-06-19). Still only commit/push when asked.

## When in doubt

PROJECT.md is the contract. If something in this file conflicts with PROJECT.md, PROJECT.md wins. If the user's request conflicts with PROJECT.md, surface it — don't silently override the spec.

@AGENTS.md
