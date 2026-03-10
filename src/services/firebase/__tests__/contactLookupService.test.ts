/**
 * Tests for contactLookupService — phone normalization and hashing.
 * Firebase calls are mocked; these test the pure logic.
 */

import { normalizePhoneNumber, hashContact } from '../contactLookupService';

// ---------------------------------------------------------------------------
// Phone Number Normalization
// ---------------------------------------------------------------------------

describe('normalizePhoneNumber', () => {
  it('normalizes a 10-digit US number', () => {
    expect(normalizePhoneNumber('5551234567')).toBe('15551234567');
  });

  it('normalizes a formatted US number', () => {
    expect(normalizePhoneNumber('(555) 123-4567')).toBe('15551234567');
  });

  it('keeps 11-digit numbers starting with 1', () => {
    expect(normalizePhoneNumber('15551234567')).toBe('15551234567');
  });

  it('handles +1 prefix', () => {
    expect(normalizePhoneNumber('+1 555 123 4567')).toBe('15551234567');
  });

  it('handles international numbers', () => {
    expect(normalizePhoneNumber('+44 20 7946 0958')).toBe('442079460958');
  });

  it('returns null for too-short numbers', () => {
    expect(normalizePhoneNumber('12345')).toBeNull();
  });

  it('returns null for too-long numbers', () => {
    expect(normalizePhoneNumber('1234567890123456')).toBeNull();
  });

  it('strips all non-digit characters', () => {
    // "ext.100" digits get included — 15 digits total, still valid per E.164
    expect(normalizePhoneNumber('1-555-123-4567 ext.100')).toBe('15551234567100');
  });
});

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

describe('hashContact', () => {
  it('produces a deterministic hash for phone', async () => {
    const hash1 = await hashContact('phone', '15551234567');
    const hash2 = await hashContact('phone', '15551234567');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different types', async () => {
    const phoneHash = await hashContact('phone', 'test@example.com');
    const emailHash = await hashContact('email', 'test@example.com');
    expect(phoneHash).not.toBe(emailHash);
  });

  it('normalizes email to lowercase', async () => {
    const hash1 = await hashContact('email', 'Test@Example.COM');
    const hash2 = await hashContact('email', 'test@example.com');
    expect(hash1).toBe(hash2);
  });

  it('returns a hex string', async () => {
    const hash = await hashContact('phone', '15551234567');
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });
});
