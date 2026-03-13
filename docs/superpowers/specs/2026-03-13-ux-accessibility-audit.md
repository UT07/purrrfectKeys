# Purrrfect Keys — UX & Accessibility Audit

**Date:** 2026-03-13
**Scope:** All screens, accessibility, gamification, social, gameplay
**Standard:** WCAG 2.1 AA, Apple HIG, Material Design, App Store leaders (Duolingo, Simply Piano, Headspace)

---

## Executive Summary

The app has strong visual design, cohesive gamification, and solid feature coverage. However, **accessibility is systematically weak** — most screens lack `accessibilityLabel`/`accessibilityRole` on interactive elements, animations don't respect Reduce Motion, and some tap targets are below 44pt. Empty states exist for social screens but are missing on several core screens.

### Priority Matrix

| Priority | Count | Description |
|----------|-------|-------------|
| P0 (Blocker) | 8 | Screen reader unusable, tap targets too small |
| P1 (Critical) | 12 | Missing states, contrast issues, no motion preference |
| P2 (Important) | 15 | Polish, discoverability, educational opportunities |

---

## Screen-by-Screen Findings

### HomeScreen
| Issue | Priority | Details |
|-------|----------|---------|
| Hero section interactive elements lack accessibility labels | P0 | CatAvatar, streak flame, daily goal arc have no `accessibilityLabel` or `accessibilityRole` |
| Stats pills may be <44pt height | P0 | XP, Level, Streak, Exercises grid items too small on low-res devices |
| Color contrast on gradient overlay text | P1 | White text over animated purple/pink gradient may violate 4.5:1 during lighter states |
| No loading skeleton for challenge cards | P1 | Cards render empty during async store hydration |
| Continue Learning card invisible when no exercises remain | P1 | No fallback CTA to browse lessons or songs |
| Stats are read-only; no drill-down | P2 | Could show XP breakdown, level progress bar |
| No error boundary | P2 | Silent failure if store hydration fails |

**What's Good:** Clear visual hierarchy, gamification always visible (streak, gems, XP), cohesive gradient design, time-aware greeting.

### LevelMapScreen
| Issue | Priority | Details |
|-------|----------|---------|
| PathNode buttons lack accessibilityLabel | P0 | Screen readers can't identify tier number, name, status, or stars |
| Locked nodes at 52px below 44pt minimum | P0 | Dense vertical layout compounds the issue |
| Black dot spacer replaced with cat avatar | FIXED | Was empty View with background color; now shows user's equipped cat |
| PulsingGlow animation not announced to screen readers | P1 | "Current" status only conveyed visually |
| Locked nodes provide no unlock requirement hint | P1 | No toast explaining "Complete X to unlock" |
| Node state transitions lack animation | P2 | No unlock animation (scale-up, particles) when tier becomes available |
| No breadcrumb back to home | P2 | Relies on tab bar which may be off-screen during scroll |

**What's Good:** Tier theming system visually cohesive, zigzag layout maximizes screen width, section banners with milestone messaging, cat companions at every tier.

### ProfileScreen
| Issue | Priority | Details |
|-------|----------|---------|
| Settings picker chips lack proper accessibility | P0 | No `accessibilityRole="button"` or `accessibilityExpanded` |
| Achievement progress not visible | P1 | No "X/10" indicators for multi-step achievements |
| Volume sliders may have <44pt drag targets | P1 | No labels showing current slider value |
| Achievements flat list; no category grouping | P2 | Could group by type (Milestones, Challenges, Streaks) |
| Stats are aggregates only; no drill-down | P2 | Can't filter by lesson/tier/difficulty |

**What's Good:** Gamification stats prominent above fold, cat character system adds personality, cohesive design matching other screens.

### PlayScreen (Free Play)
| Issue | Priority | Details |
|-------|----------|---------|
| Octave shift arrows unlabeled for accessibility | P0 | No `accessibilityLabel` on up/down controls |
| Practice tool toggles lack clear affordances | P0 | 7 tools with no state indication for screen readers |
| No error state when audio input unavailable | P1 | Blank chord overlay if mic/MIDI fails |
| Aurora background animation no reduce-motion check | P1 | May overwhelm users with attention/motion sensitivity |
| No empty state when MIDI/mic disconnected | P1 | No "Connect MIDI or enable microphone" message |
| Octave shift should show current octave label | P2 | "C3-C4" text would help beginners |
| Practice tools not discoverable on first load | P2 | No onboarding hint or tooltip |

**What's Good:** Neon arcade aesthetic is engaging and distinct, continuous keyboard with octave shift is learner-friendly, InputManager abstraction for flexible input, landscape optimization.

### SocialScreen
| Issue | Priority | Details |
|-------|----------|---------|
| Interactive cards lack accessibility labels | P1 | League card, challenge cards not labeled |
| No loading indicator during social data fetch | P1 | useFocusEffect re-fetches but no visual feedback |

**What's Good:** Proper empty state for challenges ("No active challenges"), social hub layout clear, league card prominent.

### LeaderboardScreen
| Issue | Priority | Details |
|-------|----------|---------|
| Standings list items need accessibility roles | P1 | Position, name, XP not announced as group |

**What's Good:** Loading state exists (isLoadingStandings), pull-to-refresh, tier-colored zones, fetch error handling.

### FriendsScreen
| Issue | Priority | Details |
|-------|----------|---------|
| (None critical) | — | — |

**What's Good:** Excellent empty states for both "No friends" and "No activity" with icon, message, and CTA button. Add Friend action prominently placed. Two-tab layout (Friends/Activity) well-organized.

### AddFriendScreen
| Issue | Priority | Details |
|-------|----------|---------|
| Username search input accessibility | P1 | Input field labeled but search button needs role |

**What's Good:** Auth gate (redirects anonymous users), friend code display with copy, search with loading states.

### SongLibraryScreen
| Issue | Priority | Details |
|-------|----------|---------|
| Genre carousel items need accessibility labels | P1 | Genre name not announced |

**What's Good:** Empty state exists ("No songs found"), search with placeholder, genre carousel, loading indicators, testIDs present (14 total).

### CatSwitchScreen (Cat Gallery)
| Issue | Priority | Details |
|-------|----------|---------|
| Swipeable cards need swipe gesture accessibility | P1 | VoiceOver users can't navigate card carousel |
| No confirmation before gem purchase | P1 | Accidental purchases possible |

**What's Good:** Locked cats show dimmed preview (not blank), evolution progress bars, ability icons with lock badges, gem balance header.

### DailySessionScreen
| Issue | Priority | Details |
|-------|----------|---------|
| No empty state when no sessions available | P1 | Blank screen if curriculum has nothing to recommend |
| Session type badge not announced | P1 | "new-material" vs "review" only visual |

**What's Good:** AI-picked sessions with warm-up/lesson/challenge sections, session type variety.

### PostExerciseScreen
| Issue | Priority | Details |
|-------|----------|---------|
| Score breakdown bars need accessibility values | P1 | Animated bars not announced as percentages |

**What's Good:** 9 testIDs, comprehensive layout (score ring, stars, breakdown, coach feedback, fun facts, practice strategy, action buttons), AI coaching with TTS.

### ExercisePlayer
| Issue | Priority | Details |
|-------|----------|---------|
| Reduce Motion not checked for visual feedback animations | P1 | PERFECT/GOOD/MISS overlays animate regardless |

**What's Good:** ErrorDisplay component exists, comprehensive controls, exercise loading screen, achievement toasts, combo system.

### CustomTabBar
| Issue | Priority | Details |
|-------|----------|---------|
| Badge count lacks semantic meaning | P0 | Announces "3" not "3 pending items" |
| Spring animation ignores reduce-motion | P1 | Scale animation on every tab switch |

**What's Good:** `accessibilityRole="button"` on each tab, `accessibilityLabel` per tab, proper badge calculation.

---

## Cross-Screen Patterns

### Systematic Accessibility Gaps
1. **Missing `accessibilityLabel` on custom components** — Affects 10+ screens
2. **Animations don't respect `AccessibilityInfo.isReduceMotionEnabled`** — Only 2 files check it (ExercisePlayer, ExerciseControls)
3. **Color contrast unverified** — Gradient backgrounds + light text needs audit
4. **Tap targets below 44pt** — LevelMap locked nodes (52px), various small icons

### Systematic Strengths
1. **Cohesive visual design** — Dark purple palette consistent everywhere
2. **Gamification always visible** — Progress, streaks, gems on every major screen
3. **Social empty states well done** — FriendsScreen is the gold standard
4. **Error handling in gameplay** — ExercisePlayer has ErrorDisplay, loading screens
5. **testID coverage** — Most screens have testIDs for E2E testing

---

## Prioritized Fix Plan

### Sprint 1: P0 Accessibility (2 days)
1. Add `accessibilityLabel` + `accessibilityRole` to ALL interactive elements across all screens
2. Fix LevelMapScreen node tap targets (minimum 56px for locked nodes)
3. Add semantic badge labels to CustomTabBar ("3 pending items")
4. Label PlayScreen octave controls and practice tool toggles

### Sprint 2: P1 States & Motion (2 days)
1. Add `AccessibilityInfo.isReduceMotionEnabled` check to all animated components
2. Add loading skeletons to HomeScreen challenge cards, DailySessionScreen
3. Add empty state to DailySessionScreen and HomeScreen Continue Learning fallback
4. Add purchase confirmation dialog to CatSwitchScreen gem purchases
5. Announce score breakdown percentages to screen readers

### Sprint 3: P2 Polish (2 days)
1. Add unlock requirement toast to locked LevelMap nodes
2. Group achievements by category in ProfileScreen
3. Add octave label display to PlayScreen
4. Add onboarding tooltips for PlayScreen practice tools
5. Add haptic feedback to tab bar presses

---

## Industry Comparison

| Feature | Purrrfect Keys | Duolingo | Simply Piano | Headspace |
|---------|---------------|----------|-------------|-----------|
| Accessibility labels | Partial | Full | Full | Full |
| Reduce Motion | 2 screens | All | All | All |
| Empty states | Social only | All screens | All screens | All screens |
| Loading states | Gameplay only | All screens | Most screens | All screens |
| Gamification visibility | Excellent | Excellent | Good | N/A |
| Social features | Good | Excellent | None | None |
| Cat companions | Unique! | N/A | N/A | N/A |
| Dark theme | Native | Toggle | Light only | Toggle |
| Haptic feedback | SoundManager | Everywhere | Limited | Limited |

**Our unique advantages:** Cat companions with evolution, arcade aesthetic, polyphonic detection, AI coaching with TTS. These differentiate us from all competitors.

**Critical gap vs leaders:** Accessibility. Duolingo and Headspace are fully WCAG AA compliant. We need Sprint 1-2 before App Store submission.
