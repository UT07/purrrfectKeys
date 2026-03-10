/**
 * Contact Lookup Service — Phone/email-based friend discovery
 *
 * Privacy-first design:
 *   - Raw phone numbers and emails NEVER leave the device
 *   - Only SHA-256 hashes are stored/queried in Firestore
 *   - Users must opt in to register their contact info for discovery
 *
 * Firestore paths:
 *   contactLookup/{hash} → { uid, type: 'phone' | 'email' }
 */

import {
  doc,
  setDoc,
  documentId,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './config';
import { digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';

// ---------------------------------------------------------------------------
// Phone Number Normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a phone number to a minimal digit string for hashing.
 * Strips all non-digit characters, ensures country code prefix.
 * For US numbers without country code, prepends "1".
 */
export function normalizePhoneNumber(raw: string): string | null {
  // Strip everything except digits and leading +
  const digits = raw.replace(/[^\d]/g, '');

  if (digits.length < 7) return null; // Too short to be valid
  if (digits.length > 15) return null; // Too long per E.164

  // If it starts with 0 (local format), can't reliably normalize without country
  // If it's 10 digits, assume US/CA and prepend 1
  if (digits.length === 10) return '1' + digits;

  // If it's 11 digits starting with 1, it's already US/CA with country code
  if (digits.length === 11 && digits.startsWith('1')) return digits;

  // For other lengths, return as-is (already has country code)
  return digits;
}

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/**
 * SHA-256 hash a normalized contact value.
 * Prefix with type to prevent collisions between phone/email.
 */
export async function hashContact(
  type: 'phone' | 'email',
  value: string,
): Promise<string> {
  const input = `${type}:${value.toLowerCase().trim()}`;
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, input);
}

// ---------------------------------------------------------------------------
// Registration — User opts in to be discoverable
// ---------------------------------------------------------------------------

/**
 * Register a user's phone number for contact-based discovery.
 * Stores only the hash in Firestore.
 */
export async function registerPhoneForDiscovery(
  uid: string,
  phoneNumber: string,
): Promise<void> {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) throw new Error('Invalid phone number');

  const hash = await hashContact('phone', normalized);
  const ref = doc(db, 'contactLookup', hash);
  await setDoc(ref, { uid, type: 'phone' });
}

/**
 * Register a user's email for contact-based discovery.
 * Stores only the hash in Firestore.
 */
export async function registerEmailForDiscovery(
  uid: string,
  email: string,
): Promise<void> {
  const trimmed = email.toLowerCase().trim();
  if (!trimmed || !trimmed.includes('@')) throw new Error('Invalid email');

  const hash = await hashContact('email', trimmed);
  const ref = doc(db, 'contactLookup', hash);
  await setDoc(ref, { uid, type: 'email' });
}

// ---------------------------------------------------------------------------
// Contact Matching — Find app users from device contacts
// ---------------------------------------------------------------------------

export interface ContactMatch {
  uid: string;
  contactName: string;
  matchType: 'phone' | 'email';
}

/**
 * Batch look up hashes against the contactLookup collection.
 * Firestore `in` queries support max 30 items, so we chunk.
 */
async function batchLookupHashes(
  hashes: string[],
): Promise<Map<string, string>> {
  const results = new Map<string, string>(); // hash → uid
  if (hashes.length === 0) return results;

  const unique = [...new Set(hashes)];
  const CHUNK_SIZE = 30;

  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    const chunk = unique.slice(i, i + CHUNK_SIZE);
    const lookupCol = collection(db, 'contactLookup');
    const q = query(lookupCol, where(documentId(), 'in', chunk));
    const snap = await getDocs(q);

    for (const d of snap.docs) {
      const data = d.data() as { uid: string };
      results.set(d.id, data.uid);
    }
  }

  return results;
}

/**
 * Find registered app users from a list of device contacts.
 *
 * @param contacts Array of { name, phoneNumbers?, emails? }
 * @param myUid    Current user's uid (excluded from results)
 * @returns Array of ContactMatch with uid, contact name, and match type
 */
export async function findFriendsFromContacts(
  contacts: Array<{
    name: string;
    phoneNumbers?: string[];
    emails?: string[];
  }>,
  myUid: string,
): Promise<ContactMatch[]> {
  // Build hash → contact info map
  const hashToContact = new Map<string, { name: string; type: 'phone' | 'email' }>();

  const hashPromises: Promise<void>[] = [];

  for (const contact of contacts) {
    // Hash phone numbers
    if (contact.phoneNumbers) {
      for (const raw of contact.phoneNumbers) {
        const normalized = normalizePhoneNumber(raw);
        if (normalized) {
          hashPromises.push(
            hashContact('phone', normalized).then((h) => {
              hashToContact.set(h, { name: contact.name, type: 'phone' });
            }),
          );
        }
      }
    }

    // Hash emails
    if (contact.emails) {
      for (const email of contact.emails) {
        const trimmed = email.toLowerCase().trim();
        if (trimmed && trimmed.includes('@')) {
          hashPromises.push(
            hashContact('email', trimmed).then((h) => {
              hashToContact.set(h, { name: contact.name, type: 'email' });
            }),
          );
        }
      }
    }
  }

  await Promise.all(hashPromises);

  if (hashToContact.size === 0) return [];

  // Batch lookup
  const hashUidMap = await batchLookupHashes([...hashToContact.keys()]);

  // Build results, excluding self and deduplicating by uid
  const matches = new Map<string, ContactMatch>();

  for (const [hash, uid] of hashUidMap) {
    if (uid === myUid) continue;
    if (matches.has(uid)) continue;

    const info = hashToContact.get(hash);
    if (info) {
      matches.set(uid, {
        uid,
        contactName: info.name,
        matchType: info.type,
      });
    }
  }

  return [...matches.values()];
}
