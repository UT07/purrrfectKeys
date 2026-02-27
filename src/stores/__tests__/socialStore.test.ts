/**
 * Social Store Tests
 *
 * Tests friend code, friend connections, activity feed,
 * challenge management, reset, and persistence hydration.
 */

import type { FriendConnection, ActivityFeedItem, FriendChallenge } from '../types';

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
  });
});
