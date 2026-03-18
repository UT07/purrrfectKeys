# Purrrfect Keys — Manual Testing Playbook

> Complete testing checklist for every feature in the app.
> Give this to any tester with a device and they can verify the full experience.

**Last updated:** March 18, 2026
**App version:** Pre-launch (Phase 14 complete)
**Test device requirements:** iPhone (iOS 16+) or Android (API 28+). Physical device recommended for audio/MIDI testing.

---

## Quick Start for Testers

1. Install the app via TestFlight (iOS) or APK sideload (Android)
2. Launch the app — it should auto-create an anonymous account
3. Work through the sections below in order (A → L)
4. Mark each item: PASS / FAIL / SKIP (with reason)
5. For failures, note: device, OS version, steps to reproduce, screenshot

---

## A. First Launch & Authentication

### A1. Anonymous Auth (First Boot)
- [ ] App launches without crash
- [ ] Loading screen appears briefly, then transitions to Auth screen
- [ ] No white screen flash during initialization
- [ ] Tapping "Get Started" creates an anonymous account
- [ ] User lands on Home tab after auth

### A2. Email Sign-In
- [ ] Navigate to Profile → Account
- [ ] "Link Email" option is visible
- [ ] Enter valid email + password → account links successfully
- [ ] Sign out → sign back in with email → data preserved
- [ ] Invalid email shows error message (not crash)
- [ ] Wrong password shows error message

### A3. Google Sign-In
- [ ] Google Sign-In button appears on Auth screen
- [ ] Tapping opens Google account picker
- [ ] Selecting account completes sign-in
- [ ] If already anonymous → account links (data preserved)
- [ ] Sign out → sign back in → data preserved

### A4. Apple Sign-In (iOS only)
- [ ] Apple Sign-In button appears on Auth screen
- [ ] Tapping opens Apple auth dialog
- [ ] Completing auth signs in successfully
- [ ] "Hide My Email" option works
- [ ] Sign out → sign back in → data preserved

### A5. Account Deletion
- [ ] Navigate to Profile → Account → Delete Account
- [ ] Confirmation dialog appears (destructive action)
- [ ] Confirming deletes all user data
- [ ] User is signed out and returned to Auth screen
- [ ] Creating a new account starts fresh (no old data)

### A6. Sign Out
- [ ] Navigate to Profile → Account → Sign Out
- [ ] Confirmation dialog appears
- [ ] User returns to Auth screen
- [ ] No crash or white screen during transition

---

## B. Onboarding

### B1. First-Time Onboarding Flow
- [ ] After first sign-in, onboarding modal appears
- [ ] Cannot swipe to dismiss (gestureEnabled: false)
- [ ] Step 1: Welcome screen with app intro
- [ ] Step 2: Experience level selection
- [ ] Step 3: Input method selection (MIDI / Mic / Touch)
- [ ] Step 4: Cat selection (choose from 3 starters: Mini Meowww, Jazzy, Luna)
- [ ] Completing onboarding dismisses the modal
- [ ] Selected cat appears on Home screen
- [ ] Onboarding does NOT appear on subsequent launches
- [ ] Username is prompted and saved

### B2. Username Registration
- [ ] Username field accepts alphanumeric characters
- [ ] Duplicate usernames show error
- [ ] Username appears in social features after registration

---

## C. Home Screen

### C1. Layout & Data
- [ ] Time-aware greeting displays correctly (Good morning/afternoon/evening)
- [ ] User's cat avatar is visible
- [ ] XP level and progress bar show correct values
- [ ] Streak count is accurate (or shows 0 for new user)

### C2. Continue Learning Card
- [ ] Shows the next uncompleted exercise
- [ ] Tapping navigates to ExercisePlayer with correct exercise
- [ ] If all exercises complete, shows a "review" or appropriate fallback

### C3. Daily Challenge Card
- [ ] Daily challenge card appears with today's challenge type
- [ ] Tapping navigates to exercise with correct parameters
- [ ] After completion, card shows "Completed" state
- [ ] Challenge resets at midnight (new challenge next day)
- [ ] Cannot claim rewards twice for the same challenge

### C4. Weekly Challenge Card
- [ ] Weekly challenge card appears on Mondays
- [ ] Shows correct gem reward (50 gems)
- [ ] After completion, shows claimed state
- [ ] Resets next Monday

### C5. Music Library Spotlight
- [ ] Spotlight card shows a featured song
- [ ] "Browse" CTA navigates to Songs tab
- [ ] Song name and genre are displayed

### C6. Review Challenge Card (Skill Decay)
- [ ] If any skills have decayed, review card appears
- [ ] Tapping navigates to a review exercise
- [ ] Card disappears after review is completed

### C7. Quick Actions
- [ ] All quick action buttons are tappable
- [ ] Learn → LevelMap
- [ ] Songs → SongLibrary
- [ ] Free Play → PlayScreen
- [ ] Daily Session → DailySessionScreen

---

## D. Exercise Player (Core Loop)

### D1. Exercise Loading
- [ ] Exercise loading screen appears with Salsa cat tip
- [ ] Loading screen shows for at least 1 second
- [ ] Exercise loads and transitions to player

### D2. Count-In
- [ ] Count-in beats play before exercise starts (if configured)
- [ ] Visual countdown is visible
- [ ] Notes don't fall until count-in completes

### D3. Piano Roll (Falling Notes)
- [ ] Notes fall from top to bottom (Synthesia-style)
- [ ] Notes are correctly positioned horizontally (match keyboard keys)
- [ ] Scroll speed matches the exercise tempo
- [ ] Notes highlight different colors for left/right hand (if applicable)
- [ ] Current playback position is clearly indicated

### D4. Keyboard
- [ ] Piano keyboard renders at bottom of screen
- [ ] Keys respond to touch with visual feedback
- [ ] Correct notes produce sound
- [ ] Wrong notes produce sound but show "wrong" feedback
- [ ] Keyboard range auto-adjusts to exercise note range
- [ ] Keys are large enough to tap accurately on phone screen

### D5. Scoring & Feedback
- [ ] PERFECT/GOOD/EARLY/LATE/MISS feedback appears per note
- [ ] Combo counter increments on consecutive correct notes
- [ ] Combo resets on miss
- [ ] Score display updates in real-time
- [ ] Timing feedback is accurate (notes played on beat show "PERFECT")

### D6. Combo System
- [ ] Combo counter visible during exercise
- [ ] At combo 5+: visual change (Good tier)
- [ ] At combo 10+: fire effect (Fire tier)
- [ ] At combo 15+: enhanced effect (Super tier)
- [ ] At combo 20+: legendary effect (crown icon)
- [ ] ComboGlow border effect activates at higher tiers
- [ ] Haptic feedback intensifies with combo tier

### D7. Exercise Completion
- [ ] Exercise ends when all notes are played or time runs out
- [ ] Score summary appears with breakdown (accuracy/timing/completeness/extra/duration)
- [ ] Star rating displays (0-3 stars)
- [ ] XP earned animation plays
- [ ] Gem reward animation plays (if any)
- [ ] "Next Exercise" / "Try Again" buttons appear appropriately
- [ ] Score < passing: "Try Again" is prominent
- [ ] Score >= passing: "Continue" is prominent

### D8. Post-Exercise Screen
- [ ] Detailed score breakdown visible
- [ ] "Review with Salsa" button appears (replay coaching)
- [ ] Salsa coaching replay works (notes highlighted with coaching tips)
- [ ] Share button creates shareable score image

### D9. Exercise Pause/Resume
- [ ] Tapping pause button stops the exercise
- [ ] Paused state shows resume/quit options
- [ ] Resuming continues from the correct position (not restart)
- [ ] Elapsed time is preserved across pause/resume

### D10. Lesson Completion
- [ ] Completing all exercises in a lesson triggers celebration
- [ ] LessonCompleteScreen shows with confetti
- [ ] XP bonus for lesson completion is awarded
- [ ] Next lesson unlocks on the level map
- [ ] Achievement toast appears if this is a first-time completion

### D11. AI Exercise Mode
- [ ] AI-generated exercises load correctly
- [ ] Exercise difficulty matches the expected skill level
- [ ] Generated exercise passes validation (no impossible note patterns)
- [ ] Loading interstitial shows while AI generates

---

## E. Level Map (Learn Tab)

### E1. Map Display
- [ ] Vertical winding path with circular lesson nodes
- [ ] Completed lessons show gold/green with star count
- [ ] Current lesson pulses with glow effect
- [ ] Locked lessons show grey with lock icon
- [ ] Auto-scrolls to current lesson on mount
- [ ] Cat companions visible at tier boundaries

### E2. Lesson Node Interaction
- [ ] Tapping completed lesson → navigates to first exercise (replay)
- [ ] Tapping current lesson → navigates to first uncompleted exercise
- [ ] Tapping locked lesson → shows "Complete X to unlock" message
- [ ] Tier intro screen appears when entering a new tier

### E3. Tier System (18 Tiers)
- [ ] Tiers 1-5: Note Finding, Right Hand, Left Hand, Both Hands, Scales
- [ ] Tiers 6-10: Black Keys, G & F Major, Minor Keys, Chords, Songs
- [ ] Tiers 11-15: Rhythm, Arpeggios, Expression, Sight Reading, Performance
- [ ] Tiers 16-18: New Keys, Advanced Chords, Performance & Repertoire
- [ ] Each tier has visual theme (colors, cat companion)
- [ ] TierIntroScreen appears when first entering each tier

---

## F. Song Library (Songs Tab)

### F1. Library Browsing
- [ ] Genre carousel at top (Pop, Classical, Folk, Film/TV, Game, Holiday)
- [ ] Song cards display title, artist/composer, difficulty, mastery badge
- [ ] Search bar filters songs by title
- [ ] Scrolling is smooth with no jank
- [ ] Empty state message if no songs match filter

### F2. Song Player
- [ ] Tapping a song navigates to SongPlayerScreen
- [ ] Song sections listed (verse, chorus, etc.)
- [ ] Section playback works (tap a section to play it)
- [ ] Layer toggle (melody/accompaniment) works
- [ ] Loop toggle for practice mode
- [ ] Playing a section → ExercisePlayer with song notes

### F3. Song Mastery
- [ ] After playing, score is recorded
- [ ] Mastery tier badge updates (None → Bronze → Silver → Gold → Platinum)
- [ ] Gem rewards awarded per tier-up (10/20/40/75)
- [ ] Best score is preserved across sessions
- [ ] Mastery badge appears on song card in library

---

## G. Cat System

### G1. Cat Gallery (CatSwitchScreen)
- [ ] Swipeable cat cards (88% width)
- [ ] All 12 cats visible (3 starters + unlockable)
- [ ] Owned cats show full avatar with evolution stage
- [ ] Locked cats show dimmed preview with gem price
- [ ] Evolution progress bar shows XP toward next stage
- [ ] Ability icons displayed with lock badges for locked abilities
- [ ] Gem balance shown in header

### G2. Cat Purchase
- [ ] Tapping locked cat shows "Buy for X gems" modal
- [ ] Insufficient gems → modal shows current balance, buy button disabled
- [ ] Sufficient gems → purchase succeeds, gems deducted
- [ ] Newly purchased cat is immediately selectable
- [ ] Purchase sound effect plays

### G3. Cat Selection
- [ ] Tapping "Select" on an owned cat makes it the active cat
- [ ] Active cat appears on HomeScreen, ExercisePlayer (ExerciseBuddy), etc.
- [ ] Active cat's voice is used for coaching

### G4. Cat Evolution
- [ ] Playing exercises earns cat XP (same as player XP)
- [ ] Progress bar fills toward next evolution stage
- [ ] Reaching threshold triggers EvolutionReveal animation
- [ ] EvolutionReveal: full-screen Pokemon-style animation
- [ ] New abilities unlock at each stage
- [ ] Visual changes appear on cat avatar

### G5. Cat Studio (CatStudioScreen)
- [ ] Navigate to Cat Studio from Cat Gallery
- [ ] Category tabs: Hats, Glasses, Outfits, Capes, Collars, Effects
- [ ] Grid of accessories with thumbnails
- [ ] Lock badge on items above current evolution stage
- [ ] Tapping accessory shows live preview on cat
- [ ] Buy button with gem cost shown
- [ ] After purchase, "Equip" button appears
- [ ] Equipped accessories persist across screens
- [ ] Unequip option available

### G6. Cat Avatar Rendering
- [ ] Cat avatar renders correctly on HomeScreen
- [ ] Cat avatar renders correctly in ExercisePlayer (ExerciseBuddy)
- [ ] Cat avatar renders correctly in Social screens
- [ ] Cat avatar renders correctly in Profile
- [ ] Equipped accessories visible in all contexts
- [ ] All 8 mood states render correctly (happy, neutral, sleepy, etc.)

---

## H. Gamification

### H1. XP & Levels
- [ ] XP earned from exercises (10 base + 10/star + bonuses)
- [ ] XP bar fills on HomeScreen and ProfileScreen
- [ ] Level-up triggers celebration animation
- [ ] Level-up triggers achievement toast
- [ ] XP calculation matches expected formula

### H2. Streaks
- [ ] Streak counter increments after daily practice
- [ ] Streak flame animation on HomeScreen
- [ ] Missing a day resets streak to 0
- [ ] Streak milestones award gems (7-day: 25, 30-day: 100, 100-day: 200)
- [ ] Streak-at-risk notification appears if user hasn't practiced today

### H3. Gems
- [ ] Gem balance displayed in header (Home, Cat Gallery, Studio)
- [ ] Gems earned from: exercise stars, mastery tier-ups, challenges, streaks, achievements
- [ ] Gems spent on: cats, accessories
- [ ] Balance updates immediately after earn/spend
- [ ] Balance persists across app restarts

### H4. Achievements (32+)
- [ ] Achievement toast appears on unlock
- [ ] Sound effect plays
- [ ] View achievements in Profile → Achievements
- [ ] Locked achievements show requirements
- [ ] Unlocked achievements show completion date
- [ ] Categories: Exercise, Streak, Social, Collection, Mastery, Special

### H5. Challenges
- [ ] Daily challenge appears on HomeScreen
- [ ] 7 challenge types rotate (accuracy, speed, combo, etc.)
- [ ] Completing challenge awards gems + XP multiplier
- [ ] Weekly challenge appears on Mondays (50 gems + 3x XP)
- [ ] Monthly challenge appears on 1st of month (150 gems + 3x XP, 48h window)
- [ ] Challenges are deterministic (same challenge for all users on same day)
- [ ] Cannot double-claim challenge rewards

### H6. Loot & Chests
- [ ] Reward chest appears after exercise completion (star-based)
- [ ] Chest opening animation plays (10-phase timed)
- [ ] Chest contents displayed (gems, accessories)
- [ ] Rarity tiers: common, rare, epic, legendary

---

## I. Social Features

### I1. Friend Codes
- [ ] Navigate to Social tab → Add Friend
- [ ] Your friend code displayed prominently (6 characters)
- [ ] Copy button copies code to clipboard
- [ ] Enter friend's code → lookup succeeds → friend request sent
- [ ] Invalid code shows error message
- [ ] Own code cannot be used to add self

### I2. Friend Requests
- [ ] Incoming friend requests show notification badge on Social tab
- [ ] Accept request → friend appears in friends list
- [ ] Reject request → request removed
- [ ] Both users see each other in friends list after acceptance

### I3. Friends List
- [ ] Navigate to Social → Friends
- [ ] Friends list shows avatars, names, levels
- [ ] Tapping a friend shows options (challenge, remove)
- [ ] Remove friend → confirmation dialog → friend removed
- [ ] Removed friend disappears from both users' lists

### I4. Activity Feed
- [ ] Navigate to Social → Friends → Activity tab
- [ ] Feed shows events from friends (level-ups, evolutions, achievements)
- [ ] Events show friend's avatar, name, event description, timestamp
- [ ] Feed loads without crash for 0 friends (empty state)
- [ ] Feed updates when returning to screen (useFocusEffect)

### I5. Friend Challenges
- [ ] Challenge a friend from their profile or friends list
- [ ] Select an exercise for the challenge
- [ ] Complete exercise → challenge sent to friend
- [ ] Friend receives notification about challenge
- [ ] Friend plays same exercise → scores compared
- [ ] Winner shown in challenge card
- [ ] Challenge card shows "Your score" vs "Their score" correctly

### I6. Leagues
- [ ] Navigate to Social → League section
- [ ] League card shows current tier (Novice → Grandmaster)
- [ ] Leaderboard shows 30 players with XP rankings
- [ ] Current user highlighted in standings
- [ ] Promotion zone (top 5) highlighted in green
- [ ] Demotion zone (bottom 5) highlighted in red
- [ ] Safe zone (middle) is neutral
- [ ] Weekly reset processes correctly (Monday)
- [ ] Tier badge color matches tier

### I7. Guilds
- [ ] Navigate to Social → Guild section
- [ ] Create guild: name, description → guild created
- [ ] Join guild: search → request to join
- [ ] Guild members list shows all members
- [ ] Guild chat/activity visible
- [ ] Leave guild option available
- [ ] Guild leader can manage members

### I8. Battle Pass
- [ ] Navigate to Social → Battle Pass
- [ ] 30 tiers displayed with rewards
- [ ] Free rewards available to all users
- [ ] Premium rewards locked (future monetization)
- [ ] XP progress bar fills toward next tier
- [ ] Claiming a reward: animation plays, item added to inventory
- [ ] Season timer shows days remaining

### I9. Referral System
- [ ] Referral code visible in profile/social
- [ ] Sharing referral code via share sheet
- [ ] New user entering referral code: both users get bonus gems
- [ ] Referral bonuses tracked and displayed

### I10. Share Cards
- [ ] After exercise completion → share button
- [ ] ShareCard generates image with score, streak, cat
- [ ] Share sheet opens with image
- [ ] Image looks correct (no clipping, readable text)

---

## J. Settings & Profile

### J1. Profile Screen
- [ ] User avatar (cat) displayed
- [ ] Username and level shown
- [ ] Stats grid: XP, level, streak, exercises completed
- [ ] Daily goal picker (10/15/20/30 minutes)
- [ ] Changing daily goal persists

### J2. Audio Settings
- [ ] Keyboard volume slider works (sound changes in real-time)
- [ ] Metronome volume slider works
- [ ] Input method selector (MIDI / Mic / Touch)
- [ ] Changing input method persists

### J3. Input Method Selection
- [ ] MIDI: shows device scanning UI if selected
- [ ] Microphone: requests mic permission if not granted
- [ ] Touch: default, no additional setup
- [ ] Selected method persists across restarts

### J4. Cat Selection
- [ ] Navigate to Profile → select different cat
- [ ] Cat avatar updates across all screens

### J5. Debug Log
- [ ] Navigate to Profile → Debug Log
- [ ] Debug log screen shows recent events/errors
- [ ] Useful for diagnosing issues during testing

---

## K. Audio & Input

### K1. Touch Keyboard Audio
- [ ] Tapping piano keys produces piano sounds
- [ ] Different keys produce different pitches
- [ ] Sound plays within <25ms of touch (no noticeable delay)
- [ ] Multiple simultaneous touches work (polyphonic)
- [ ] Volume matches slider setting

### K2. MIDI Keyboard (Requires Hardware)
- [ ] Navigate to MIDI Setup
- [ ] Scanning detects connected MIDI device
- [ ] Connecting to device succeeds
- [ ] Playing notes on MIDI keyboard → sound plays in app
- [ ] Notes register for scoring during exercises
- [ ] Disconnecting device → app handles gracefully (fallback to touch)
- [ ] Latency is imperceptible (<15ms)

### K3. Microphone Input (Requires Physical Device)
- [ ] Navigate to Mic Setup
- [ ] Permission dialog appears (first time)
- [ ] Granting permission → calibration screen
- [ ] Ambient noise calibration completes
- [ ] Playing piano near mic → notes detected
- [ ] Detected notes register for scoring
- [ ] Monophonic mode: single notes detected accurately
- [ ] Polyphonic mode: chords detected (if ONNX model loads)
- [ ] Mic settings persist (mono/poly selection)
- [ ] Background noise doesn't trigger false notes

### K4. Sound Effects & Haptics
- [ ] Combo sounds play at tier transitions
- [ ] Star award sound plays
- [ ] Gem earn sound plays
- [ ] Achievement unlock sound plays
- [ ] Chest opening sound sequence plays
- [ ] Haptic feedback on button presses
- [ ] Haptic intensity matches combo tier

### K5. Free Play Mode
- [ ] Navigate to Home → Free Play
- [ ] Full piano keyboard available
- [ ] Playing notes produces sound (immediate feedback)
- [ ] After playing → analysis card shows detected key/scale
- [ ] "Practice Drill" button generates exercise based on analysis
- [ ] Input method badge shown (MIDI/Mic/Touch)

---

## L. Infrastructure & Edge Cases

### L1. Offline Mode
- [ ] Enable airplane mode
- [ ] App launches without crash
- [ ] Can play exercises from cache (previously loaded)
- [ ] Scoring works offline
- [ ] Progress saves locally
- [ ] Offline banner appears at top of screen
- [ ] Reconnecting → progress syncs to cloud

### L2. Cross-Device Sync
- [ ] Sign in on Device A → make progress
- [ ] Sign in on Device B with same account
- [ ] Progress from Device A appears on Device B
- [ ] Playing on Device B → sign in on Device A → progress merged
- [ ] "Highest wins" merge: best scores preserved

### L3. App Lifecycle
- [ ] App suspends → resumes without crash
- [ ] App killed → relaunched → state restored
- [ ] During exercise → app background → foreground → can resume
- [ ] Low memory warning → app handles gracefully

### L4. Notifications
- [ ] Daily practice reminder appears at configured time
- [ ] Streak-at-risk notification appears in evening
- [ ] Friend challenge notification appears
- [ ] Tapping notification opens correct screen

### L5. Error Handling
- [ ] Network timeout during AI generation → fallback message shown
- [ ] Invalid exercise data → error handled (no crash)
- [ ] Firebase auth token expired → auto-refresh (no sign-out)
- [ ] Cloud Function error → client-side fallback works

### L6. Performance
- [ ] App launch to Home screen: <3 seconds
- [ ] Exercise loading: <2 seconds
- [ ] Piano roll scrolling: 60fps (no jank)
- [ ] Keyboard response: immediate (no lag)
- [ ] Memory: no growth over 10-minute session
- [ ] Song library scroll: smooth with 500+ items

### L7. Navigation Edge Cases
- [ ] Back button works correctly on every screen
- [ ] Deep stack (Home → Learn → TierIntro → Exercise → PostExercise → Home) navigates correctly
- [ ] Tab switching preserves scroll position
- [ ] Modal screens can be dismissed
- [ ] Account screen (transparent modal) shows correctly over tab content

---

## M. Visual & UI Quality

### M1. Dark Theme Consistency
- [ ] All screens use consistent dark purple theme
- [ ] No white/light backgrounds on any screen
- [ ] Text is readable against dark backgrounds (4.5:1 contrast)
- [ ] Cards and surfaces have appropriate elevation/borders

### M2. Animations
- [ ] No animation jank (dropped frames)
- [ ] Evolution reveal plays smoothly
- [ ] Combo glow effect doesn't cause layout shift
- [ ] Screen transitions are smooth (slide/fade as configured)
- [ ] Tab switching has smooth icon animations

### M3. Typography
- [ ] Font sizes are readable on phone screens
- [ ] No text truncation that hides important information
- [ ] Numbers use consistent formatting (gems: "1,500", XP: "2,500")

### M4. Touch Targets
- [ ] All buttons are at least 44x44pt
- [ ] No overlapping touch targets
- [ ] Piano keys are large enough to tap accurately
- [ ] Tab bar items are easily tappable

### M5. Safe Areas
- [ ] Content doesn't overlap with notch/Dynamic Island
- [ ] Bottom content clears gesture bar
- [ ] Tab bar respects bottom safe area
- [ ] Exercise player uses full available space

---

## N. Regression Checks (Critical Paths)

### N1. Golden Path: New User
1. [ ] Launch app → Auth screen
2. [ ] Sign in → Onboarding
3. [ ] Complete onboarding → Home screen
4. [ ] Tap "Continue Learning" → Exercise Player
5. [ ] Complete exercise → Score screen
6. [ ] Return to Home → streak incremented
7. [ ] Cat XP earned → check cat gallery
8. [ ] Navigate all 5 tabs without crash

### N2. Golden Path: Returning User
1. [ ] Launch app → Home screen (no auth screen)
2. [ ] Streak and progress preserved from last session
3. [ ] Continue where left off in lesson progress
4. [ ] Daily challenge is different from yesterday

### N3. Full Social Flow
1. [ ] Get friend code from Profile
2. [ ] Share with another user
3. [ ] Other user enters code → friend request
4. [ ] Accept request → friends connected
5. [ ] Send challenge → other user receives
6. [ ] Both complete challenge → scores compared
7. [ ] Activity feed shows completion events

### N4. Full Cat Flow
1. [ ] Select starter cat in onboarding
2. [ ] Play exercises → earn cat XP
3. [ ] Reach evolution threshold → evolution animation
4. [ ] Visit Cat Gallery → see evolved cat
5. [ ] Buy an accessory in Cat Studio
6. [ ] Equip accessory → visible on avatar everywhere
7. [ ] Buy a new cat with gems
8. [ ] Switch to new cat → voice changes in coaching

---

## Test Results Template

| Section | Pass | Fail | Skip | Notes |
|---------|------|------|------|-------|
| A. Authentication | / | / | / | |
| B. Onboarding | / | / | / | |
| C. Home Screen | / | / | / | |
| D. Exercise Player | / | / | / | |
| E. Level Map | / | / | / | |
| F. Song Library | / | / | / | |
| G. Cat System | / | / | / | |
| H. Gamification | / | / | / | |
| I. Social Features | / | / | / | |
| J. Settings & Profile | / | / | / | |
| K. Audio & Input | / | / | / | |
| L. Infrastructure | / | / | / | |
| M. Visual & UI | / | / | / | |
| N. Regression | / | / | / | |

**Tester:** _______________
**Device:** _______________
**OS Version:** ___________
**App Build:** ____________
**Date:** _________________
