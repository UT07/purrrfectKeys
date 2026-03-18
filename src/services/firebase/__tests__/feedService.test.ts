/**
 * Feed Service Tests
 *
 * Tests the pure utility functions and Firestore interactions for:
 * - buildRichFeedItem() construction
 * - hasReacted() / getTotalReactions() helpers
 * - postRichFeedItem() Firestore write
 * - toggleReaction() add/remove
 * - getAggregatedRichFeed() merging + sorting
 */

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => 'mock-doc-ref'),
  collection: jest.fn(() => 'mock-col-ref'),
  setDoc: jest.fn().mockResolvedValue(undefined),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  query: jest.fn((...args: unknown[]) => args),
  orderBy: jest.fn(),
  limit: jest.fn(),
  arrayUnion: jest.fn((val: string) => ({ _type: 'arrayUnion', val })),
  arrayRemove: jest.fn((val: string) => ({ _type: 'arrayRemove', val })),
}));

jest.mock('../config', () => ({
  db: 'mock-db',
}));

import {
  buildRichFeedItem,
  postRichFeedItem,
  getFriendRichFeed,
  getAggregatedRichFeed,
  toggleReaction,
  hasReacted,
  getTotalReactions,
} from '../feedService';
import type { RichFeedItem } from '../../../stores/types';

import { setDoc, getDocs, updateDoc, doc } from 'firebase/firestore';

const mockedSetDoc = setDoc as jest.MockedFunction<typeof setDoc>;
const mockedGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockedUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockedDoc = doc as jest.MockedFunction<typeof doc>;

describe('feedService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // buildRichFeedItem
  // -----------------------------------------------------------------------

  describe('buildRichFeedItem', () => {
    it('creates a well-formed feed item', () => {
      const item = buildRichFeedItem(
        'rank_promotion',
        {
          uid: 'user-1',
          displayName: 'Alice',
          catId: 'luna',
          rankTier: 'performer',
          rankDivision: 2,
        },
        { previousTier: 'apprentice', newTier: 'performer' },
      );

      expect(item.type).toBe('rank_promotion');
      expect(item.actorUid).toBe('user-1');
      expect(item.actorDisplayName).toBe('Alice');
      expect(item.actorCatId).toBe('luna');
      expect(item.actorRankTier).toBe('performer');
      expect(item.actorRankDivision).toBe(2);
      expect(item.payload).toEqual({ previousTier: 'apprentice', newTier: 'performer' });
      expect(item.reactions).toEqual({});
      expect(item.isEngagementTrigger).toBe(false);
      expect(item.id).toMatch(/^rank_promotion-user-1-\d+$/);
      expect(typeof item.timestamp).toBe('number');
    });

    it('sets engagement trigger when specified', () => {
      const item = buildRichFeedItem(
        'level_up',
        {
          uid: 'user-2',
          displayName: 'Bob',
          catId: 'jazzy',
          rankTier: 'novice',
          rankDivision: 3,
        },
        { level: 10 },
        { isEngagementTrigger: true },
      );

      expect(item.isEngagementTrigger).toBe(true);
    });

    it('sets targetUid when specified', () => {
      const item = buildRichFeedItem(
        'score_beaten',
        {
          uid: 'user-3',
          displayName: 'Charlie',
          catId: 'shibu',
          rankTier: 'virtuoso',
          rankDivision: 1,
        },
        { exerciseId: 'ex-1', newScore: 95 },
        { targetUid: 'user-4' },
      );

      expect(item.targetUid).toBe('user-4');
    });
  });

  // -----------------------------------------------------------------------
  // hasReacted / getTotalReactions
  // -----------------------------------------------------------------------

  describe('hasReacted', () => {
    const item: RichFeedItem = {
      id: 'test-item',
      type: 'level_up',
      actorUid: 'actor',
      actorDisplayName: 'Actor',
      actorCatId: 'luna',
      actorRankTier: 'novice',
      actorRankDivision: 3,
      payload: {},
      timestamp: Date.now(),
      reactions: {
        '🔥': ['user-a', 'user-b'],
        '👏': ['user-c'],
      },
      isEngagementTrigger: false,
    };

    it('returns true when user has reacted with emoji', () => {
      expect(hasReacted(item, '🔥', 'user-a')).toBe(true);
    });

    it('returns false when user has not reacted with emoji', () => {
      expect(hasReacted(item, '🔥', 'user-c')).toBe(false);
    });

    it('returns false for emoji with no reactions', () => {
      expect(hasReacted(item, '😮', 'user-a')).toBe(false);
    });
  });

  describe('getTotalReactions', () => {
    it('sums across all emoji types', () => {
      const item: RichFeedItem = {
        id: 'test-item',
        type: 'cat_evolution',
        actorUid: 'actor',
        actorDisplayName: 'Actor',
        actorCatId: 'luna',
        actorRankTier: 'novice',
        actorRankDivision: 3,
        payload: {},
        timestamp: Date.now(),
        reactions: {
          '🔥': ['a', 'b'],
          '👏': ['c'],
          '💪': ['d', 'e', 'f'],
        },
        isEngagementTrigger: false,
      };

      expect(getTotalReactions(item)).toBe(6);
    });

    it('returns 0 for empty reactions', () => {
      const item: RichFeedItem = {
        id: 'test-item',
        type: 'level_up',
        actorUid: 'actor',
        actorDisplayName: 'Actor',
        actorCatId: 'luna',
        actorRankTier: 'novice',
        actorRankDivision: 3,
        payload: {},
        timestamp: Date.now(),
        reactions: {},
        isEngagementTrigger: false,
      };

      expect(getTotalReactions(item)).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // postRichFeedItem (Firestore)
  // -----------------------------------------------------------------------

  describe('postRichFeedItem', () => {
    it('writes to users/{uid}/richFeed/{itemId}', async () => {
      const item = buildRichFeedItem(
        'rank_promotion',
        {
          uid: 'user-1',
          displayName: 'Alice',
          catId: 'luna',
          rankTier: 'performer',
          rankDivision: 2,
        },
        {},
      );

      await postRichFeedItem('user-1', item);

      expect(mockedDoc).toHaveBeenCalledWith('mock-db', 'users', 'user-1', 'richFeed', item.id);
      expect(mockedSetDoc).toHaveBeenCalledWith('mock-doc-ref', item);
    });
  });

  // -----------------------------------------------------------------------
  // getFriendRichFeed
  // -----------------------------------------------------------------------

  describe('getFriendRichFeed', () => {
    it('returns parsed feed items', async () => {
      const mockItem: RichFeedItem = {
        id: 'item-1',
        type: 'level_up',
        actorUid: 'friend-1',
        actorDisplayName: 'Friend',
        actorCatId: 'jazzy',
        actorRankTier: 'apprentice',
        actorRankDivision: 1,
        payload: { level: 5 },
        timestamp: 1000,
        reactions: {},
        isEngagementTrigger: false,
      };

      mockedGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => mockItem }],
      } as ReturnType<typeof getDocs> extends Promise<infer T> ? T : never);

      const result = await getFriendRichFeed('friend-1');
      expect(result).toEqual([mockItem]);
    });
  });

  // -----------------------------------------------------------------------
  // getAggregatedRichFeed
  // -----------------------------------------------------------------------

  describe('getAggregatedRichFeed', () => {
    it('returns empty array for no friends', async () => {
      const result = await getAggregatedRichFeed([]);
      expect(result).toEqual([]);
    });

    it('merges and sorts by timestamp descending', async () => {
      const item1 = { ...buildRichFeedItem('level_up', { uid: 'a', displayName: 'A', catId: '', rankTier: 'novice' as const, rankDivision: 3 }, {}), timestamp: 100 };
      const item2 = { ...buildRichFeedItem('cat_evolution', { uid: 'b', displayName: 'B', catId: '', rankTier: 'novice' as const, rankDivision: 3 }, {}), timestamp: 300 };
      const item3 = { ...buildRichFeedItem('rank_promotion', { uid: 'a', displayName: 'A', catId: '', rankTier: 'performer' as const, rankDivision: 2 }, {}), timestamp: 200 };

      mockedGetDocs
        .mockResolvedValueOnce({ docs: [{ data: () => item1 }, { data: () => item3 }] } as ReturnType<typeof getDocs> extends Promise<infer T> ? T : never)
        .mockResolvedValueOnce({ docs: [{ data: () => item2 }] } as ReturnType<typeof getDocs> extends Promise<infer T> ? T : never);

      const result = await getAggregatedRichFeed(['friend-a', 'friend-b'], 10, 50);

      expect(result).toHaveLength(3);
      expect(result[0].timestamp).toBe(300);
      expect(result[1].timestamp).toBe(200);
      expect(result[2].timestamp).toBe(100);
    });

    it('caps at maxTotal', async () => {
      const items = Array.from({ length: 5 }, (_, i) =>
        ({ ...buildRichFeedItem('level_up', { uid: 'a', displayName: 'A', catId: '', rankTier: 'novice' as const, rankDivision: 3 }, {}), timestamp: i }),
      );

      mockedGetDocs.mockResolvedValueOnce({
        docs: items.map((item) => ({ data: () => item })),
      } as ReturnType<typeof getDocs> extends Promise<infer T> ? T : never);

      const result = await getAggregatedRichFeed(['friend-a'], 10, 3);
      expect(result).toHaveLength(3);
    });
  });

  // -----------------------------------------------------------------------
  // toggleReaction
  // -----------------------------------------------------------------------

  describe('toggleReaction', () => {
    it('adds reaction when not currently reacted', async () => {
      await toggleReaction('owner-uid', 'item-1', '🔥', 'reactor-uid', false);

      expect(mockedUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', {
        'reactions.🔥': { _type: 'arrayUnion', val: 'reactor-uid' },
      });
    });

    it('removes reaction when currently reacted', async () => {
      await toggleReaction('owner-uid', 'item-1', '👏', 'reactor-uid', true);

      expect(mockedUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', {
        'reactions.👏': { _type: 'arrayRemove', val: 'reactor-uid' },
      });
    });
  });
});
