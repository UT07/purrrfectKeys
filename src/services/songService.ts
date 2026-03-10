/**
 * Song Service — Firestore CRUD for the Music Library
 *
 * Firestore paths:
 *   songs/{songId}                    — full Song document
 *   users/{uid}/songMastery/{songId}  — per-user mastery
 *   users/{uid}/songRequests/{date}   — daily request counter
 */

import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase/config';
import type { Song, SongSummary, SongFilter, SongMastery } from '@/core/songs/songTypes';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Global catalogue — songs/{songId}
// ---------------------------------------------------------------------------

export async function getSong(songId: string): Promise<Song | null> {
  try {
    const ref = doc(db, 'songs', songId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as Song;
  } catch (err) {
    logger.warn('[SongService] getSong failed:', (err as Error)?.message);
    return null;
  }
}

export async function getSongSummaries(
  filter: SongFilter,
  pageSize: number = 20,
  pageAfter?: QueryDocumentSnapshot,
): Promise<{ summaries: SongSummary[]; lastDoc: QueryDocumentSnapshot | null }> {
  try {
    const constraints: Parameters<typeof query>[1][] = [];
    const hasFilters =
      (filter.genre && filter.genre !== 'all') ||
      (filter.difficulty && filter.difficulty !== 'all');

    if (filter.genre && filter.genre !== 'all') {
      constraints.push(where('metadata.genre', '==', filter.genre));
    }
    if (filter.difficulty && filter.difficulty !== 'all') {
      constraints.push(where('metadata.difficulty', '==', filter.difficulty));
    }

    // Only use orderBy when no where-clauses are present (avoids composite index requirement).
    // With filters active, we sort client-side instead.
    if (!hasFilters) {
      constraints.push(orderBy('metadata.title'));
      constraints.push(limit(pageSize));
      if (pageAfter) {
        constraints.push(startAfter(pageAfter));
      }
    }

    const q = query(collection(db, 'songs'), ...constraints);
    const snap = await getDocs(q);

    let summaries: SongSummary[] = snap.docs.map((d) => {
      const data = d.data() as Song;
      return {
        id: data.id,
        metadata: data.metadata,
        settings: {
          tempo: data.settings.tempo,
          timeSignature: data.settings.timeSignature,
          keySignature: data.settings.keySignature,
        },
        sectionCount: data.sections.length,
      };
    });

    // Client-side text search (Firestore doesn't support full-text search)
    if (filter.searchQuery) {
      const q = filter.searchQuery.toLowerCase();
      summaries = summaries.filter(
        (s) =>
          s.metadata.title.toLowerCase().includes(q) ||
          s.metadata.artist.toLowerCase().includes(q),
      );
    }

    // Client-side sort + pagination when filters are active
    summaries.sort((a, b) => a.metadata.title.localeCompare(b.metadata.title));
    if (hasFilters) {
      summaries = summaries.slice(0, pageSize);
    }

    const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;

    return { summaries, lastDoc };
  } catch (err) {
    logger.warn('[SongService] getSongSummaries failed:', (err as Error)?.message);
    return { summaries: [], lastDoc: null };
  }
}

export async function searchSongs(
  queryStr: string,
  maxResults: number = 10,
): Promise<SongSummary[]> {
  // Firestore doesn't support full-text search.
  // We load a broader set and filter client-side.
  const { summaries } = await getSongSummaries(
    { searchQuery: queryStr },
    50,
  );
  return summaries.slice(0, maxResults);
}

export async function saveSongToFirestore(song: Song): Promise<void> {
  try {
    const ref = doc(db, 'songs', song.id);
    await setDoc(ref, song);
  } catch (err) {
    logger.warn('[SongService] saveSongToFirestore failed:', (err as Error)?.message);
  }
}

export async function checkSongExists(songId: string): Promise<boolean> {
  try {
    const ref = doc(db, 'songs', songId);
    const snap = await getDoc(ref);
    return snap.exists();
  } catch (err) {
    logger.warn('[SongService] checkSongExists failed:', (err as Error)?.message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Per-user mastery — users/{uid}/songMastery/{songId}
// ---------------------------------------------------------------------------

export async function getUserSongMastery(
  uid: string,
  songId: string,
): Promise<SongMastery | null> {
  try {
    const ref = doc(db, 'users', uid, 'songMastery', songId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as SongMastery;
  } catch (err) {
    logger.warn('[SongService] getUserSongMastery failed:', (err as Error)?.message);
    return null;
  }
}

export async function getAllUserSongMastery(uid: string): Promise<SongMastery[]> {
  try {
    const q = query(collection(db, 'users', uid, 'songMastery'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as SongMastery);
  } catch (err) {
    logger.warn('[SongService] getAllUserSongMastery failed:', (err as Error)?.message);
    return [];
  }
}

export async function saveUserSongMastery(
  uid: string,
  mastery: SongMastery,
): Promise<void> {
  try {
    const ref = doc(db, 'users', uid, 'songMastery', mastery.songId);
    await setDoc(ref, mastery, { merge: true });
  } catch (err) {
    logger.warn('[SongService] saveUserSongMastery failed:', (err as Error)?.message);
  }
}

// ---------------------------------------------------------------------------
// Rate limiting — users/{uid}/songRequests/{date}
// ---------------------------------------------------------------------------

export async function getUserSongRequestCount(
  uid: string,
  date: string,
): Promise<number> {
  try {
    const ref = doc(db, 'users', uid, 'songRequests', date);
    const snap = await getDoc(ref);
    if (!snap.exists()) return 0;
    return (snap.data() as { count: number }).count ?? 0;
  } catch (err) {
    logger.warn('[SongService] getUserSongRequestCount failed:', (err as Error)?.message);
    return 0;
  }
}

export async function incrementSongRequestCount(
  uid: string,
  date: string,
): Promise<void> {
  try {
    const ref = doc(db, 'users', uid, 'songRequests', date);
    const snap = await getDoc(ref);
    const current = snap.exists() ? (snap.data() as { count: number }).count ?? 0 : 0;
    await setDoc(ref, { count: current + 1 });
  } catch (err) {
    logger.warn('[SongService] incrementSongRequestCount failed:', (err as Error)?.message);
  }
}
