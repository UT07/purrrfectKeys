#!/usr/bin/env python3
"""
Assign appropriate exercise types to all exercises based on lesson topic.
Updates both exercise-index.json and individual exercise JSON files.

Usage:
    python3 scripts/assign-exercise-types.py [--dry-run]
"""

import json
import os
import sys

CONTENT_DIR = os.path.join(os.path.dirname(__file__), '..', 'content')
INDEX_PATH = os.path.join(CONTENT_DIR, 'exercise-index.json')

# Lesson → exercise type rules
# Format: { lesson_id: [(order_range, type), ...] }
# order_range is (min_order, max_order) inclusive
# Exercises with order=99 (tests) are always 'test'
LESSON_TYPE_RULES = {
    # Beginner: all play
    'lesson-01': [((1, 99), 'play')],
    'lesson-02': [((1, 99), 'play')],
    'lesson-03': [((1, 99), 'play')],
    'lesson-04': [((1, 99), 'play')],
    'lesson-05': [((1, 99), 'play')],
    'lesson-06': [((1, 99), 'play')],

    # Black Keys, G/F Major, Minor Keys: play + earTraining mix
    'lesson-07': [((1, 7), 'play'), ((8, 9), 'earTraining'), ((10, 10), 'play')],
    'lesson-08': [((1, 6), 'play'), ((7, 8), 'earTraining'), ((9, 9), 'play')],
    'lesson-09': [((1, 6), 'play'), ((7, 8), 'earTraining'), ((9, 9), 'play')],
    'lesson-10': [((1, 6), 'play'), ((7, 8), 'earTraining'), ((9, 9), 'play')],
    'lesson-11': [((1, 6), 'play'), ((7, 8), 'earTraining'), ((9, 9), 'play')],

    # Rhythm-focused lessons
    'lesson-12': [((1, 6), 'rhythm'), ((7, 8), 'play'), ((9, 9), 'rhythm')],

    # Chord-focused lessons
    'lesson-13': [((1, 6), 'chordId'), ((7, 8), 'play'), ((9, 9), 'chordId')],
    'lesson-14': [((1, 6), 'chordId'), ((7, 8), 'play'), ((9, 9), 'chordId')],

    # Chord songs & arpeggios: play
    'lesson-15': [((1, 99), 'play')],
    'lesson-16': [((1, 99), 'play')],

    # More rhythm
    'lesson-17': [((1, 6), 'rhythm'), ((7, 8), 'play'), ((9, 9), 'rhythm')],
    'lesson-18': [((1, 6), 'rhythm'), ((7, 8), 'play'), ((9, 9), 'rhythm')],

    # Expression & phrasing: play
    'lesson-19': [((1, 99), 'play')],
    'lesson-20': [((1, 99), 'play')],

    # New keys: play + earTraining
    'lesson-21': [((1, 6), 'play'), ((7, 8), 'earTraining'), ((9, 9), 'play')],

    # Sight reading
    'lesson-22': [((1, 7), 'sightReading'), ((8, 9), 'play')],

    # Performance + call/response
    'lesson-23': [((1, 6), 'play'), ((7, 9), 'callResponse')],
    'lesson-24': [((1, 6), 'play'), ((7, 9), 'callResponse')],

    # Advanced lessons (18 exercises each)
    'lesson-25': [((1, 12), 'chordId'), ((13, 15), 'earTraining'), ((16, 18), 'play')],
    'lesson-26': [((1, 12), 'play'), ((13, 18), 'callResponse')],
    'lesson-27': [((1, 12), 'rhythm'), ((13, 18), 'play')],
    'lesson-28': [((1, 12), 'rhythm'), ((13, 18), 'play')],
    'lesson-29': [((1, 99), 'play')],
    'lesson-30': [((1, 12), 'play'), ((13, 18), 'earTraining')],
    'lesson-31': [((1, 99), 'play')],
    'lesson-32': [((1, 12), 'play'), ((13, 18), 'earTraining')],
    'lesson-33': [((1, 12), 'sightReading'), ((13, 18), 'play')],
    'lesson-34': [((1, 12), 'play'), ((13, 18), 'callResponse')],
    'lesson-35': [((1, 12), 'play'), ((13, 18), 'callResponse')],
    'lesson-36': [((1, 12), 'callResponse'), ((13, 18), 'play')],

    # Review lessons (12 exercises each): mixed types
    'lesson-37': [((1, 4), 'play'), ((5, 8), 'sightReading'), ((9, 12), 'rhythm')],
    'lesson-38': [((1, 4), 'chordId'), ((5, 8), 'earTraining'), ((9, 12), 'play')],
    'lesson-39': [((1, 4), 'rhythm'), ((5, 8), 'play'), ((9, 12), 'callResponse')],

    # Grand Recital: all play (performance)
    'lesson-40': [((1, 99), 'play')],
}


def get_exercise_type(lesson_id: str, order: int, current_type: str) -> str:
    """Determine exercise type based on lesson and order."""
    # Tests stay as tests
    if current_type == 'test' or order == 99:
        return 'test'

    rules = LESSON_TYPE_RULES.get(lesson_id)
    if not rules:
        return 'play'

    for (min_order, max_order), ex_type in rules:
        if min_order <= order <= max_order:
            return ex_type

    return 'play'


def update_exercise_json(exercise_dir: str, exercise_id: str, new_type: str, dry_run: bool) -> bool:
    """Update individual exercise JSON file with the new type."""
    # Find the JSON file for this exercise
    lesson_id = '-'.join(exercise_id.split('-')[:2])
    lesson_dir = os.path.join(exercise_dir, lesson_id)

    if not os.path.isdir(lesson_dir):
        return False

    for fname in os.listdir(lesson_dir):
        if not fname.endswith('.json'):
            continue
        fpath = os.path.join(lesson_dir, fname)
        try:
            with open(fpath, 'r') as f:
                data = json.load(f)
            if data.get('id') == exercise_id:
                if new_type == 'play':
                    # Remove type field (defaults to play)
                    if 'type' in data:
                        del data['type']
                        if not dry_run:
                            with open(fpath, 'w') as f:
                                json.dump(data, f, indent=2)
                                f.write('\n')
                        return True
                    return False
                else:
                    if data.get('type') != new_type:
                        data['type'] = new_type
                        if not dry_run:
                            with open(fpath, 'w') as f:
                                json.dump(data, f, indent=2)
                                f.write('\n')
                        return True
                    return False
        except (json.JSONDecodeError, KeyError):
            continue

    return False


def main():
    dry_run = '--dry-run' in sys.argv

    with open(INDEX_PATH, 'r') as f:
        index = json.load(f)

    exercises_dir = os.path.join(CONTENT_DIR, 'exercises')
    type_changes = {}
    type_counts = {}

    for ex in index['exercises']:
        new_type = get_exercise_type(ex['lessonId'], ex['order'], ex['type'])
        if new_type != ex['type']:
            type_changes[ex['id']] = (ex['type'], new_type)
        ex['type'] = new_type
        type_counts[new_type] = type_counts.get(new_type, 0) + 1

    print(f"Exercise type assignment {'(DRY RUN)' if dry_run else ''}")
    print(f"{'=' * 50}")
    print(f"Total exercises: {len(index['exercises'])}")
    print(f"Type changes: {len(type_changes)}")
    print(f"\nType distribution:")
    for t, c in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"  {t:20s}: {c}")

    # Show changes by lesson
    if type_changes:
        print(f"\nChanges by lesson:")
        changes_by_lesson = {}
        for ex_id, (old, new) in type_changes.items():
            lesson = '-'.join(ex_id.split('-')[:2])
            if lesson not in changes_by_lesson:
                changes_by_lesson[lesson] = []
            changes_by_lesson[lesson].append((ex_id, old, new))

        for lesson in sorted(changes_by_lesson.keys(), key=lambda x: int(x.split('-')[1])):
            changes = changes_by_lesson[lesson]
            print(f"  {lesson}: {len(changes)} changes")
            for ex_id, old, new in changes[:3]:
                print(f"    {ex_id}: {old} -> {new}")
            if len(changes) > 3:
                print(f"    ... and {len(changes) - 3} more")

    # Update index file
    if not dry_run:
        with open(INDEX_PATH, 'w') as f:
            json.dump(index, f, indent=2)
            f.write('\n')
        print(f"\nUpdated {INDEX_PATH}")

    # Update individual exercise JSON files
    updated_files = 0
    for ex_id, (old_type, new_type) in type_changes.items():
        if update_exercise_json(exercises_dir, ex_id, new_type, dry_run):
            updated_files += 1

    if not dry_run:
        print(f"Updated {updated_files} exercise JSON files")
    else:
        print(f"\nWould update {updated_files} exercise JSON files")
        print("Run without --dry-run to apply changes")


if __name__ == '__main__':
    main()
