import { getCatDialogue, getRandomCatMessage } from '../catDialogue';
import type { DialogueTrigger } from '../catDialogue';

describe('demo dialogue triggers', () => {
  const CAT_IDS = ['mini-meowww', 'jazzy', 'chonky-monke', 'luna', 'biscuit', 'ballymakawww', 'aria', 'tempo'];
  const DEMO_TRIGGERS: DialogueTrigger[] = ['demoOffer', 'demoComplete', 'ghostNotesFarewell'];

  it.each(DEMO_TRIGGERS)('all 8 cats have %s dialogue', (trigger) => {
    for (const catId of CAT_IDS) {
      const messages = getCatDialogue(catId, trigger);
      expect(messages).toBeDefined();
      expect(messages.length).toBeGreaterThanOrEqual(3);
      for (const msg of messages) {
        expect(typeof msg).toBe('string');
        expect(msg.length).toBeGreaterThan(10);
      }
    }
  });

  it('getRandomCatMessage returns a string for demo triggers', () => {
    for (const trigger of DEMO_TRIGGERS) {
      for (const catId of CAT_IDS) {
        const msg = getRandomCatMessage(catId, trigger);
        expect(typeof msg).toBe('string');
        expect(msg.length).toBeGreaterThan(0);
      }
    }
  });

  it('demoOffer messages contain inviting/offering language', () => {
    for (const catId of CAT_IDS) {
      const messages = getCatDialogue(catId, 'demoOffer');
      // At least one message should relate to showing/helping/watching
      const hasRelevant = messages.some(m =>
        /show|watch|help|demo|see|look|try|let me/i.test(m)
      );
      expect(hasRelevant).toBe(true);
    }
  });

  it('ghostNotesFarewell messages are encouraging', () => {
    for (const catId of CAT_IDS) {
      const messages = getCatDialogue(catId, 'ghostNotesFarewell');
      // Should be positive/congratulatory
      const hasPositive = messages.some(m =>
        /got it|amazing|proud|great|awesome|well done|fantastic|bravo|nice|good|incredible|wow|beautiful|smooth/i.test(m)
      );
      expect(hasPositive).toBe(true);
    }
  });

  it('DIALOGUE_TRIGGERS array includes new triggers', () => {
    const { DIALOGUE_TRIGGERS } = require('../catDialogue');
    expect(DIALOGUE_TRIGGERS).toContain('demoOffer');
    expect(DIALOGUE_TRIGGERS).toContain('demoComplete');
    expect(DIALOGUE_TRIGGERS).toContain('ghostNotesFarewell');
  });
});
