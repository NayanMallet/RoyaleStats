import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cache } from './cache';

describe('cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    cache.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null for an unknown key', () => {
    expect(cache.get('player:UNKNOWN')).toBeNull();
  });

  it('returns the stored value before expiry', () => {
    cache.set('player:2PP', { name: 'Karim' }, 1000);

    vi.advanceTimersByTime(999);

    expect(cache.get('player:2PP')).toEqual({ name: 'Karim' });
  });

  it('returns null once the TTL has expired', () => {
    cache.set('player:2PP', { name: 'Karim' }, 1000);

    vi.advanceTimersByTime(1001);

    expect(cache.get('player:2PP')).toBeNull();
  });

  it('uses a 5-minute TTL by default', () => {
    cache.set('cards', []);

    vi.advanceTimersByTime(5 * 60 * 1000 - 1);
    expect(cache.get('cards')).toEqual([]);

    vi.advanceTimersByTime(2);
    expect(cache.get('cards')).toBeNull();
  });

  it('empties every entry on clear()', () => {
    cache.set('a', 1);
    cache.set('b', 2);

    cache.clear();

    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBeNull();
  });
});
