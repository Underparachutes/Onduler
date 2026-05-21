// Placeholder prompt bank for free-form anchors. Themed groups per ADR 0007 —
// recycled MI-style questions organized by theme (notice / honor / consider
// / release / invite) rather than by cadence. Final wording lives in a
// follow-up session; these are stand-ins so the picker has shape.

export type AnchorPromptTheme = 'notice' | 'honor' | 'consider' | 'release' | 'invite'

export type AnchorPrompt = {
  theme: AnchorPromptTheme
  text: string
}

export const ANCHOR_PROMPTS: AnchorPrompt[] = [
  { theme: 'notice',   text: 'What did you notice about yourself this week?' },
  { theme: 'notice',   text: 'Where did your attention keep going?' },
  { theme: 'honor',    text: 'What did you show up for, even quietly?' },
  { theme: 'honor',    text: 'Whose week did you make a little better?' },
  { theme: 'consider', text: 'What would the next version of you do differently?' },
  { theme: 'consider', text: 'Which swell felt out of sync?' },
  { theme: 'release',  text: 'What can you let drift for now?' },
  { theme: 'release',  text: 'What story about yourself is no longer true?' },
  { theme: 'invite',   text: 'What small thing wants more of your time?' },
  { theme: 'invite',   text: 'What would feel like a gift to your future self?' },
]

export const THEME_LABELS: Record<AnchorPromptTheme, string> = {
  notice: 'Notice',
  honor: 'Honor',
  consider: 'Consider',
  release: 'Release',
  invite: 'Invite',
}
