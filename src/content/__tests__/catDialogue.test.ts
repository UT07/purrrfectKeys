import {
  getCatDialogue,
  getRandomCatMessage,
  DIALOGUE_TRIGGERS,
  type DialogueTrigger,
} from '../catDialogue';

describe('catDialogue', () => {
  it('returns messages for every cat × trigger combination', () => {
    const catIds = [
      'mini-meowww', 'jazzy', 'chonky-monke', 'luna',
      'biscuit', 'ballymakawww', 'aria', 'tempo',
    ];
    const triggers: DialogueTrigger[] = [
      'exercise_start', 'exercise_complete_pass', 'exercise_complete_fail',
      'level_up', 'daily_login', 'idle',
    ];

    for (const catId of catIds) {
      for (const trigger of triggers) {
        const messages = getCatDialogue(catId, trigger);
        expect(messages.length).toBeGreaterThan(0);
      }
    }
  });

  it('returns different messages for different conditions', () => {
    const passMessages = getCatDialogue('mini-meowww', 'exercise_complete_pass', 'score_high');
    const failMessages = getCatDialogue('mini-meowww', 'exercise_complete_fail');
    expect(passMessages).not.toEqual(failMessages);
  });

  it('getRandomCatMessage returns a string', () => {
    const msg = getRandomCatMessage('jazzy', 'exercise_start');
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('falls back to base trigger if condition not found', () => {
    const msg = getRandomCatMessage('luna', 'exercise_start', 'nonexistent_condition' as any);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('DIALOGUE_TRIGGERS exports all trigger types', () => {
    expect(DIALOGUE_TRIGGERS).toContain('exercise_start');
    expect(DIALOGUE_TRIGGERS).toContain('exercise_complete_pass');
    expect(DIALOGUE_TRIGGERS).toContain('level_up');
    expect(DIALOGUE_TRIGGERS).toContain('daily_login');
    expect(DIALOGUE_TRIGGERS).toContain('idle');
    expect(DIALOGUE_TRIGGERS).toContain('ai_exercise_intro');
  });

  it('each cat has distinct personality in messages', () => {
    const miniMsg = getCatDialogue('mini-meowww', 'exercise_start');
    const tempoMsg = getCatDialogue('tempo', 'exercise_start');
    expect(miniMsg).not.toEqual(tempoMsg);
  });
});
