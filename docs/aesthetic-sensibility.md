# Aesthetic sensibility brief

*A note from Josh, derived from a pass over 15 years of his Instagram grid (2011 to 2026). Meant as a reference for design decisions, copy decisions, marketing surfaces, and theme work. Not a spec.*

## The visual fingerprint

A handful of patterns repeat across more than a thousand posts. They are stable enough to treat as a personal aesthetic.

1. **Atmosphere before subject.** The most common single image is sky doing something interesting over water. Marina sunsets, sunrise behind the Campanile, pink clouds reflected in still bays, kayak silhouettes at golden hour. The subject is almost always weather and time of day, not the thing in the foreground.
2. **Water as through-line.** Marinas, sailboats, ferries, harbors, houseboats, rivers, fjords, canals. Water rarely appears alone. It is framed by masts, docks, people, or sky.
3. **Other people's art, constantly.** Murals, paste-ups, installation art, sculpture, graffiti faces, a Klimt detail, a Chiharu Shiota web of red yarn. He documents the built environment as if it were a gallery.
4. **Travel framed away from the postcard.** The Brandenburg Gate is small in a corner. Notre Dame is a silhouette. Tower Bridge is partial behind a streetlight. Foreign places get atmospheric framing, never the centered icon.
5. **Bay Area treated reverently.** Castro Theater, Grand Lake, SF City Hall lit for Pride, Sausalito houseboats, Point Reyes, Marin Headlands, Aquatic Park. The same atmospheric grammar as foreign cities.
6. **Self largely absent.** In 1,142 posts he is rarely the subject. When he appears, he is usually small in a landscape, walking away, or photographed by someone else. No gym selfies, no plated entrees, no outfit-of-the-day, no captions-as-personal-brand.
7. **Domestic warmth in soft window light.** Kilim rugs, wood stoves, sleeping pets, hand-drawn holiday cards from family with cartoon turkeys and giraffes and "love you big time, xo Rachel." The opposite of design-magazine perfection.
8. **Color story.** Deep sea blues, sunset orange and coral, fog gray, earth brown, twilight violet, the warm yellow of a window seen from the street. Saturated red only when it is someone else's art.

## What already lines up

Most of this is already in Onduler. That is worth naming, because it means the brand work is mostly about leaning in, not pivoting.

- The product *is* a wave. Tides, swells, anchors, wakes, ondulé. The water vocabulary is not borrowed, it is structural.
- The posture of the product, "we will be here when you surface," is the same posture as the grid. Quiet, not chasing, not center stage. The decision to never use the language of failure, deficit, or falling behind already matches a creator who does not put himself at the center of his own feed.
- The existing themes (Biarritz, Tjørnuvík, Bolinas) are atmospheric place names from his actual life, not productivity-app abstractions like "Focus" or "Calm."
- IBM Plex Mono for body copy reads like a notebook, not a SaaS dashboard. The handmade-card warmth from his family's tradition fits the same register.
- The Wake polygon, monochrome, breathing, no swell colors, is closer to a wave silhouette over water than to a stat. Right instinct.

## Where the sensibility could pull further into the product

These are places where the current implementation is fine but a small move would make it more *him*.

### Theme palettes

Add or refine palettes that are direct quotes from the grid rather than generic place-mood names.

- **Aquatic Park dusk:** deep navy ground, sunset coral as accent, the soft violet of San Francisco air at 7:45 pm. Replaces or supplements Default.
- **Sausalito fog:** Bolinas already lives here. Consider making it the default for users who land on the install page on a mobile device with low brightness, since the grid suggests this is the most-photographed mood.
- **Faroe stone:** slate, moss, sky. Cold, but lit. Would pair with the dramatic-weather welcome-back state.
- **Marina golden hour:** warm orange, dark hull silhouette, white mast pinpricks. Use for celebration washes, not for backgrounds.

The pattern: every theme should be the name of an actual place that the founder has photographed at a specific time of day. Avoid "Focus," "Calm," "Productivity."

### Photography in marketing surfaces

The landing page, the install instructions page, the Tester recruitment postcards, the email captures, anywhere a photograph could appear, should follow the grid's framing rules:

- No people centered. People as silhouettes, walking away, or out of frame.
- No products. No phones in hands. No screens.
- Weather doing something. Golden hour, fog, rain on glass, last light on water.
- If it has to be a city, frame it from a corner with sky doing more work than architecture.

Cheaper than commissioning new photography: pull from his existing grid (with permission to himself). The Bay Area marina shots, the Faroese hills, the Aquatic Park dusks, the kayak silhouettes are already on-brand because they *are* the brand.

### Anchor prompts

The current 25-prompt bank organized as notice / honor / consider / release / invite is already well-tuned. A handful of additions in the spirit of how he sees would fit:

- "What looked beautiful this week?"
- "What did you notice that wasn't yours?" (mirrors his habit of photographing other people's art)
- "What was the weather of your week?"
- "Where did your eye go when you weren't trying?"
- "What did you walk past more than once?"

These read as a photographer's prompts more than a coach's prompts. They invite noticing without asking for narrative.

### Voice rules

The product already avoids "you crushed it" language. Two further moves would harden the tone:

- **No second-person achievement language ever.** "You hit your target" → "Movement filled this week." Subject of the sentence is the swell or the wave, not the user.
- **Weather metaphors are allowed, sports metaphors are not.** "A gentle week," "the tide was low," "your week had fog in it" are in. "Hit a personal best," "crushed," "streak," "leveled up" are out.
- **One-word affirmations land harder than full sentences.** "Noticed." "Seen." "Marked." The family-card warmth comes from short hand-drawn notes, not paragraphs.

### Hand-drawn flourishes

The hand-drawn family cards are a strong recurring motif (turkeys, giraffes, ghosts, "happy halloween Joshua and Tanner," "merry christmas"). They are the warmest thing in the grid. The product is currently very clean SVG geometry. One small move:

- A single hand-drawn glyph at the end of a saved anchor entry. A tiny wave mark, a moon, a dot inside a circle. Not stamped automatically, drawn once by a real human (you, a friend, an illustrator) and reused as a closing mark. The way letterpress used to end a column with a fleuron.

This is the cheapest possible way to put a human hand inside an app full of geometric rigor.

### Confirmation animations

Logging a motion currently uses checkmarks and the tideline celebration. The grid suggests an alternative grammar for the smallest confirmations:

- A ripple expanding from the tap point, then fading. Not a checkmark.
- The Wake polygon redraws are already a perfect quiet confirmation. Lean on them harder. They are doing more brand work than the explicit celebration animation.

The tideline celebration at swell-target crossing is correct as the big moment. Most logs should not get the big moment, they should get the small moment, and the small moment should be a wave thing, not a UI-toolkit thing.

### The wake as an art object

The marketing wake SVG endpoint is one of the most aesthetically aligned things in the project. It is already an art object. Two extensions worth considering:

- Allow a user to export *their own wake* from a chosen week, month, or chapter as a printable SVG. The same endpoint, but seeded from real data. Hangable. Giftable. This converts the app's central visual metaphor into something physical, which the grid suggests he values (printed postcards, hand-drawn cards, paper).
- Name each generated wake. Not by seed number. By place + time. "Bolinas Tuesday." "Aquatic Park Friday." This is how he captions his photographs already (implicitly).

### What to keep off the product

A short list of things that would feel wrong, given the grid:

- Streak counters. The grid does not believe in linear progress; it believes in returning to the same harbor.
- Trophies, badges, ranks. No achievement vocabulary anywhere.
- Bright saturated UI accent colors used for emphasis. The grid uses saturation only when documenting someone else's art. The product should reserve saturation for the swell colors themselves, which are user-claimed identities.
- Stock photography of any kind.
- Sans-serif marketing copy in giant bold weights. The Manrope display sizes are already correct; do not let a future landing-page refresh push them larger.
- "You" as the grammatical subject of any positive feedback line.

## Punch list

The cheapest five moves to make Onduler look and feel more like Josh's grid:

1. **Add an Aquatic Park dusk palette** (deep navy, sunset coral, violet) as a fourth theme. One afternoon of token work.
2. **Replace any stock or generic illustration on marketing surfaces with photos pulled from his own grid.** Atmospheric, no people centered, weather doing the work.
3. **Add five photographer-style prompts to the anchor bank.** "What looked beautiful this week?" and four more like it.
4. **Commission a single hand-drawn glyph** (a wave mark, a moon, a dot in a circle) and place it at the bottom of every saved anchor entry as a closing mark.
5. **Ship "export this wake as a print"** from the proficiency view or the journal. Turns the central visual metaphor into a physical object users can keep.

## One sentence

If a stranger landed on Onduler cold and at the same time on Josh's Instagram, the goal is that they would assume both were made by the same person, and that person was more interested in noticing the world than in being noticed inside it.
