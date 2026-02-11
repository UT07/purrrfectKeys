#!/usr/bin/env npx ts-node
/**
 * Exercise Generator
 *
 * Creates a new exercise from a template. Usage:
 *   npm run generate:exercise -- --lesson 2 --number 1 --title "My Exercise"
 */

import fs from 'fs';
import path from 'path';

interface Args {
  lesson?: number;
  number?: number;
  title?: string;
  difficulty?: number;
}

const EXERCISE_TEMPLATE = {
  id: 'lesson-XX-ex-XX',
  version: 1,
  metadata: {
    title: 'Exercise Title',
    description: 'Clear description of what the student will learn',
    difficulty: 1,
    estimatedMinutes: 3,
    skills: ['skill-1', 'skill-2'],
    prerequisites: []
  },
  settings: {
    tempo: 60,
    timeSignature: [4, 4] as [number, number],
    keySignature: 'C',
    countIn: 4,
    metronomeEnabled: true,
    loopEnabled: true
  },
  notes: [
    {
      note: 60,
      startBeat: 0,
      durationBeats: 1,
      hand: 'right',
      finger: 1
    }
  ],
  scoring: {
    timingToleranceMs: 50,
    timingGracePeriodMs: 150,
    velocitySensitive: false,
    passingScore: 70,
    starThresholds: [70, 85, 95] as [number, number, number]
  },
  hints: {
    beforeStart: 'Helpful hint shown at the start of the exercise.',
    commonMistakes: [
      {
        pattern: 'mistake-pattern-name',
        advice: 'How to fix this mistake',
        triggerCondition: {
          type: 'timing' as const,
          threshold: -100
        }
      }
    ],
    successMessage: 'Congratulatory message on completion'
  },
  display: {
    showFingerNumbers: true,
    showNoteNames: true,
    highlightHands: true,
    showPianoRoll: true,
    showStaffNotation: false
  }
};

function parseArgs(): Args {
  const args: Args = {};

  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--lesson' && i + 1 < process.argv.length) {
      args.lesson = parseInt(process.argv[i + 1], 10);
    } else if (process.argv[i] === '--number' && i + 1 < process.argv.length) {
      args.number = parseInt(process.argv[i + 1], 10);
    } else if (process.argv[i] === '--title' && i + 1 < process.argv.length) {
      args.title = process.argv[i + 1];
    } else if (process.argv[i] === '--difficulty' && i + 1 < process.argv.length) {
      args.difficulty = parseInt(process.argv[i + 1], 10);
    }
  }

  return args;
}

function validateArgs(args: Args): boolean {
  if (!args.lesson || !args.number) {
    console.error('Error: --lesson and --number are required');
    console.error('\nUsage: npm run generate:exercise -- --lesson 2 --number 3 --title "My Exercise" [--difficulty 1]');
    return false;
  }

  if (args.lesson < 1 || args.lesson > 6) {
    console.error('Error: Lesson must be between 1 and 6');
    return false;
  }

  if (args.number < 1 || args.number > 10) {
    console.error('Error: Exercise number must be between 1 and 10');
    return false;
  }

  if (args.title && args.title.length === 0) {
    console.error('Error: Title cannot be empty');
    return false;
  }

  return true;
}

function generateExercise(args: Args): void {
  const lesson = args.lesson!;
  const number = args.number!;
  const title = args.title || 'New Exercise';
  const difficulty = args.difficulty || 1;

  const lessonStr = String(lesson).padStart(2, '0');
  const numberStr = String(number).padStart(2, '0');

  const exercise = {
    ...EXERCISE_TEMPLATE,
    id: `lesson-${lessonStr}-ex-${numberStr}`,
    metadata: {
      ...EXERCISE_TEMPLATE.metadata,
      title,
      difficulty: Math.min(5, Math.max(1, difficulty))
    }
  };

  const dir = path.join(__dirname, `../content/exercises/lesson-${lessonStr}`);
  const filename = `exercise-${numberStr}-${title.toLowerCase().replace(/\s+/g, '-')}.json`;
  const filepath = path.join(dir, filename);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write file
  fs.writeFileSync(filepath, JSON.stringify(exercise, null, 2) + '\n');

  console.log(`✓ Created exercise: ${filepath}`);
  console.log(`\nTemplate created with:`);
  console.log(`  ID: ${exercise.id}`);
  console.log(`  Title: ${exercise.metadata.title}`);
  console.log(`  Difficulty: ${exercise.metadata.difficulty}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Edit the metadata (description, skills, prerequisites)`);
  console.log(`  2. Create note events in the notes array`);
  console.log(`  3. Adjust scoring thresholds if needed`);
  console.log(`  4. Write hints for common mistakes`);
  console.log(`  5. Run: npm run validate:exercises`);
}

function main(): void {
  const args = parseArgs();

  if (!validateArgs(args)) {
    process.exit(1);
  }

  generateExercise(args);
}

main();
