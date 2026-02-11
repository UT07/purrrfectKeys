---
name: new-exercise
description: Create a new exercise definition with proper schema, validation, and test
allowed-tools: Read, Write, Bash(npm run validate:exercises)
---

# Create New Exercise

Generate a new exercise JSON file following the KeySense exercise schema.

## Steps

1. **Read the exercise format specification**
   - Review @agent_docs/exercise-format.md for the complete schema

2. **Gather information**
   - Exercise title and description
   - Target skill (right-hand, left-hand, both-hands, scales, chords)
   - Difficulty level (1-5)
   - Tempo (BPM)
   - Notes to play (MIDI note numbers and beat positions)

3. **Create the exercise file**
   - Location: `content/exercises/lesson-XX/exercise-XX-[slug].json`
   - Follow the exact schema from exercise-format.md
   - Include helpful hints and common mistakes

4. **Update the lesson manifest**
   - Add exercise ID to the appropriate lesson in `content/lessons/`

5. **Validate**
   - Run `npm run validate:exercises` to check for errors
   - Fix any schema violations

## MIDI Note Reference

```
Middle C (C4) = 60
D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, B4 = 71, C5 = 72
```

## Beat Reference (4/4 time)

```
Beat 0 = first quarter note
Beat 1 = second quarter note
Beat 0.5 = eighth note between beats 0 and 1
```

## Example Usage

User: "Create an exercise for playing C major chord"

Claude will:
1. Read the exercise format spec
2. Create JSON with notes [60, 64, 67] played together
3. Set appropriate difficulty (2) and tempo (80)
4. Add hints about finger positioning
5. Validate and report success
