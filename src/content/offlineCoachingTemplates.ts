/**
 * Offline Coaching Templates
 *
 * Pre-generated coaching strings for use when Gemini is unavailable.
 * Keyed by scenario: score range, attempt number, and issue type.
 * ~15 per category for variety across sessions.
 */

// ============================================================================
// Template Categories
// ============================================================================

const PERFECT_SCORE = [
  "Wow, that was flawless! You've totally mastered this one.",
  "Perfect score! Your fingers are really dancing today.",
  "That was incredible! You nailed every single note.",
  "Absolutely perfect! Ready for something more challenging?",
  "You crushed it! Every note, every beat, right on point.",
  "Amazing work! Time to level up to something harder.",
  "Couldn't have played it better myself! What a performance.",
  "Textbook perfect! Your practice is really paying off.",
  "Zero mistakes! That kind of precision takes real dedication.",
  "Stunning! You played that like you wrote it yourself.",
  "That's the kind of playing that earns three stars every time!",
  "Perfection! Your rhythm and accuracy are locked in tight.",
  "Flawless from start to finish. You own this exercise now!",
  "Nothing to improve here! Try bumping up the difficulty.",
  "Chef's kiss! Every note was right where it needed to be.",
];

const HIGH_SCORE = [
  "Really strong performance! Just a tiny bit more practice and it'll be perfect.",
  "That was great! Your timing is getting really solid.",
  "So close to perfect! Focus on those last few tricky notes.",
  "Excellent work! You're really getting the feel for this piece.",
  "Almost there! A couple more tries and you'll have it down.",
  "Beautiful playing! Just clean up those last few spots.",
  "Your accuracy is excellent! Just tighten up the timing on a few notes.",
  "Impressive! You're clearly improving with each attempt.",
  "That was really musical! A few minor tweaks and it's perfect.",
  "Great feel for the piece! Just iron out the remaining rough edges.",
  "So close! Pay special attention to the transitions between sections.",
  "Solid performance! Try relaxing your hands for those fast passages.",
  "You've got the notes down! Now focus on making each one ring clearly.",
  "That sounded really good! The last section needs a tiny bit more practice.",
  "Nearly flawless! Consistency is what separates good from great.",
];

const GOOD_SCORE = [
  "Good progress! Keep practicing and you'll see those scores climb.",
  "You're getting the hang of it! Focus on the tricky parts.",
  "Nice work! Try slowing down on the harder sections.",
  "You're making real progress! Every attempt gets you closer.",
  "That's coming along well! Practice the challenging bits separately.",
  "Good effort! Try playing it slower first, then build up speed.",
  "The foundation is there! Now polish the details.",
  "Getting better each time! Isolate the measures that trip you up.",
  "You know most of this piece — now tackle the rough patches one by one.",
  "Solid attempt! Try the demo to hear how the tricky bits should sound.",
  "Halfway to mastery! Keep your eyes on the note guide for the hard parts.",
  "You're building muscle memory. A few more runs and it'll click.",
  "Good job pushing through! Focus on smoothing out the transitions next.",
  "The beginning and end were solid! Work on the middle section.",
  "You've got the right idea! Slow repetition will lock it in.",
];

const STRUGGLING = [
  "Don't worry, everyone starts here. Take it one measure at a time.",
  "This is a tough one! Try practicing just the first few notes.",
  "Keep going! Learning piano is all about patient practice.",
  "Break it into smaller chunks. Master each part, then put it together.",
  "It's okay to struggle — that's how learning happens. You've got this!",
  "Try listening to the demo first, then play along very slowly.",
  "Start with just the first four beats until they feel natural.",
  "Even one correct note more than last time is progress. Keep at it!",
  "This piece has tricky spots. Focus on just those parts for now.",
  "Slow and steady wins the race. Drop the tempo way down and build up.",
  "Your brain is learning even when your fingers fumble. Keep trying!",
  "Try hands separately if both together feels overwhelming.",
  "Take a quick break, then come back to it with fresh focus.",
  "Focus on accuracy over speed. The tempo will come with practice.",
  "Think of each attempt as adding a layer. It all builds up!",
];

const FIRST_ATTEMPT = [
  "Great first try! Now you know what to expect.",
  "Good start! The first attempt is always the hardest.",
  "Nice first run! You'll improve a lot on the second try.",
  "Not bad for a first go! Now you know the tricky parts.",
  "First attempts are all about learning the piece. You're on track!",
  "The hardest part is starting. You've already done that!",
  "Now that you've seen it once, the second try will feel much easier.",
  "Good reconnaissance! Now you know exactly where to focus.",
];

const RETURNING_AFTER_BREAK = [
  "Welcome back! Let's ease back in with some practice.",
  "Good to see you again! Your muscle memory will kick in soon.",
  "You're back! A little warm-up and you'll be right where you left off.",
  "Nice to have you back! Start slow and let your fingers remember.",
  "Welcome back! Even a short session keeps your skills sharp.",
];

const TIMING_ISSUES = [
  "Try counting along with the beat — '1-2-3-4' out loud helps a lot.",
  "Your notes are right, just work on the timing. Tap your foot to keep steady.",
  "Focus on the metronome clicks. Each note should land right on a beat.",
  "The rhythm is the tricky part here. Try clapping the pattern before playing.",
  "Slow it down and focus on staying with the beat. Speed comes later.",
  "Listen to the count-in carefully and keep that tempo in your head.",
  "Try playing with a metronome at half speed first.",
  "Great note accuracy! Now let's get the timing locked in.",
  "Your note selection is spot-on! Just sync it to the rhythm.",
  "You're rushing the notes a bit. Take a breath and let each beat arrive.",
  "Timing is the hardest skill — you're working on the right thing.",
  "Try subdividing the beat: think 'one-and-two-and' for each measure.",
  "The faster sections are where timing slips. Practice those bars slowly.",
  "Think of the beat as a wave you're riding, not chasing.",
  "Your fingers know the notes — now train them to wait for the beat.",
];

const PITCH_ISSUES = [
  "Watch the highlighted keys carefully — they show you what's coming next.",
  "Some wrong notes there. Try playing the tricky section very slowly.",
  "Focus on reading the notes one at a time. No rush!",
  "Double-check your hand position — make sure your thumb is on the right key.",
  "Take a moment to look at which keys light up before you press them.",
  "Try the demo mode to see which keys to press, then try it yourself.",
  "A few wrong notes, but your rhythm was solid! Focus on accuracy this time.",
  "Keep your eyes on the piano roll — it shows you exactly what's coming.",
  "Check your starting hand position. One shift can throw off all the notes after it.",
  "Try saying the note names out loud as you play — it reinforces the connection.",
  "The notes around the middle of the exercise need the most attention.",
  "When you hit a wrong note, stop and replay just that section three times.",
  "Your timing is good! Let's get the right notes under your fingers now.",
  "Look for patterns in the notes — many exercises use scale steps or repeated shapes.",
  "If you keep hitting the same wrong note, pause and find the right key before continuing.",
];

const GENERAL_ENCOURAGEMENT = [
  "Every practice session makes you better, even when it doesn't feel like it.",
  "Piano takes patience. You're building skills that will last a lifetime.",
  "Remember: even professional pianists practiced these basics once.",
  "You're further along than you think! Compare this to your first ever try.",
  "Progress isn't always visible day-to-day, but it adds up fast.",
  "The fact that you're practicing is what matters most. Keep it up!",
  "Your dedication to practice is what sets you apart. Keep showing up!",
  "Every great pianist started exactly where you are now.",
  "Think about how far you've come since your first session!",
  "Consistency beats talent. Keep your streak going!",
];

// ============================================================================
// Template Selector
// ============================================================================

function pickRandom(templates: string[]): string {
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Get an appropriate offline coaching text based on score context.
 */
export function getOfflineCoachingText(
  overallScore: number,
  _isPassed: boolean,
  attemptNumber: number,
  mainIssue: 'timing' | 'pitch' | 'general' = 'general'
): string {
  // First attempt gets special treatment
  if (attemptNumber <= 1 && overallScore < 90) {
    return pickRandom(FIRST_ATTEMPT);
  }

  // Perfect score
  if (overallScore >= 95) {
    return pickRandom(PERFECT_SCORE);
  }

  // High score
  if (overallScore >= 80) {
    return pickRandom(HIGH_SCORE);
  }

  // Good score with specific issue
  if (overallScore >= 60) {
    if (mainIssue === 'timing') return pickRandom(TIMING_ISSUES);
    if (mainIssue === 'pitch') return pickRandom(PITCH_ISSUES);
    return pickRandom(GOOD_SCORE);
  }

  // Struggling
  if (mainIssue === 'timing') return pickRandom(TIMING_ISSUES);
  if (mainIssue === 'pitch') return pickRandom(PITCH_ISSUES);
  return pickRandom(STRUGGLING);
}

/**
 * Get a general encouragement message (not score-specific).
 */
export function getEncouragementText(): string {
  return pickRandom(GENERAL_ENCOURAGEMENT);
}

/**
 * Get a returning-after-break message.
 */
export function getReturningText(): string {
  return pickRandom(RETURNING_AFTER_BREAK);
}
