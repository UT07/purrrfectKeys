/**
 * Social Store Tests
 *
 * Tests friend code, friend connections, activity feed,
 * challenge management, reset, and persistence hydration.
 */

import type { FriendConnection, ActivityFeedItem, FriendChallenge, RichFeedItem, RankedTier } from '../types';

// Mock persistence layer
jest.mock('../persistence', () => ({
  createDebouncedSave: () => jest.fn(),
  createImmediateSave: () => jest.fn(),
  PersistenceManager: {
    loadState: jest.fn().mockResolvedValue({}),
    saveState: jest.fn().mockResolvedValue(undefined),
    deleteState: jest.fn().mockResolvedValue(undefined),
  },
  STORAGE_KEYS: { SOCIAL: 'test_social', LEAGUE: 'test_league' },
}));

import { useSocialStore, hydrateSocialStore } from '../socialStore';
import { PersistenceManager } from '../persistence';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFriend(overrides: Partial<FriendConnection> = {}): FriendConnection {
  return {
    uid: 'friend-1',
    displayName: 'Test Friend',
    selectedCatId: 'jazzy',
    status: 'accepted',
    connectedAt: Date.now(),
    ...overrides,
  };
}

function makeActivity(overrides: Partial<ActivityFeedItem> = {}): ActivityFeedItem {
  return {
    id: `activity-${Date.now()}`,
    friendUid: 'friend-1',
    friendDisplayName: 'Test Friend',
    friendCatId: 'jazzy',
    type: 'level_up',
    detail: 'Reached level 5',
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeChallenge(overrides: Partial<FriendChallenge> = {}): FriendChallenge {
  return {
    id: `challenge-${Date.now()}`,
    fromUid: 'user-1',
    fromDisplayName: 'Me',
    fromCatId: 'luna',
    toUid: 'friend-1',
    exerciseId: 'lesson-01-ex-01',
    exerciseTitle: 'Find Middle C',
    fromScore: 92,
    toScore: null,
    status: 'pending',
    createdAt: Date.now(),
    expiresAt: Date.now() + 86400000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('socialStore', () => {
  beforeEach(() => {
    useSocialStore.getState().reset();
  });

  describe('initial state', () => {
    it('starts with empty defaults', () => {
      const state = useSocialStore.getState();
      expect(state.friendCode).toBe('');
      expect(state.friends).toEqual([]);
      expect(state.activityFeed).toEqual([]);
      expect(state.richFeed).toEqual([]);
      expect(state.challenges).toEqual([]);
    });
  });

  describe('friend code', () => {
    it('sets friend code', () => {
      useSocialStore.getState().setFriendCode('ABC123');
      expect(useSocialStore.getState().friendCode).toBe('ABC123');
    });

    it('overwrites existing friend code', () => {
      useSocialStore.getState().setFriendCode('OLD123');
      useSocialStore.getState().setFriendCode('NEW456');
      expect(useSocialStore.getState().friendCode).toBe('NEW456');
    });
  });

  describe('friend connections', () => {
    it('adds a friend', () => {
      const friend = makeFriend();
      useSocialStore.getState().addFriend(friend);

      const { friends } = useSocialStore.getState();
      expect(friends).toHaveLength(1);
      expect(friends[0].uid).toBe('friend-1');
    });

    it('adds multiple friends', () => {
      useSocialStore.getState().addFriend(makeFriend({ uid: 'f1' }));
      useSocialStore.getState().addFriend(makeFriend({ uid: 'f2' }));
      useSocialStore.getState().addFriend(makeFriend({ uid: 'f3' }));

      expect(useSocialStore.getState().friends).toHaveLength(3);
    });

    it('removes a friend by uid', () => {
      useSocialStore.getState().addFriend(makeFriend({ uid: 'f1' }));
      useSocialStore.getState().addFriend(makeFriend({ uid: 'f2' }));
      useSocialStore.getState().removeFriend('f1');

      const { friends } = useSocialStore.getState();
      expect(friends).toHaveLength(1);
      expect(friends[0].uid).toBe('f2');
    });

    it('removing non-existent friend is a no-op', () => {
      useSocialStore.getState().addFriend(makeFriend({ uid: 'f1' }));
      useSocialStore.getState().removeFriend('non-existent');

      expect(useSocialStore.getState().friends).toHaveLength(1);
    });

    it('updates friend status', () => {
      useSocialStore.getState().addFriend(
        makeFriend({ uid: 'f1', status: 'pending_incoming' }),
      );
      useSocialStore.getState().updateFriendStatus('f1', 'accepted');

      expect(useSocialStore.getState().friends[0].status).toBe('accepted');
    });

    it('updateFriendStatus does not affect other friends', () => {
      useSocialStore.getState().addFriend(
        makeFriend({ uid: 'f1', status: 'pending_incoming' }),
      );
      useSocialStore.getState().addFriend(
        makeFriend({ uid: 'f2', status: 'pending_outgoing' }),
      );
      useSocialStore.getState().updateFriendStatus('f1', 'accepted');

      const friends = useSocialStore.getState().friends;
      expect(friends[0].status).toBe('accepted');
      expect(friends[1].status).toBe('pending_outgoing');
    });

    it('setFriends replaces the entire list', () => {
      useSocialStore.getState().addFriend(makeFriend({ uid: 'old' }));
      const newFriends = [makeFriend({ uid: 'new1' }), makeFriend({ uid: 'new2' })];
      useSocialStore.getState().setFriends(newFriends);

      const { friends } = useSocialStore.getState();
      expect(friends).toHaveLength(2);
      expect(friends[0].uid).toBe('new1');
    });
  });

  describe('activity feed', () => {
    it('adds an activity item (prepended)', () => {
      const item = makeActivity({ id: 'a1' });
      useSocialStore.getState().addActivityItem(item);

      const { activityFeed } = useSocialStore.getState();
      expect(activityFeed).toHaveLength(1);
      expect(activityFeed[0].id).toBe('a1');
    });

    it('prepends new items (newest first)', () => {
      useSocialStore.getState().addActivityItem(makeActivity({ id: 'a1' }));
      useSocialStore.getState().addActivityItem(makeActivity({ id: 'a2' }));

      const { activityFeed } = useSocialStore.getState();
      expect(activityFeed[0].id).toBe('a2');
      expect(activityFeed[1].id).toBe('a1');
    });

    it('caps at 50 items', () => {
      for (let i = 0; i < 60; i++) {
        useSocialStore.getState().addActivityItem(makeActivity({ id: `a-${i}` }));
      }

      expect(useSocialStore.getState().activityFeed).toHaveLength(50);
      // Newest should be first
      expect(useSocialStore.getState().activityFeed[0].id).toBe('a-59');
    });

    it('setActivityFeed replaces and also caps at 50', () => {
      const items = Array.from({ length: 60 }, (_, i) =>
        makeActivity({ id: `set-${i}` }),
      );
      useSocialStore.getState().setActivityFeed(items);

      expect(useSocialStore.getState().activityFeed).toHaveLength(50);
    });
  });

  describe('challenges', () => {
    it('adds a challenge (prepended)', () => {
      const challenge = makeChallenge({ id: 'c1' });
      useSocialStore.getState().addChallenge(challenge);

      const { challenges } = useSocialStore.getState();
      expect(challenges).toHaveLength(1);
      expect(challenges[0].id).toBe('c1');
    });

    it('updates a challenge by id', () => {
      useSocialStore.getState().addChallenge(makeChallenge({ id: 'c1' }));
      useSocialStore.getState().updateChallenge('c1', {
        toScore: 88,
        status: 'completed',
      });

      const challenge = useSocialStore.getState().challenges[0];
      expect(challenge.toScore).toBe(88);
      expect(challenge.status).toBe('completed');
    });

    it('updateChallenge does not affect other challenges', () => {
      useSocialStore.getState().addChallenge(makeChallenge({ id: 'c1' }));
      useSocialStore.getState().addChallenge(makeChallenge({ id: 'c2' }));
      useSocialStore.getState().updateChallenge('c1', { status: 'completed' });

      const challenges = useSocialStore.getState().challenges;
      // c2 is first (prepended), c1 is second
      const c1 = challenges.find((c) => c.id === 'c1')!;
      const c2 = challenges.find((c) => c.id === 'c2')!;
      expect(c1.status).toBe('completed');
      expect(c2.status).toBe('pending');
    });

    it('setChallenges replaces the entire list', () => {
      useSocialStore.getState().addChallenge(makeChallenge({ id: 'old' }));
      const newChallenges = [makeChallenge({ id: 'new1' }), makeChallenge({ id: 'new2' })];
      useSocialStore.getState().setChallenges(newChallenges);

      const { challenges } = useSocialStore.getState();
      expect(challenges).toHaveLength(2);
      expect(challenges[0].id).toBe('new1');
    });
  });

  describe('rich feed', () => {
    function makeRichItem(overrides: Partial<RichFeedItem> = {}): RichFeedItem {
      return {
        id: `rich-${Date.now()}-${Math.random()}`,
        type: 'level_up',
        actorUid: 'friend-1',
        actorDisplayName: 'Friend',
        actorCatId: 'luna',
        actorRankTier: 'novice' as RankedTier,
        actorRankDivision: 3,
        payload: {},
        timestamp: Date.now(),
        reactions: {},
        isEngagementTrigger: false,
        ...overrides,
      };
    }

    it('adds a rich feed item (prepended)', () => {
      const item = makeRichItem({ id: 'r1' });
      useSocialStore.getState().addRichFeedItem(item);

      const { richFeed } = useSocialStore.getState();
      expect(richFeed).toHaveLength(1);
      expect(richFeed[0].id).toBe('r1');
    });

    it('prepends new items (newest first)', () => {
      useSocialStore.getState().addRichFeedItem(makeRichItem({ id: 'r1' }));
      useSocialStore.getState().addRichFeedItem(makeRichItem({ id: 'r2' }));

      const { richFeed } = useSocialStore.getState();
      expect(richFeed[0].id).toBe('r2');
      expect(richFeed[1].id).toBe('r1');
    });

    it('caps at 50 items', () => {
      for (let i = 0; i < 60; i++) {
        useSocialStore.getState().addRichFeedItem(makeRichItem({ id: `r-${i}` }));
      }

      expect(useSocialStore.getState().richFeed).toHaveLength(50);
      expect(useSocialStore.getState().richFeed[0].id).toBe('r-59');
    });

    it('setRichFeed replaces and caps at 50', () => {
      const items = Array.from({ length: 60 }, (_, i) =>
        makeRichItem({ id: `set-${i}` }),
      );
      useSocialStore.getState().setRichFeed(items);

      expect(useSocialStore.getState().richFeed).toHaveLength(50);
    });

    it('removeFriend also removes their rich feed items', () => {
      useSocialStore.getState().addFriend(makeFriend({ uid: 'f1' }));
      useSocialStore.getState().addRichFeedItem(makeRichItem({ actorUid: 'f1', id: 'r1' }));
      useSocialStore.getState().addRichFeedItem(makeRichItem({ actorUid: 'f2', id: 'r2' }));

      useSocialStore.getState().removeFriend('f1');

      const { richFeed } = useSocialStore.getState();
      expect(richFeed).toHaveLength(1);
      expect(richFeed[0].actorUid).toBe('f2');
    });
  });

  describe('toggleReaction', () => {
    function makeRichItem(overrides: Partial<RichFeedItem> = {}): RichFeedItem {
      return {
        id: `rich-${Date.now()}-${Math.random()}`,
        type: 'rank_promotion',
        actorUid: 'friend-1',
        actorDisplayName: 'Friend',
        actorCatId: 'luna',
        actorRankTier: 'performer' as RankedTier,
        actorRankDivision: 2,
        payload: {},
        timestamp: Date.now(),
        reactions: {},
        isEngagementTrigger: false,
        ...overrides,
      };
    }

    it('adds a reaction to an item', () => {
      useSocialStore.getState().addRichFeedItem(makeRichItem({ id: 'item-1', reactions: {} }));
      useSocialStore.getState().toggleReaction('item-1', '🔥', 'user-a');

      const item = useSocialStore.getState().richFeed[0];
      expect(item.reactions['🔥']).toEqual(['user-a']);
    });

    it('removes a reaction when toggled again', () => {
      useSocialStore.getState().addRichFeedItem(
        makeRichItem({ id: 'item-1', reactions: { '🔥': ['user-a'] } }),
      );
      useSocialStore.getState().toggleReaction('item-1', '🔥', 'user-a');

      const item = useSocialStore.getState().richFeed[0];
      expect(item.reactions['🔥']).toEqual([]);
    });

    it('supports multiple users reacting', () => {
      useSocialStore.getState().addRichFeedItem(makeRichItem({ id: 'item-1', reactions: {} }));
      useSocialStore.getState().toggleReaction('item-1', '👏', 'user-a');
      useSocialStore.getState().toggleReaction('item-1', '👏', 'user-b');

      const item = useSocialStore.getState().richFeed[0];
      expect(item.reactions['👏']).toEqual(['user-a', 'user-b']);
    });

    it('supports multiple emoji types on same item', () => {
      useSocialStore.getState().addRichFeedItem(makeRichItem({ id: 'item-1', reactions: {} }));
      useSocialStore.getState().toggleReaction('item-1', '🔥', 'user-a');
      useSocialStore.getState().toggleReaction('item-1', '💪', 'user-a');

      const item = useSocialStore.getState().richFeed[0];
      expect(item.reactions['🔥']).toEqual(['user-a']);
      expect(item.reactions['💪']).toEqual(['user-a']);
    });

    it('does not affect other feed items', () => {
      useSocialStore.getState().addRichFeedItem(makeRichItem({ id: 'item-1', reactions: {} }));
      useSocialStore.getState().addRichFeedItem(makeRichItem({ id: 'item-2', reactions: {} }));
      useSocialStore.getState().toggleReaction('item-1', '🔥', 'user-a');

      const items = useSocialStore.getState().richFeed;
      // item-2 is first (prepended), item-1 is second
      const item2 = items.find((i) => i.id === 'item-2')!;
      expect(item2.reactions).toEqual({});
    });
  });

  describe('reset', () => {
    it('resets all state to defaults', () => {
      useSocialStore.getState().setFriendCode('XYZ789');
      useSocialStore.getState().addFriend(makeFriend());
      useSocialStore.getState().addActivityItem(makeActivity());
      useSocialStore.getState().addChallenge(makeChallenge());

      useSocialStore.getState().reset();

      const state = useSocialStore.getState();
      expect(state.friendCode).toBe('');
      expect(state.friends).toEqual([]);
      expect(state.activityFeed).toEqual([]);
      expect(state.richFeed).toEqual([]);
      expect(state.challenges).toEqual([]);
    });

    it('calls PersistenceManager.deleteState', () => {
      useSocialStore.getState().reset();
      expect(PersistenceManager.deleteState).toHaveBeenCalled();
    });
  });

  describe('hydration', () => {
    it('hydrates from persistence', async () => {
      const savedData = {
        friendCode: 'SAVED1',
        friends: [makeFriend({ uid: 'saved-friend' })],
        activityFeed: [makeActivity({ id: 'saved-activity' })],
        challenges: [makeChallenge({ id: 'saved-challenge' })],
      };
      (PersistenceManager.loadState as jest.Mock).mockResolvedValueOnce(savedData);

      await hydrateSocialStore();

      const state = useSocialStore.getState();
      expect(state.friendCode).toBe('SAVED1');
      expect(state.friends).toHaveLength(1);
      expect(state.friends[0].uid).toBe('saved-friend');
      expect(state.activityFeed).toHaveLength(1);
      expect(state.challenges).toHaveLength(1);
    });

    it('hydrates with defaults when storage is empty', async () => {
      (PersistenceManager.loadState as jest.Mock).mockResolvedValueOnce({
        friendCode: '',
        friends: [],
        activityFeed: [],
        challenges: [],
      });

      await hydrateSocialStore();

      const state = useSocialStore.getState();
      expect(state.friendCode).toBe('');
      expect(state.friends).toEqual([]);
    });

    it('migrates legacy data without richFeed field', async () => {
      (PersistenceManager.loadState as jest.Mock).mockResolvedValueOnce({
        friendCode: 'LEGACY',
        friends: [],
        activityFeed: [],
        challenges: [],
        // No richFeed field — older saved state
      });

      await hydrateSocialStore();

      const state = useSocialStore.getState();
      expect(state.friendCode).toBe('LEGACY');
      expect(state.richFeed).toEqual([]);
    });
  });
});
