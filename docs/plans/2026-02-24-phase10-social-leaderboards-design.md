# Phase 10: Social & Leaderboards — Design Document

**Date:** February 24, 2026
**Status:** Approved
**Depends on:** Phase 9 (Music Library) complete

---

## Overview

Add social features that drive daily engagement: friends system, weekly competitive leagues (Duolingo-style), friend challenges, shareable score cards, and push notifications. All social data lives in Firebase (Firestore + Cloud Functions + FCM).

---

## Architecture

```
FIREBASE BACKEND:
  Firestore Collections:
    users/{uid}/friends          (friend connections)
    users/{uid}/activity         (activity feed items)
    leagues/{leagueId}           (weekly league data)
    challenges/{challengeId}     (friend-to-friend)
    friendCodes/{code}           (lookup table → uid)

  Cloud Functions:
    onWeekEnd → rotateLeagues()  (promote/demote, runs Monday 00:00 UTC)
    onXpChange → updateLeague()  (real-time standings update)
    onChallenge → sendNotif()    (push notification to challenged user)
    onMilestone → notifyFriends()(activity feed broadcast)

CLIENT:
  Stores:
    socialStore.ts     (friends, activity, challenges)
    leagueStore.ts     (current league, standings, rank)

  Screens:
    SocialScreen.tsx         (friends + activity feed)
    LeaderboardScreen.tsx    (league standings)
    ChallengeScreen.tsx      (active challenges)
    AddFriendScreen.tsx      (friend code + share link)
```

---

## Friends System

### Adding Friends

Each user gets a unique 6-character alphanumeric friend code (generated at account creation, stored in `friendCodes/{code}` → `uid`).

Methods to add:
1. **Enter code manually** — type friend's 6-char code
2. **Share deep link** — `purrrfectkeys.app/add/ABC123`
3. **QR code** (stretch goal)

### Friend Data

```typescript
interface FriendConnection {
  friendUid: string;
  displayName: string;
  catId: string;              // Their selected cat
  evolutionStage: number;     // Their cat's evolution
  addedAt: Timestamp;
}
```

### Activity Feed

Shows friend milestones (stored in `users/{uid}/activity` subcollection). Each item shows the **user's display name** alongside their **equipped cat avatar**:
- "[User Avatar] Sarah mastered Fur Elise!"
- "[User Avatar] Alex hit a 30-day streak!"
- "[User Avatar] Jordan evolved to Adult stage!"
- "[User Avatar] Maya earned Platinum on Ode to Joy!"

The avatar rendered is the user's currently equipped cat (at their evolution stage), NOT the cat character name.

Feed items expire after 7 days (Cloud Function cleanup).

---

## Weekly Leagues

Duolingo-style competitive leagues with 30-person groups:

| League | Tier | Promote | Demote |
|--------|------|---------|--------|
| Bronze | 1 | Top 10 → Silver | — |
| Silver | 2 | Top 10 → Gold | Bottom 5 → Bronze |
| Gold | 3 | Top 10 → Diamond | Bottom 5 → Silver |
| Diamond | 4 | — | Bottom 5 → Gold |

### Mechanics

- Leagues reset every Monday 00:00 UTC
- Users ranked by weekly XP within their 30-person group
- Cloud Function `rotateLeagues()` runs weekly: promote top 10, demote bottom 5
- New users start in Bronze, placed in a group with <30 members
- Opt-in during onboarding or settings (not forced)
- Inactive users (0 XP that week) don't count for demotion

### League Data

```typescript
interface League {
  id: string;                          // auto-generated
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  weekStart: Timestamp;
  members: LeagueMember[];             // max 30
}

interface LeagueMember {
  uid: string;
  displayName: string;
  catId: string;
  evolutionStage: number;
  weeklyXp: number;
  rank: number;                        // 1-30, computed
}
```

### LeaderboardScreen

- Animated rank list with user avatars (cat + evolution stage)
- Your position highlighted with glow
- Promotion zone (top 10) highlighted green
- Demotion zone (bottom 5) highlighted red
- Week countdown timer at top
- Trophy animation on promotion at week end

---

## Friend Challenges

Challenge a friend to beat your score on a specific exercise or song.

```typescript
interface Challenge {
  id: string;
  challengerUid: string;
  challengerName: string;
  challengedUid: string;
  exerciseId: string;          // Exercise or song ID
  exerciseTitle: string;
  challengerScore: number;     // Score to beat
  status: 'pending' | 'accepted' | 'completed' | 'expired';
  createdAt: Timestamp;
  expiresAt: Timestamp;        // 48h window
  result?: {
    challengedScore: number;
    winner: 'challenger' | 'challenged';
  };
}
```

**Flow:**
1. Complete exercise → "Challenge a friend?" button on completion screen
2. Pick friend from friend list
3. Friend receives push notification
4. Friend plays the same exercise
5. Winner shown with celebration, both get bonus gems (10 winner, 5 loser)

---

## Share Achievements

Shareable image cards for social media, generated via `react-native-view-shot`:

- **Score card:** Song/exercise name + score + stars + cat avatar + app branding
- **Streak card:** Streak count + flame animation + cat + "I'm on fire!"
- **Evolution card:** Cat before/after evolution reveal
- **League card:** "I made it to Gold league!" + rank + cat

Share via native share sheet (Messages, Instagram Stories, X, etc.).

---

## Push Notifications (FCM)

| Trigger | Message | Priority | Type |
|---------|---------|----------|------|
| Daily reminder | "Salsa misses you! Keep your streak alive" | Normal | Local |
| Streak at risk | "Your 15-day streak expires in 3 hours!" | High | Local |
| Challenge received | "Luna challenged you on Fur Elise!" | High | Remote |
| League promotion | "You made it to Gold league!" | Normal | Remote |
| Friend milestone | "Jazzy just mastered a new song" | Low | Remote |
| Evolution approaching | "100 more XP and your cat evolves!" | Normal | Local |

**Implementation:**
- `@react-native-firebase/messaging` for FCM (remote push)
- `expo-notifications` for local scheduled notifications (streak, daily reminder)
- Permission request during onboarding (optional, can enable later in settings)
- Notification preferences in ProfileScreen settings

---

## New Files

| File | Purpose |
|------|---------|
| `src/stores/socialStore.ts` | Friends, activity feed, challenges state |
| `src/stores/leagueStore.ts` | League standings, rank, promotion status |
| `src/services/firebase/socialService.ts` | Firestore CRUD for friends, challenges |
| `src/services/firebase/leagueService.ts` | League queries, weekly XP tracking |
| `src/services/notificationService.ts` | FCM + local notification setup |
| `src/screens/SocialScreen.tsx` | Friends list + activity feed |
| `src/screens/LeaderboardScreen.tsx` | League standings UI |
| `src/screens/ChallengeScreen.tsx` | Active/pending challenges |
| `src/screens/AddFriendScreen.tsx` | Friend code entry + share link |
| `src/components/ShareCard.tsx` | Shareable score/streak/evolution image |
| `firebase/functions/leagueRotation.ts` | Cloud Function: weekly promote/demote |
| `firebase/functions/socialNotifications.ts` | Cloud Function: push on social events |

---

## Navigation Changes

Replace "Play" tab with "Social" tab. Free Play moves to a button on HomeScreen.
Tab order: Home, Learn, Songs, Social, Profile.

---

## Exit Criteria

- [ ] Friend system with code/link adding + activity feed
- [ ] Weekly leagues (Bronze → Diamond) with promotion/demotion
- [ ] Leaderboard UI with animated rank changes
- [ ] Friend challenges with 48h window
- [ ] Shareable score/streak/evolution cards
- [ ] Push notifications (local + remote via FCM)
- [ ] Cloud Functions for league rotation + social notifications
- [ ] Notification preferences in settings
- [ ] ~50+ new tests
