# PawShare Academy lesson template

Use one copy of this template for each teammate's Academy module. Keep lessons
short, practical and suitable for a household caring for one dog. This is a
content format proposal; it does not define XP, unlocks, badges or streak rules.

## Module

- **Module ID:** stable kebab-case ID, for example `give-paw`
- **Course:** Dog tricks
- **Level:** course level/name, ordered by `position` in the course
- **Author:** teammate name
- **Estimated time:** minutes
- **Learning objectives:** one to three observable outcomes
- **Prerequisites:** none or stable module IDs

## Lesson

### 1. [Short section heading]

Explain one practical idea in plain language. Use short paragraphs and steps
that can be followed by a household member. State when a reader should stop and
ask a qualified trainer or veterinarian for help.

**Optional image**

- Description / alt text:
- Caption:
- Source and licence / permission:

**Optional video**

- Link:
- Publisher / creator:
- Captions or transcript available:
- Permission / licence:

Repeat sections as needed. Do not copy third-party lesson text, images or video
without permission. Do not use a video as the only way to understand a step.

## Try it together

- [ ] One small practice step
- [ ] One small practice step
- [ ] Stop condition or welfare check, if relevant

## Visual steps

Give the lesson three short, ordered steps that can be understood without an
image or video. Use original wording. If a future lesson adds media, include
descriptive alt text/captions and verify the source and reuse permission first.

## Reflection / performance record

Describe what the household may record after practice (for example, “responded
to the cue in a quiet room”). Do not promise progress or completion before a
member saves a practice record. Keep health advice within the source's evidence
and direct medical questions to a veterinarian.

## Knowledge check

- **Question:**
- **Answer:**
- **Feedback:** explain why, including a correction that is kind and useful.

## Implementation notes

- Completion is recorded only after an explicit user action, never by opening a
  lesson.
- Stable module IDs are required so saved progress survives content edits.
- A lesson author supplies content, not a separate progress or XP system.
- Use subchallenges only when the skill has genuinely distinct pieces that need
  separate sessions (for example, shaping, adding distance, then adding a mild
  distraction). Each part should have one observable goal and a few safe steps.
  Keep simple cues as one challenge. Part completion is shared and attributed,
  but awards no XP; only the explicit final challenge completion awards XP.
- Maria's demo progression rules: courses unlock in order; explicit completion
  awards 10 shared XP once per household/module; 50 XP advances one level;
  badges appear at 1, 5 and 20 completed modules; practice by any member counts
  toward the household streak in its time zone.
- The shared Academy has a progressive **Dog tricks** path as its
  main course. Its first challenges teach a reward marker, a hand target and
  simple cues, then build toward combinations such as a figure eight and tidy-up.
  Two IDs from the first release are retained internally so existing practice
  history and XP remain valid, but those care entries are no longer shown as
  Academy courses. Each active module has a stable ID and course position; a
  new module needs a matching append-only database migration before it is
  available in the shared app.
- Practice entries are editable/deletable by their author. Deleting a practice
  note removes that date from the streak if there is no other practice that day,
  while an earned module completion and its XP remain as shared progress.
