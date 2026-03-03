# Voice Personality Overhaul + Full Issue Resolution

**Date:** 2026-03-02
**Status:** APPROVED
**Scope:** Cat voice personality rewrite (dialogue + ElevenLabs tuning) + P0/P1 issue fixes

---

## Part 1: Cat Voice Personality Overhaul

### Goal
Transform each cat from "different voice saying similar things" into "truly distinct character with unique speech patterns, verbal tics, and cultural flavor."

### Approach: Deep Dialogue Rewrite + ElevenLabs Tuning
- Rewrite all ~600+ dialogue messages in `catDialogue.ts` with distinct speech fingerprints per cat
- Widen ElevenLabs stability/style parameter gaps for more audible voice differences
- Each cat gets a unique speech construction style, not just different word choices

### Cat Speech Personalities

| Cat | Speech Style | Verbal Tics | Cultural Flavor |
|-----|-------------|-------------|-----------------|
| **Mini-Meowww** | Hyperactive stream-of-consciousness, ALL CAPS bursts, can't contain excitement | "ooh ooh!", double punctuation, incomplete sentences, run-ons | Gen-Z excitement energy |
| **Jazzy** | Smooth jazz DJ patter, cool metaphors, musical idioms | "baby", "dig it", "groove", drops g's, relaxed grammar | Jazz club culture, beatnik |
| **Luna** | Dreamy & mystical, soft imagery, stargazer poetics | "the stars say...", "I sense...", heavy ellipsis, whisper-like | Mystical/celestial, new age |
| **Biscuit** | Warm grandma energy, food metaphors, gentle encouragement | "sweetie", "oh my!", baking/cooking metaphors | Southern comfort, homey |
| **Ballymakawww** | Irish energy, pub banter, Celtic flair, rapid-fire | "grand", "fierce", "craic", "'tis", dialect syntax | Irish English, pub culture |
| **Aria** | Dramatic operatic flair, theatrical, Italian sprinkles | "bravissimo!", "magnifico", stage/curtain metaphors | Opera/theater, Italian flair |
| **Tempo** | Precise sports coach, data-driven, motivational | "let's go!", stats references, numbered tips, action verbs | Sports coaching, analytics |
| **Shibu** | Zen master, minimal words, koans & nature metaphors | "breathe...", haiku-like brevity, nature imagery, pauses | Japanese zen, mindfulness |
| **Bella** | Regal Persian, sophisticated, slightly condescending warmth | "darling", "quite", "one does not simply...", proper English | British aristocracy, refined |
| **Sable** | Mysterious & cool, noir detective energy, cryptic compliments | "interesting...", "not bad", understatement, observation | Film noir, mystery |
| **Coda** | Analytical nerd, technical appreciation, precision language | "technically speaking", "error-free", data metaphors | Engineering/science culture |
| **Chonky-Monke** | Chaotic goblin energy, broken grammar, meme speak, LOUD | "YOOO", "bruh", random caps, no filter, meme references | Internet culture, chaos |
| **Salsa** (NPC) | Sassy coach, confident, streetwise, tough love + warmth | "listen up", "trust me", "I've seen it all", direct | Street-smart mentor |

### Dialogue Examples (exercise_complete_pass)

```
Mini-Meowww: "WAIT— did you just— OOH OOH you totally DID!! That was sooo good I can't even!!"
Jazzy:       "Now that's what I call findin' the pocket. Smooth as a Miles Davis solo, baby."
Luna:        "The melody flows through you like moonlight... I knew you carried this music inside."
Biscuit:     "Oh my goodness, sweetie! That was as lovely as a fresh batch of cookies. I'm so proud!"
Ballymakawww: "Ah, that was fierce brilliant so it was! The craic is mighty when you play like that!"
Aria:        "BRAVISSIMO! The audience rises! Standing ovation! You, my dear, are a STAR!"
Tempo:       "Boom! Nailed it! That's a personal best right there. 95% accuracy — you're on FIRE!"
Shibu:       "Like water finding its path. You did not force the music — you became it."
Bella:       "Quite exquisite, darling. One does not simply play music — one inhabits it. Well done."
Sable:       "Hmm. Interesting. Most students take three tries to get that right. You did it in one."
Coda:        "Execution: flawless. Timing deviation: minimal. Conclusion: you're getting seriously good."
Chonky-Monke: "YOOO BRUH THAT WAS INSANE!! ur literally cracked at piano rn no cap!!"
Salsa:       "Listen, I've coached hundreds of cats. That? That was special. Trust me on this one."
```

### ElevenLabs Parameter Changes

Widen parameter ranges for more audible character differences:

| Cat | Stability | Style | Similarity | Notes |
|-----|-----------|-------|------------|-------|
| Mini-Meowww | 0.40→**0.25** | 0.40→**0.65** | 0.78 | Max expressiveness |
| Jazzy | 0.55→**0.45** | 0.30→**0.50** | 0.78 | Smoother swing |
| Luna | 0.50→**0.65** | 0.45→**0.30** | 0.78 | Ethereal calm |
| Biscuit | 0.45→**0.55** | 0.35→**0.45** | 0.78 | Warm gentle |
| Ballymakawww | 0.38→**0.30** | 0.45→**0.60** | 0.78 | Wild Irish |
| Aria | 0.42→**0.28** | 0.50→**0.70** | 0.78 | Maximum drama |
| Tempo | 0.35→**0.40** | 0.40→**0.55** | 0.78 | Punchy clear |
| Shibu | 0.60→**0.75** | 0.20→**0.10** | 0.78 | Ultra-meditative |
| Bella | 0.50→**0.60** | 0.35→**0.40** | 0.78 | Composed regal |
| Sable | 0.48→**0.55** | 0.40→**0.25** | 0.78 | Cool understated |
| Coda | 0.55→**0.65** | 0.25→**0.15** | 0.78 | Precise measured |
| Chonky-Monke | 0.30→**0.20** | 0.55→**0.75** | 0.78 | Maximum chaos |
| Salsa | 0.40→**0.35** | 0.45→**0.55** | 0.78 | Confident sass |

Range expansion: stability 0.30-0.60 → **0.20-0.75**, style 0.20-0.55 → **0.10-0.75**

### Cache Invalidation
New dialogue text = new ElevenLabs cache keys. Old cached audio will be orphaned but naturally cleaned up. First plays after update will hit the API (expected cost: ~$2-3 for full cache warm-up across all cats).

---

## Part 2: Issue Fixes

### P0 — Critical Blockers

| # | Issue | Fix | Files |
|---|-------|-----|-------|
| 1 | Firestore rules missing for Phases 9-10.5 | Write rules for songs, songMastery, leagues, social, friendCodes, challenges, activityFeed | `firebase/firestore.rules` |
| 2 | Composite indexes empty | Define required indexes for song queries, league queries, mastery queries | `firebase/firestore.indexes.json` |
| 3 | Cloud Functions not deployed | Deploy via Firebase CLI | `firebase/functions/src/` (4 functions) |
| 4 | Gemini API key in client bundle | Prioritize Cloud Function calls; restrict client key via GCP quota | Client services + Cloud Functions |
| 5 | Gamification wildcard too broad | Restrict `/{document=**}` to explicit subcollections | `firebase/firestore.rules` |
| 6 | Privacy policy missing | Draft policy document | `docs/privacy-policy.md` |

### P1 — High Priority

| # | Issue | Fix | Files |
|---|-------|-----|-------|
| 7 | No offline UI indicator | Add banner component when network unavailable | New: `OfflineBanner.tsx` |
| 8 | Sync queue no dedup | Merge duplicate queue entries | `syncService.ts` |
| 9 | Maestro testID props missing | Add testID to interactive components | Multiple screen/component files |
| 10 | No per-user Gemini rate limiting | Add rate limiter in Cloud Functions | `firebase/functions/src/` |
| 11 | GitHub branch protection | Set up via `gh` CLI | GitHub repo settings |
| 12 | No Gemini monitoring | Add PostHog events for API calls | AI service files |

### Out of Scope (Require User Action)
- Firebase App Check (Console setup)
- Account deletion manual testing (post-deploy)
- MIDI hardware testing (physical device)
- Mic real-device testing (physical device)
- Crashlytics integration (native rebuild needed)

---

## Implementation Order

1. **Voice personality** — catDialogue.ts rewrite + catVoiceConfig.ts tuning
2. **P0 Firestore rules + indexes** — security first
3. **P0 Cloud Functions deployment**
4. **P1 code fixes** — offline banner, sync dedup, testIDs, rate limiting
5. **Test suite verification** — all 2,600+ tests still pass
6. **Privacy policy draft**

---

## Success Criteria

- [ ] Each cat's dialogue is immediately recognizable without seeing the cat name
- [ ] ElevenLabs audio sounds noticeably different between calm cats (Shibu, Luna) and energetic cats (Mini-Meowww, Chonky-Monke)
- [ ] All Firestore collections have security rules
- [ ] Cloud Functions deployed and working
- [ ] Composite indexes created
- [ ] All 2,600+ tests pass
- [ ] 0 TypeScript errors
