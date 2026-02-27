# Phase 9: Music Library — Design Document

**Date:** February 24, 2026
**Status:** Approved
**Depends on:** Phase 8 (Audio Input) complete

---

## Overview

Transform Purrrfect Keys from an exercise-only app into a full piano learning platform with 100+ playable songs. Songs are sourced from three pipelines (classical datasets, folk APIs, AI generation), stored in Firebase, and delivered on-demand. Users can also request any song by name for live Gemini generation.

---

## Architecture: 3-Source Content Pipeline

```
DEVELOPMENT TIME:
  PDMX Dataset (classical) → MusicXML → Python parser → Song JSON ──┐
  TheSession.org API (folk) → ABC → abcjs parser → Song JSON ──────→├→ Firebase Firestore
  Gemini Flash (pop/film)   → ABC → abcjs parser → Song JSON ──────┘   (songs collection)

RUNTIME:
  SongLibraryScreen
    ├── Browse/search/filter → Firestore query (paginated)
    ├── Tap song → fetch full Song JSON from Firestore
    └── "Request a Song" → Gemini generates live → saves to Firestore

  SongPlayerScreen
    ├── ExercisePlayer with section markers
    ├── Layer selector (melody / full)
    ├── Loop section
    └── Section-aware AI coaching
```

---

## Data Model

### Firestore Collection: `songs`

```typescript
interface Song {
  id: string;                          // "song-fur-elise"
  version: number;
  type: 'song';
  source: 'pdmx' | 'thesession' | 'gemini';

  metadata: {
    title: string;                     // "Fur Elise"
    artist: string;                    // "Ludwig van Beethoven"
    genre: 'classical' | 'pop' | 'film' | 'folk' | 'game' | 'holiday';
    difficulty: 1 | 2 | 3 | 4 | 5;
    durationSeconds: number;
    attribution: string;               // "Public domain" or "AI arrangement"
  };

  sections: SongSection[];
  settings: ExerciseSettings;          // Reuses existing type
  scoring: ExerciseScoring;            // Reuses existing type
}

interface SongSection {
  id: string;                          // "verse-1", "chorus"
  label: string;
  startBeat: number;
  endBeat: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  layers: {
    melody: NoteEvent[];               // Right hand only
    accompaniment?: NoteEvent[];        // Left hand only
    full: NoteEvent[];                  // Both hands
  };
}
```

### Firestore Collection: `songMastery` (per user)

```typescript
interface SongMastery {
  songId: string;
  userId: string;
  tier: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
  sectionScores: Record<string, number>;  // section-id → best score
  lastPlayed: Timestamp;
  totalAttempts: number;
}
```

---

## Content Sources

### Source 1: PDMX Dataset (Classical) — ~40 songs

- 254,077 public domain MusicXML files (NeurIPS 2024 dataset)
- Filter by piano/keyboard tag, beginner-accessible difficulty
- Offline Python script using `music21` to parse MusicXML → Song JSON
- Examples: Fur Elise, Ode to Joy, Moonlight Sonata, Canon in D, Bach minuets

### Source 2: TheSession.org API (Folk/Traditional) — ~40 songs

- 28,000+ Irish/folk tunes in ABC notation with public JSON API
- Filter by 4/4 or 3/4 time, major keys, <32 bars
- Node.js script using `abcjs` to parse ABC → NoteEvent JSON
- Supplement with Nottingham Music Database (1,000+ nursery rhymes, folk classics)
- Examples: Amazing Grace, Greensleeves, Scarborough Fair, Danny Boy

### Source 3: Gemini Flash (Pop/Film/Game) — ~40+ songs

- Gemini generates simplified piano arrangements from song title + key + difficulty
- Returns ABC notation (compact, well-trained in LLMs, parseable)
- Cost: ~$0.001/song ($1 for 1,000 songs)
- Pre-generated during development for quality assurance
- Examples: Happy Birthday, Jingle Bells, Twinkle Twinkle, Let It Be (simplified)

### User Song Requests (Runtime)

- Users type any song name → Gemini generates live → saved to Firestore
- Available to all users going forward (catalogue grows organically)
- Loading interstitial with Salsa "composing..." animation
- Rate limited: 5 requests/day/user
- Quality varies — disclaimer shown

---

## ABC Parser (`src/core/songs/abcParser.ts`)

Converts ABC notation to NoteEvent[]:

```
ABC Input:  "X:1\nT:Example\nM:4/4\nL:1/4\nK:C\nCDEF|GABC'|"
            ↓ parse
Output:     [{ note: 60, startBeat: 0, durationBeats: 1 },
             { note: 62, startBeat: 1, durationBeats: 1 }, ...]
```

Uses `abcjs` library (MIT licensed, used by TheSession.org).

---

## Screens

### SongLibraryScreen

- Genre carousel at top (horizontal scroll pills: All, Classical, Folk, Pop, Film, Game)
- Search bar with debounced Firestore query
- Song cards: title, artist, difficulty stars, duration, mastery badge
- Filter by difficulty (1-5) and hand (RH / LH / Both)
- "Request a Song" FAB button → text input → Gemini generation
- Added as "Songs" tab in bottom navigation

### SongPlayerScreen

- Wraps ExercisePlayer with song-specific UI
- Section sidebar/bottom sheet with section names + per-section scores
- Layer toggle: Melody Only / Full Arrangement
- Loop Section button on each section header
- Section-aware completion: scores per section, overall song mastery calculation

---

## Mastery Tiers

| Tier | Requirement | Badge |
|------|-------------|-------|
| Bronze | All sections 70%+ (melody layer) | Bronze circle |
| Silver | All sections 80%+ (melody layer) | Silver circle |
| Gold | All sections 90%+ (any layer) | Gold circle |
| Platinum | All sections 95%+ (full layer) | Platinum glow |

---

## AI Song Coaching

Same Gemini coaching pipeline as exercises, but section-aware:
- Identifies which section is the trouble spot
- Generates isolated drills for hard measures
- Tracks section-level mastery over time
- "Focus on the chorus — your timing on beat 3 keeps rushing"

---

## Achievements + Gems

| Achievement | Condition | Gems |
|-------------|-----------|------|
| First Song Mastered | Any song Bronze+ | 30 |
| Genre Explorer | 1 song per genre at Bronze+ | 50 |
| Classical Connoisseur | 10 classical songs Bronze+ | 40 |
| Platinum Pianist | Any song Platinum | 75 |
| Song Collector | 25 songs at Bronze+ | 100 |
| Melody Master | 50 songs at Silver+ | 150 |

---

## New Files

| File | Purpose |
|------|---------|
| `src/core/songs/songTypes.ts` | Song, SongSection, SongMastery types |
| `src/core/songs/songMastery.ts` | Mastery tier calculation from section scores |
| `src/core/songs/abcParser.ts` | ABC notation → NoteEvent[] converter |
| `src/services/songService.ts` | Firestore CRUD: fetch catalogue, get song, save mastery |
| `src/services/songGenerationService.ts` | Gemini live generation pipeline |
| `src/stores/songStore.ts` | Zustand: browsing state, cached songs, mastery data, filters |
| `src/screens/SongLibraryScreen.tsx` | Browse/search/filter UI |
| `src/screens/SongPlayerScreen.tsx` | Song-specific ExercisePlayer wrapper |
| `scripts/import-pdmx.py` | Offline: MusicXML → Song JSON for classical |
| `scripts/import-thesession.ts` | Offline: TheSession ABC → Song JSON for folk |
| `scripts/generate-songs.ts` | Offline: Gemini batch generation for pop/film/game |

---

## Navigation Changes

Add "Songs" tab to bottom navigation (5th tab, music note icon).
Tab order: Home, Learn, Songs, Play, Profile.

---

## Exit Criteria

- [ ] 120+ playable songs across 5+ genres in Firebase
- [ ] SongLibraryScreen with browse/search/filter
- [ ] SongPlayerScreen with section markers, layer toggle, loop
- [ ] Song mastery system (Bronze → Platinum)
- [ ] User song request via Gemini (rate-limited)
- [ ] Section-aware AI coaching
- [ ] Song achievements + gem rewards
- [ ] ABC parser with full test coverage
- [ ] ~60+ new tests
