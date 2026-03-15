import {
  getCategoryWeight,
  getAllPaths,
  getPath,
  LEARNING_PATHS,
} from '../learningPaths';

describe('learningPaths', () => {
  describe('LEARNING_PATHS', () => {
    it('defines 5 learning paths', () => {
      expect(Object.keys(LEARNING_PATHS)).toHaveLength(5);
    });

    it('each path has required fields', () => {
      for (const path of Object.values(LEARNING_PATHS)) {
        expect(path.id).toBeTruthy();
        expect(path.name).toBeTruthy();
        expect(path.description).toBeTruthy();
        expect(path.icon).toBeTruthy();
        expect(path.priorityCategories.length).toBeGreaterThan(0);
        expect(path.songGenrePreference.length).toBeGreaterThan(0);
        expect(['relaxed', 'moderate', 'aggressive']).toContain(path.tempoTarget);
      }
    });
  });

  describe('getCategoryWeight', () => {
    it('gives highest weight to first priority category', () => {
      const weight = getCategoryWeight('scales', 'classical');
      expect(weight).toBe(3.0);
    });

    it('gives lower weight to later priority categories', () => {
      const w1 = getCategoryWeight('scales', 'classical');
      const w2 = getCategoryWeight('arpeggios', 'classical');
      expect(w1).toBeGreaterThan(w2);
    });

    it('gives bonus weight to bonus categories', () => {
      const bonusWeight = getCategoryWeight('key-signatures', 'classical');
      const defaultWeight = getCategoryWeight('songs', 'classical');
      expect(bonusWeight).toBeGreaterThan(defaultWeight);
    });

    it('returns 1.0 for unrelated categories', () => {
      const weight = getCategoryWeight('songs', 'classical');
      expect(weight).toBe(1.0);
    });

    it('prioritizes chords for pop path', () => {
      const chordWeight = getCategoryWeight('chords', 'pop-songs');
      const scaleWeight = getCategoryWeight('scales', 'pop-songs');
      expect(chordWeight).toBeGreaterThan(scaleWeight);
    });
  });

  describe('getAllPaths', () => {
    it('returns all 5 paths', () => {
      expect(getAllPaths()).toHaveLength(5);
    });
  });

  describe('getPath', () => {
    it('returns correct path by ID', () => {
      expect(getPath('classical').name).toBe('Classical Journey');
      expect(getPath('pop-songs').name).toBe('Pop Star');
      expect(getPath('technique').name).toBe('Technical Mastery');
    });
  });
});
