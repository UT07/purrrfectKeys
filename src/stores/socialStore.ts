/**
 * Social Store
 *
 * Manages social features:
 * - Friend code for discovery
 * - Friend connections (add/remove/status)
 * - Activity feed from friends (legacy + rich feed with reactions)
 * - Friend challenges (send/receive/complete)
 * - Persisted to AsyncStorage via debounced save
 */

import { create } from 'zustand';
import type { FriendConnection, ActivityFeedItem, FriendChallenge, RichFeedItem, ReactionType } from './types';
import { PersistenceManager, STORAGE_KEYS, createDebouncedSave } from './persistence';

const MAX_ACTIVITY_FEED = 50;

export interface SocialStoreState {
  friendCode: string;
  friends: FriendConnection[];
  activityFeed: ActivityFeedItem[];
  richFeed: RichFeedItem[];
  challenges: FriendChallenge[];

  // Actions
  setFriendCode: (code: string) => void;
  addFriend: (friend: FriendConnection) => void;
  updateFriendStatus: (uid: string, status: FriendConnection['status']) => void;
  removeFriend: (uid: string) => void;
  setFriends: (friends: FriendConnection[]) => void;
  addActivityItem: (item: ActivityFeedItem) => void;
  setActivityFeed: (items: ActivityFeedItem[]) => void;
  setRichFeed: (items: RichFeedItem[]) => void;
  addRichFeedItem: (item: RichFeedItem) => void;
  toggleReaction: (itemId: string, reaction: ReactionType, uid: string) => void;
  addChallenge: (challenge: FriendChallenge) => void;
  updateChallenge: (id: string, updates: Partial<FriendChallenge>) => void;
  setChallenges: (challenges: FriendChallenge[]) => void;
  reset: () => void;
}

type SocialData = Pick<SocialStoreState, 'friendCode' | 'friends' | 'activityFeed' | 'richFeed' | 'challenges'>;

const defaultData: SocialData = {
  friendCode: '',
  friends: [],
  activityFeed: [],
  richFeed: [],
  challenges: [],
};

const debouncedSave = createDebouncedSave<SocialData>(STORAGE_KEYS.SOCIAL, 500);

export const useSocialStore = create<SocialStoreState>((set, get) => ({
  ...defaultData,

  setFriendCode: (code: string) => {
    set({ friendCode: code });
    debouncedSave(get());
  },

  addFriend: (friend: FriendConnection) => {
    set((state) => ({
      friends: [...state.friends, friend],
    }));
    debouncedSave(get());
  },

  updateFriendStatus: (uid: string, status: FriendConnection['status']) => {
    set((state) => ({
      friends: state.friends.map((f) =>
        f.uid === uid ? { ...f, status } : f
      ),
    }));
    debouncedSave(get());
  },

  removeFriend: (uid: string) => {
    set((state) => ({
      friends: state.friends.filter((f) => f.uid !== uid),
      activityFeed: state.activityFeed.filter((item) => item.friendUid !== uid),
      richFeed: state.richFeed.filter((item) => item.actorUid !== uid),
    }));
    debouncedSave(get());
  },

  setFriends: (friends: FriendConnection[]) => {
    set({ friends });
    debouncedSave(get());
  },

  addActivityItem: (item: ActivityFeedItem) => {
    set((state) => ({
      activityFeed: [item, ...state.activityFeed].slice(0, MAX_ACTIVITY_FEED),
    }));
    debouncedSave(get());
  },

  setActivityFeed: (items: ActivityFeedItem[]) => {
    set({ activityFeed: items.slice(0, MAX_ACTIVITY_FEED) });
    debouncedSave(get());
  },

  setRichFeed: (items: RichFeedItem[]) => {
    set({ richFeed: items.slice(0, MAX_ACTIVITY_FEED) });
    debouncedSave(get());
  },

  addRichFeedItem: (item: RichFeedItem) => {
    set((state) => ({
      richFeed: [item, ...state.richFeed].slice(0, MAX_ACTIVITY_FEED),
    }));
    debouncedSave(get());
  },

  toggleReaction: (itemId: string, reaction: ReactionType, uid: string) => {
    set((state) => ({
      richFeed: state.richFeed.map((item) => {
        if (item.id !== itemId) return item;

        const currentReactors = item.reactions[reaction] ?? [];
        const hasReacted = currentReactors.includes(uid);

        return {
          ...item,
          reactions: {
            ...item.reactions,
            [reaction]: hasReacted
              ? currentReactors.filter((u) => u !== uid)
              : [...currentReactors, uid],
          },
        };
      }),
    }));
    debouncedSave(get());
  },

  addChallenge: (challenge: FriendChallenge) => {
    set((state) => ({
      challenges: [challenge, ...state.challenges].slice(0, MAX_ACTIVITY_FEED),
    }));
    debouncedSave(get());
  },

  updateChallenge: (id: string, updates: Partial<FriendChallenge>) => {
    set((state) => ({
      challenges: state.challenges.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
    debouncedSave(get());
  },

  setChallenges: (challenges: FriendChallenge[]) => {
    set({ challenges });
    debouncedSave(get());
  },

  reset: () => {
    set(defaultData);
    PersistenceManager.deleteState(STORAGE_KEYS.SOCIAL);
  },
}));

/** Hydrate social store from AsyncStorage on app launch */
export async function hydrateSocialStore(): Promise<void> {
  const data = await PersistenceManager.loadState<SocialData>(STORAGE_KEYS.SOCIAL, defaultData);
  // Handle migration: older saved state won't have richFeed
  if (!data.richFeed) {
    data.richFeed = [];
  }
  useSocialStore.setState(data);
}
