export type AnchorPromptTheme = 'notice' | 'honor' | 'consider' | 'release' | 'invite' | 'see'

export type AnchorPrompt = {
  theme: AnchorPromptTheme
  text: string
}

export const ANCHOR_PROMPTS: AnchorPrompt[] = [
  { theme: 'notice',   text: 'What kept pulling at your attention this week?' },
  { theme: 'notice',   text: 'Where did your energy go without you deciding?' },
  { theme: 'notice',   text: 'What felt different about this week compared to last?' },
  { theme: 'notice',   text: 'What motion surprised you, either by showing up or by not?' },
  { theme: 'notice',   text: 'What did your body know before your mind caught up?' },
  { theme: 'honor',    text: 'What did you show up for, even when it was quiet?' },
  { theme: 'honor',    text: 'What took effort that nobody else saw?' },
  { theme: 'honor',    text: 'Where did you choose yourself this week?' },
  { theme: 'honor',    text: 'What motion felt like it mattered more than its points?' },
  { theme: 'honor',    text: 'What did you protect time for?' },
  { theme: 'consider', text: 'What would feel different if you gave it a little more room?' },
  { theme: 'consider', text: 'Which swell feels like it’s waiting for you?' },
  { theme: 'consider', text: 'What’s one thing you’d do differently if next week were a clean page?' },
  { theme: 'consider', text: 'Where are you spending time that doesn’t feel like yours?' },
  { theme: 'consider', text: 'What would the version of you six months from now want you to try?' },
  { theme: 'release',  text: 'What can you stop carrying for now?' },
  { theme: 'release',  text: 'What story about yourself has quietly expired?' },
  { theme: 'release',  text: 'What were you holding onto out of habit rather than want?' },
  { theme: 'release',  text: 'What motion no longer belongs in your week?' },
  { theme: 'release',  text: 'What expectation can you set down without guilt?' },
  { theme: 'invite',   text: 'What small thing keeps asking for more of your time?' },
  { theme: 'invite',   text: 'What would feel like a gift to your future self?' },
  { theme: 'invite',   text: 'What swell would grow if you just leaned toward it?' },
  { theme: 'invite',   text: 'What have you been curious about but haven’t started?' },
  { theme: 'invite',   text: 'What would your week look like if you said yes to one more thing?' },
  { theme: 'see',      text: 'What looked beautiful this week?' },
  { theme: 'see',      text: 'What did you notice that wasn’t yours?' },
  { theme: 'see',      text: 'What was the weather of your week?' },
  { theme: 'see',      text: 'Where did your eye go when you weren’t trying?' },
  { theme: 'see',      text: 'What did you walk past more than once?' },
]

export const THEME_LABELS: Record<AnchorPromptTheme, string> = {
  notice: 'Notice',
  honor: 'Honor',
  consider: 'Consider',
  release: 'Release',
  invite: 'Invite',
  see: 'See',
}
