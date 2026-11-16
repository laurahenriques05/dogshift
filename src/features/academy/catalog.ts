export type AcademySection = { heading: string; text: string }
export type AcademyVisualStep = { title: string; text: string }
export type AcademySubchallenge = { id: string; title: string; objective: string; steps: string[] }
export type AcademySource = { label: string; url: string }
export type AcademyModule = {
  id: string
  courseId: string
  courseTitle: string
  courseDescription: string
  position: number
  level: number
  title: string
  estimatedMinutes: number
  objective: string
  sections: AcademySection[]
  visualSteps: AcademyVisualStep[]
  subchallenges?: AcademySubchallenge[]
  checklist: string[]
  question: string
  answer: string
  feedback: string
  sources: AcademySource[]
}

export type AcademyCourse = {
  id: string
  title: string
  description: string
  modules: AcademyModule[]
}

// XP and badges stay shared by the household. Each challenge completion is
// awarded once per module; practice attempts remain attributed to each person.
export const ACADEMY_RULES = { xpPerModule: 10, xpPerLevel: 50, badgeModuleCounts: [1, 5, 20] }

const sources = {
  rewardTraining: { label: 'Dogs Trust: reward-based training', url: 'https://www.dogstrust.org.uk/dog-advice/training/techniques/positive-reinforcement-training-with-rewards' },
  target: { label: 'Dogs Trust: target training', url: 'https://www.dogstrust.org.uk/dog-advice/training/tips-tricks/target-training' },
  sit: { label: 'Dogs Trust: teach your dog to sit', url: 'https://www.dogstrust.org.uk/dog-advice/training/basics/sit-training' },
  paw: { label: 'Dogs Trust: give paw or high-five', url: 'https://www.dogstrust.org.uk/dog-advice/training/tips-tricks/high-five-training' },
  stay: { label: 'Dogs Trust: stay training', url: 'https://www.dogstrust.org.uk/dog-advice/training/basics/stay-training' },
  spin: { label: 'Blue Cross: teach your dog to spin', url: 'https://www.bluecross.org.uk/advice/dog/behaviour-and-training/how-to-teach-your-dog-to-spin' },
  figureEight: { label: 'Dogs Trust: figure of eight', url: 'https://www.dogstrust.org.uk/dog-advice/training/tips-tricks/figure-of-eight' },
  tidy: { label: 'Dogs Trust: tidy up toys', url: 'https://www.dogstrust.org.uk/dog-advice/training/tips-tricks/tidying-up' },
  humaneTraining: { label: 'AVSAB: humane dog training', url: 'https://avsab.org/wp-content/uploads/2021/08/AVSAB-Humane-Dog-Training-Position-Statement-2021.pdf' },
  behaviour: { label: 'RSPCA: understanding dog behaviour', url: 'https://www.rspca.org.uk/adviceandwelfare/pets/dogs/behaviour' },
}

const tricksCourse = {
  id: 'trick-training',
  title: 'Dog tricks',
  description: 'Teach one trick at a time, from first cues to fun combinations, with short reward-based practice at your dog’s pace.',
}

type TrickContent = Omit<AcademyModule, 'courseId' | 'courseTitle' | 'courseDescription'>
const trickContent: TrickContent[] = [
  {
    id: 'marker-and-reward', position: 1, level: 1, title: 'Teach a “yes” marker', estimatedMinutes: 3,
    objective: 'Give your dog a clear signal that tells them which action earned a reward.',
    sections: [
      { heading: 'Choose a reward', text: 'Pick something your dog enjoys, such as a tiny food treat, a toy or a short game. Practise when your dog is relaxed in a quiet, familiar place.' },
      { heading: 'Pair the word and reward', text: 'Say “yes” in a calm, consistent voice, then immediately give the reward. Repeat a few times with a short pause between each pair.' },
      { heading: 'Mark a simple choice', text: 'Wait for your dog to look towards you or move naturally. Say “yes” at that moment and reward. Keep sessions brief; never use the marker to scare or startle your dog.' },
    ],
    visualSteps: [{ title: 'Say', text: 'Use the same short word: “yes”.' }, { title: 'Reward', text: 'Give something your dog likes right away.' }, { title: 'Practise', text: 'Mark a few easy choices, then take a break.' }],
    checklist: ['Choose a reward your dog likes', 'Pair “yes” with the reward a few times', 'Mark one relaxed look or movement'],
    question: 'What should happen immediately after “yes” while the marker is new?', answer: 'Give the reward straight away.',
    feedback: 'The marker tells your dog which moment earned the reward; pairing them clearly helps your dog learn.',
    sources: [sources.rewardTraining, sources.humaneTraining],
  },
  {
    id: 'nose-target', position: 2, level: 1, title: 'Touch your hand', estimatedMinutes: 4,
    objective: 'Teach a nose touch that becomes a useful building block for other tricks.',
    sections: [
      { heading: 'Offer a still hand', text: 'Hold an open hand a few centimetres from your dog’s nose in a quiet space. Do not move it into their face; wait and let them choose to investigate.' },
      { heading: 'Mark a nose touch', text: 'When your dog sniffs or touches your hand with their nose, say “yes” and reward. If they do not approach, make it easier by moving your hand closer or ending and trying later.' },
      { heading: 'Add the cue later', text: 'After your dog is happily touching your hand, say “touch” just before you offer your hand. Practise from slightly different positions, one small change at a time.' },
    ],
    visualSteps: [{ title: 'Offer', text: 'Present a still hand nearby.' }, { title: 'Mark', text: 'Say “yes” when the nose touches.' }, { title: 'Reward', text: 'Pay the touch; gradually add “touch”.' }],
    checklist: ['Offer your hand without moving it toward the dog', 'Mark and reward a voluntary nose touch', 'Try the word “touch” before the hand signal'],
    question: 'Should you push your hand against your dog’s nose?', answer: 'No. Let your dog choose to approach and touch it.',
    feedback: 'The target is an invitation. Choice keeps the exercise comfortable and helps your dog stay engaged.',
    sources: [sources.target, sources.rewardTraining],
  },
  {
    id: 'sit', position: 3, level: 1, title: 'Sit', estimatedMinutes: 4,
    objective: 'Help your dog discover a sit, then pair it with a word and hand signal.',
    sections: [
      { heading: 'Set up', text: 'Stand or kneel in front of your dog with a small reward ready. Use a non-slip surface and give them enough room to move.' },
      { heading: 'Reward the movement', text: 'Move the reward slowly from near the nose up and slightly back. As your dog’s head follows, wait for their bottom to touch the floor; mark “yes” and reward. If they step backwards or jump, make the hand movement smaller.' },
      { heading: 'Add the cue', text: 'When your dog is sitting readily with the hand movement, say “sit” just before it. Gradually use a smaller hand signal. Never push your dog’s body into position.' },
    ],
    visualSteps: [{ title: 'Lure gently', text: 'Move a treat up and slightly back.' }, { title: 'Mark the sit', text: 'Say “yes” when the bottom touches down.' }, { title: 'Name it', text: 'Add “sit” before the familiar hand signal.' }],
    checklist: ['Practise on a non-slip surface', 'Reward one voluntary sit', 'Say “sit” before the hand signal'],
    question: 'What should you do if your dog steps away instead of sitting?', answer: 'Make the movement smaller or pause; do not push them down.',
    feedback: 'Let the dog find the position themselves. Smaller steps reduce confusion and keep the exercise comfortable.',
    sources: [sources.sit, sources.rewardTraining],
  },
  {
    id: 'give-paw', position: 4, level: 2, title: 'Give a paw', estimatedMinutes: 4,
    objective: 'Shape a voluntary paw lift into a gentle paw-giving trick.',
    sections: [
      { heading: 'Start with a sit', text: 'Practise in a quiet place once your dog is comfortable sitting. Keep your hands low and relaxed, with a reward ready.' },
      { heading: 'Catch a small paw movement', text: 'Wait briefly. If your dog shifts weight or lifts a paw naturally, mark “yes” and reward. If nothing happens, pause or use the nose-target lesson to invite a paw touch to your open hand.' },
      { heading: 'Build the gesture', text: 'Gradually reward a clearer paw lift, then offer your open palm. Add “paw” only when the movement is familiar. Do not pick up, pull or squeeze the paw; stop if your dog avoids touch.' },
    ],
    visualSteps: [{ title: 'Wait', text: 'Invite a sit and keep your palm open.' }, { title: 'Notice', text: 'Mark any comfortable paw lift.' }, { title: 'Shape', text: 'Build toward a light paw touch; add the cue later.' }],
    checklist: ['Begin with a comfortable sit', 'Reward a voluntary paw movement', 'Keep touch brief and let the dog opt out'],
    question: 'Should you lift your dog’s paw to show them the trick?', answer: 'No. Reward voluntary movement and do not force handling.',
    feedback: 'A voluntary paw touch is safer and clearer than physically moving the dog’s limb.',
    sources: [sources.paw, sources.rewardTraining],
  },
  {
    id: 'lie-down', position: 5, level: 2, title: 'Lie down', estimatedMinutes: 5,
    objective: 'Guide your dog from a sit toward a relaxed down, without pressing on their body.',
    sections: [
      { heading: 'Begin from a sit', text: 'Choose a comfortable, non-slip surface. If your dog has trouble lowering themselves, seems stiff or avoids the movement, skip this challenge and ask your vet for advice.' },
      { heading: 'Guide toward the floor', text: 'Hold a reward near the nose and slowly lower it between the front paws, then a little forward. Mark and reward small progress such as lowering the head or elbows.' },
      { heading: 'Reward the full position', text: 'When your dog lies down comfortably, mark and reward. Repeat in short sessions, then add “down” just before the hand movement. Never push their shoulders or back.' },
    ],
    visualSteps: [{ title: 'Start seated', text: 'Use a comfortable, non-slip spot.' }, { title: 'Lower slowly', text: 'Guide the nose toward the floor.' }, { title: 'Reward progress', text: 'Mark small steps and the relaxed down.' }],
    checklist: ['Check that your dog is comfortable lowering down', 'Reward a small movement toward the floor', 'Add “down” only after the gesture is familiar'],
    question: 'What if your dog looks stiff or uncomfortable?', answer: 'Stop the exercise; do not lure or push through discomfort.',
    feedback: 'Tricks should suit the dog’s body. A vet can advise when movement or pain is a concern.',
    sources: [sources.rewardTraining, sources.behaviour],
  },
  {
    id: 'spin', position: 6, level: 2, title: 'Spin in a circle', estimatedMinutes: 5,
    objective: 'Shape a comfortable turn into a circle, then add a word cue.',
    sections: [
      { heading: 'Check the space', text: 'Use a level, non-slip floor with enough room. Keep the lure close to your dog’s nose and move slowly so they do not need to leap or twist sharply.' },
      { heading: 'Build the turn in pieces', text: 'Guide a small head turn and reward. Gradually lure a quarter turn, then a half turn, rewarding each comfortable step. Join the steps only when your dog is moving easily.' },
      { heading: 'Fade the lure', text: 'When your dog can follow the full circle, repeat the hand motion without food in your hand and reward from the other hand. Add “spin” before the gesture, then make the gesture smaller.' },
    ],
    visualSteps: [{ title: 'Turn', text: 'Reward a small, easy head turn.' }, { title: 'Grow', text: 'Build quarter turns into a full circle.' }, { title: 'Cue', text: 'Add “spin”, then reduce the hand signal.' }],
    checklist: ['Use a non-slip, open area', 'Reward a partial turn before asking for more', 'Stop if your dog seems dizzy or uncomfortable'],
    question: 'If your dog struggles with a full circle, what should you do?', answer: 'Go back to a smaller turn and reward that step.',
    feedback: 'Shaping small movements keeps the challenge achievable and avoids forcing a tight turn.',
    sources: [sources.spin, sources.rewardTraining],
  },
  {
    id: 'high-five', position: 7, level: 3, title: 'High-five', estimatedMinutes: 5,
    objective: 'Turn the paw touch into a gentle high-five at a comfortable height.',
    sections: [
      { heading: 'Use a familiar paw touch', text: 'Start after your dog understands “give a paw”. Sit or kneel so you can offer your hand low, close to their natural paw reach.' },
      { heading: 'Raise the hand gradually', text: 'Offer your palm a little higher than before. Mark and reward a gentle paw touch. Raise the height only by a small amount while your dog stays relaxed.' },
      { heading: 'Add the cue', text: 'When the hand gesture predicts the touch, say “high-five” just before showing your palm. Keep the final height low enough that your dog does not need to jump.' },
    ],
    visualSteps: [{ title: 'Start low', text: 'Offer your palm near paw height.' }, { title: 'Lift slightly', text: 'Raise it a little; reward a gentle touch.' }, { title: 'Name it', text: 'Add “high-five” before the signal.' }],
    checklist: ['Begin with a familiar paw touch', 'Keep all four paws comfortably on the floor', 'Stop before your dog needs to jump or stretch'],
    question: 'Should a high-five require your dog to jump up?', answer: 'No. Keep the target low and movement comfortable.',
    feedback: 'The trick should be adapted to the dog’s size, age and mobility.',
    sources: [sources.paw, sources.rewardTraining],
  },
  {
    id: 'stay', position: 8, level: 3, title: 'Stay until your release cue', estimatedMinutes: 5,
    objective: 'Build a brief pause in a comfortable position, then release your dog clearly.',
    subchallenges: [
      { id: 'short-stay', title: 'A one-second pause', objective: 'Help your dog stay relaxed for one second while you remain close.', steps: ['Ask for a familiar sit or down.', 'Say “stay”, pause for one second, then mark and reward before your dog moves.', 'Say “free” and finish the repetition.'] },
      { id: 'one-step-away', title: 'You take one step', objective: 'Add a little distance without increasing the waiting time.', steps: ['Begin with the easy one-second pause.', 'Take one small step away and return straight away.', 'Reward while your dog is still in place, then release.'] },
      { id: 'mild-distraction', title: 'Stay with a small distraction', objective: 'Practise the familiar stay while something mild happens nearby.', steps: ['Choose a quiet, safe room and keep the distance easy.', 'Make one small movement, such as shifting your weight.', 'Return, reward and release; make it easier if your dog gets up.'] },
    ],
    sections: [
      { heading: 'Choose an easy position', text: 'Ask for a sit or down your dog already knows. Stay close. Have a release word such as “free” ready so your dog knows when the pause has ended.' },
      { heading: 'Add one second', text: 'Say “stay”, wait one second, return your hand to a neutral position and reward while your dog is still there. Say “free” and invite them to move.' },
      { heading: 'Increase one thing at a time', text: 'Build duration in small increments before adding distance or distractions. If your dog moves, calmly reset at an easier level. Never leave a dog in a stay unattended or use it near hazards.' },
    ],
    visualSteps: [{ title: 'Settle', text: 'Ask for a known sit or down.' }, { title: 'Pause', text: 'Wait briefly, staying close.' }, { title: 'Release', text: 'Return, reward, then say “free”.' }],
    checklist: ['Practise close by in a safe place', 'Reward a one-second pause', 'Use a clear release cue'],
    question: 'If your dog gets up, should you scold them?', answer: 'No. Reset at an easier duration or finish the session.',
    feedback: 'A shorter successful pause teaches more clearly than asking for too much too soon.',
    sources: [sources.stay, sources.rewardTraining],
  },
  {
    id: 'roll-over', position: 9, level: 4, title: 'Roll over', estimatedMinutes: 6,
    objective: 'Shape a gentle roll only if your dog is comfortable lying on their side.',
    subchallenges: [
      { id: 'comfortable-side', title: 'Comfortable on one side', objective: 'Check that your dog can choose a relaxed side-lying position.', steps: ['Use a soft, non-slip surface.', 'Invite a comfortable down; do not move your dog’s body.', 'Reward a voluntary weight shift only if your dog stays relaxed.'] },
      { id: 'follow-shoulder', title: 'Follow toward the shoulder', objective: 'Build a small head and shoulder turn without asking for a full roll.', steps: ['From a comfortable down, move a treat slowly toward one shoulder.', 'Mark and reward a small voluntary turn.', 'Stop if your dog shows stiffness, worry or avoidance.'] },
      { id: 'complete-roll', title: 'Join the roll', objective: 'Connect the comfortable movements into a gentle roll at your dog’s pace.', steps: ['Start from the easiest movement your dog already offers.', 'Guide only a little farther; never push or pull.', 'Reward the full movement only if it remains comfortable.'] },
    ],
    sections: [
      { heading: 'Check that this trick suits your dog', text: 'This movement is optional. Skip it for dogs with pain, mobility issues, recent surgery, or discomfort lying on their side. Ask your vet if you are unsure. Use a soft, non-slip floor.' },
      { heading: 'Reward small weight shifts', text: 'From a comfortable down, guide a treat slowly toward one shoulder so your dog follows with their head. Mark and reward small shifts onto one hip or shoulder. Do not push or roll your dog.' },
      { heading: 'Build only while relaxed', text: 'Over short sessions, reward a little more movement at a time. Add “roll over” only after the full motion is easy. Stop at any sign of stiffness, worry or frustration.' },
    ],
    visualSteps: [{ title: 'Check comfort', text: 'Skip if there is pain or mobility concern.' }, { title: 'Shape slowly', text: 'Reward small voluntary weight shifts.' }, { title: 'Stop early', text: 'No pushing; finish if the dog seems unsure.' }],
    checklist: ['Confirm the movement is suitable for your dog', 'Use a soft, non-slip surface', 'Reward only relaxed, voluntary progress'],
    question: 'Should you physically roll your dog to show the trick?', answer: 'No. Never push, pull or roll the dog into position.',
    feedback: 'This is an optional advanced trick. Comfort comes before completing the movement.',
    sources: [sources.rewardTraining, sources.behaviour],
  },
  {
    id: 'figure-eight', position: 10, level: 4, title: 'Figure eight around two markers', estimatedMinutes: 6,
    objective: 'Combine targeting and turning into a smooth figure-eight pattern.',
    subchallenges: [
      { id: 'left-loop', title: 'First wide loop', objective: 'Practise one easy curve around a single stable marker.', steps: ['Place one safe, stable marker on a non-slip surface.', 'Guide a wide curve using a hand target or treat.', 'Reward and reset before practising again.'] },
      { id: 'right-loop', title: 'The other direction', objective: 'Help your dog make an equally comfortable curve the other way.', steps: ['Move to the other side of the marker or use a second marker.', 'Invite one wide, unhurried curve.', 'Reward the easy turn; increase space if it feels tight.'] },
      { id: 'join-loops', title: 'Connect both loops', objective: 'Join the two familiar curves into a wide figure eight.', steps: ['Set two stable markers well apart.', 'Guide one loop, then continue into the second.', 'Reward the whole pattern only when both turns stay comfortable.'] },
    ],
    sections: [
      { heading: 'Set up safely', text: 'Place two large, stable, non-slip objects well apart on a level surface. They must not tip, have sharp edges or tempt your dog to jump. Begin with generous space.' },
      { heading: 'Guide one loop at a time', text: 'Use a hand target or treat near the nose to invite a wide curve around one object. Reward the turn, reset, then practise the other side. If your dog cuts in or seems unsure, move the objects farther apart.' },
      { heading: 'Join the loops', text: 'When each curve is easy, guide a wide path around both objects in a figure eight. Reward after the pattern, then gradually fade the lure and add a cue such as “weave”.' },
    ],
    visualSteps: [{ title: 'One loop', text: 'Guide a wide turn around one marker.' }, { title: 'Other side', text: 'Practise the second turn separately.' }, { title: 'Join', text: 'Connect both curves into a figure eight.' }],
    checklist: ['Use two stable, safe markers', 'Reward each easy loop separately', 'Keep the turns wide and unhurried'],
    question: 'What should you change if the turns look tight or awkward?', answer: 'Move the markers farther apart and make the route wider.',
    feedback: 'A wider route is easier and more comfortable; complexity comes from joining the skills, not rushing them.',
    sources: [sources.figureEight, sources.rewardTraining],
  },
  {
    id: 'tidy-up-toys', position: 11, level: 5, title: 'Tidy up a toy', estimatedMinutes: 7,
    objective: 'Chain a few small actions so your dog places one safe toy in a basket.',
    subchallenges: [
      { id: 'pick-up', title: 'Pick up a safe toy', objective: 'Build a voluntary pick-up with one familiar, large toy.', steps: ['Choose a toy your dog does not shred or swallow.', 'Reward looking at or touching it, then build toward a gentle pick-up.', 'Keep the session supervised and short.'] },
      { id: 'carry-to-basket', title: 'Carry it to the basket', objective: 'Add a few comfortable steps while your dog holds the toy.', steps: ['Place a low, stable basket nearby.', 'Reward one or two steps toward it with the toy.', 'Return to an easier distance if your dog drops or seems unsure.'] },
      { id: 'drop-in-basket', title: 'Drop it in', objective: 'Connect carrying the toy with a voluntary drop inside the basket.', steps: ['Begin close to the basket.', 'Wait for a voluntary drop over the basket and reward.', 'Join pick-up, carry and drop only when each part is familiar.'] },
    ],
    sections: [
      { heading: 'Choose safe equipment', text: 'Use one large, familiar toy that your dog does not shred or swallow, and a low, stable basket. Supervise throughout. Do not use small objects, food wrappers or anything your dog guards.' },
      { heading: 'Build the pieces separately', text: 'First reward looking at or touching the toy. Later reward picking it up, then carrying it near the basket. Keep each step easy and stop if your dog starts chewing or guarding.' },
      { heading: 'Teach the drop', text: 'Reward a voluntary drop over the basket. Gradually connect pick-up, carry and drop. Add “tidy up” when the chain is familiar. This is a complex challenge; progress can take many short sessions.' },
    ],
    visualSteps: [{ title: 'Pick up', text: 'Reward a safe toy being lifted.' }, { title: 'Carry', text: 'Shape a few steps toward the basket.' }, { title: 'Drop', text: 'Reward a voluntary drop inside it.' }],
    checklist: ['Use one large, familiar toy and a stable basket', 'Practise one piece of the chain at a time', 'Supervise and stop if chewing or guarding starts'],
    question: 'Does your dog need to finish the whole chain in one session?', answer: 'No. Practise one small piece at a time over multiple sessions.',
    feedback: 'Complex tricks are built by connecting easy actions. Take breaks and keep the experience enjoyable.',
    sources: [sources.tidy, sources.rewardTraining],
  },
]

const trickModules: AcademyModule[] = trickContent.map(module => ({
  ...module,
  courseId: tricksCourse.id,
  courseTitle: tricksCourse.title,
  courseDescription: tricksCourse.description,
}))

// These two stable IDs were already released and may have household history.
// Keep their history, but do not show them in the trick path or reuse their IDs.
const archivedModules: AcademyModule[] = [
  {
    id: 'daily-care-check-in', courseId: 'everyday-care', courseTitle: 'Everyday care', courseDescription: 'Archived first-release content.',
    position: 1, level: 1, title: 'A kind daily check-in', estimatedMinutes: 3,
    objective: 'Notice what your dog needs today and share one small care routine.',
    sections: [
      { heading: 'Notice your dog first', text: 'Take a moment to notice your dog’s usual energy, comfort and interest in their surroundings. Small changes are useful context to share with your household.' },
      { heading: 'Choose one steady routine', text: 'Pick one simple care moment your family can make predictable, such as preparing for a walk or settling down after play. Keep it calm and suited to your dog.' },
      { heading: 'Keep notes useful', text: 'Record what you observed in plain language. If you have a health concern or a sudden change, contact your veterinarian; this lesson is not medical advice.' },
    ],
    visualSteps: [{ title: 'Observe', text: 'Compare with your dog’s usual behaviour.' }, { title: 'Share', text: 'Tell the household one useful detail.' }, { title: 'Choose', text: 'Pick one calm routine for today.' }],
    checklist: ['Notice one thing your dog enjoys today', 'Choose one small routine to share', 'Write down a question for your vet or trainer if you have one'],
    question: 'If your dog has a sudden health or appetite change, should this lesson replace veterinary advice?', answer: 'No. Contact your veterinarian about health concerns.',
    feedback: 'Everyday-care lessons can help with routines, but a veterinarian is the right person for health concerns.', sources: [sources.behaviour],
  },
  {
    id: 'walking-basics', courseId: 'everyday-care', courseTitle: 'Everyday care', courseDescription: 'Archived first-release content.',
    position: 2, level: 1, title: 'A happier walk, together', estimatedMinutes: 2,
    objective: 'Prepare a comfortable walk and recognize that GPS statistics are estimates.',
    sections: [
      { heading: 'Before you step outside', text: 'Check that the lead and harness fit securely, bring poo bags and water, and choose a route suitable for the weather. In hot weather, pick cooler hours and avoid hot surfaces.' },
      { heading: 'Let your dog explore', text: 'Allow safe sniffing breaks. Give your dog space from things they find overwhelming, and ask before approaching another dog. Follow local lead rules.' },
      { heading: 'Know when to head home', text: 'Slow down or stop if your dog appears uncomfortable or tired. GPS distance is an estimate, not a care target. Ask your vet about suitable exercise if you are unsure.' },
    ],
    visualSteps: [{ title: 'Prepare', text: 'Check equipment, water and weather.' }, { title: 'Explore', text: 'Make room for sniffing and breaks.' }, { title: 'Check in', text: 'Watch your dog; GPS is only an estimate.' }],
    checklist: ['Check the lead and harness', 'Choose a comfortable route', 'Find one quiet place for a sniffing break'],
    question: 'Does missing GPS mean your dog has stopped moving?', answer: 'No. A locked screen, poor signal or an interrupted browser can stop positions arriving.',
    feedback: 'Check your dog and the walk yourself. Missing positions cannot prove that your dog is stationary.', sources: [sources.behaviour],
  },
]

// Put the requested trick path first so the next-challenge card always points
// into it before the optional care lessons.
export const academyModules: AcademyModule[] = [...trickModules, ...archivedModules]

export const academyCourses: AcademyCourse[] = [tricksCourse].map(course => ({
  ...course,
  modules: academyModules.filter(module => module.courseId === course.id).sort((a, b) => a.position - b.position),
}))

export function isModuleUnlocked(module: AcademyModule, completedIds: ReadonlySet<string>) {
  const previous = academyModules.find(item => item.courseId === module.courseId && item.position === module.position - 1)
  return !previous || completedIds.has(previous.id)
}
