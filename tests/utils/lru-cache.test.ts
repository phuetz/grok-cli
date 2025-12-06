import {
  LRUCache,
  LRUMap,
  CACHE_SIZES,
  CACHE_TTL,
  createCheckpointCache,
  createChunkStoreCache,
  createMemoryCache,
  createAnalysisCache,
} from '../../src/utils/lru-cache';

describe('LRUCache', () => {
  describe('constructor', () => {
    it('should create cache with specified maxSize', () => {
      const cache = new LRUCache<string>({ maxSize: 100 });
      expect(cache.size).toBe(0);
    });

    it('should enforce minimum size of 1', () => {
      const cache = new LRUCache<string>({ maxSize: 0 });
      cache.set('a', 'value');
      expect(cache.size).toBe(1);
    });

    it('should accept optional TTL', () => {
      const cache = new LRUCache<string>({ maxSize: 10, ttlMs: 1000 });
      expect(cache).toBeInstanceOf(LRUCache);
    });

    it('should accept optional onEvict callback', () => {
      const onEvict = jest.fn();
      const cache = new LRUCache<string>({ maxSize: 1, onEvict });
      cache.set('a', '1');
      cache.set('b', '2');
      expect(onEvict).toHaveBeenCalledWith('a', '1');
    });
  });

  describe('get/set', () => {
    let cache: LRUCache<string>;

    beforeEach(() => {
      cache = new LRUCache<string>({ maxSize: 3 });
    });

    it('should set and get values', () => {
      cache.set('key', 'value');
      expect(cache.get('key')).toBe('value');
    });

    it('should return undefined for missing keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should update existing keys', () => {
      cache.set('key', 'value1');
      cache.set('key', 'value2');
      expect(cache.get('key')).toBe('value2');
      expect(cache.size).toBe(1);
    });

    it('should evict LRU entry when at capacity', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
      cache.set('d', '4'); // Should evict 'a'

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe('2');
      expect(cache.get('c')).toBe('3');
      expect(cache.get('d')).toBe('4');
    });

    it('should update access time on get', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');

      // Access 'a' to make it most recently used
      cache.get('a');

      // Add new entry, should evict 'b' (LRU)
      cache.set('d', '4');

      expect(cache.get('a')).toBe('1');
      expect(cache.get('b')).toBeUndefined();
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      const cache = new LRUCache<string>({ maxSize: 10, ttlMs: 50 });
      cache.set('key', 'value');

      expect(cache.get('key')).toBe('value');

      await new Promise(resolve => setTimeout(resolve, 60));

      expect(cache.get('key')).toBeUndefined();
    });

    it('should count expired entries as misses', async () => {
      const cache = new LRUCache<string>({ maxSize: 10, ttlMs: 50 });
      cache.set('key', 'value');
      cache.get('key'); // Hit

      await new Promise(resolve => setTimeout(resolve, 60));

      cache.get('key'); // Miss (expired)

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      const cache = new LRUCache<string>({ maxSize: 10 });
      cache.set('key', 'value');
      expect(cache.has('key')).toBe(true);
    });

    it('should return false for missing keys', () => {
      const cache = new LRUCache<string>({ maxSize: 10 });
      expect(cache.has('key')).toBe(false);
    });

    it('should return false for expired keys', async () => {
      const cache = new LRUCache<string>({ maxSize: 10, ttlMs: 50 });
      cache.set('key', 'value');

      await new Promise(resolve => setTimeout(resolve, 60));

      expect(cache.has('key')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing keys', () => {
      const cache = new LRUCache<string>({ maxSize: 10 });
      cache.set('key', 'value');
      expect(cache.delete('key')).toBe(true);
      expect(cache.get('key')).toBeUndefined();
    });

    it('should return false for missing keys', () => {
      const cache = new LRUCache<string>({ maxSize: 10 });
      expect(cache.delete('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      const cache = new LRUCache<string>({ maxSize: 10 });
      cache.set('a', '1');
      cache.set('b', '2');
      cache.clear();
      expect(cache.size).toBe(0);
    });

    it('should emit clear event', () => {
      const cache = new LRUCache<string>({ maxSize: 10 });
      const handler = jest.fn();
      cache.on('clear', handler);

      cache.set('a', '1');
      cache.clear();

      expect(handler).toHaveBeenCalledWith({ size: 1 });
    });
  });

  describe('keys/values/entries', () => {
    let cache: LRUCache<string>;

    beforeEach(() => {
      cache = new LRUCache<string>({ maxSize: 10 });
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
    });

    it('should return all keys', () => {
      expect(cache.keys()).toEqual(['a', 'b', 'c']);
    });

    it('should return all values', () => {
      expect(cache.values()).toEqual(['1', '2', '3']);
    });

    it('should return all entries', () => {
      expect(cache.entries()).toEqual([
        ['a', '1'],
        ['b', '2'],
        ['c', '3'],
      ]);
    });

    it('should exclude expired entries from values', async () => {
      const expCache = new LRUCache<string>({ maxSize: 10, ttlMs: 50 });
      expCache.set('a', '1');

      await new Promise(resolve => setTimeout(resolve, 60));

      expCache.set('b', '2');

      expect(expCache.values()).toEqual(['2']);
    });
  });

  describe('forEach', () => {
    it('should iterate over all entries', () => {
      const cache = new LRUCache<string>({ maxSize: 10 });
      cache.set('a', '1');
      cache.set('b', '2');

      const entries: [string, string][] = [];
      cache.forEach((value, key) => {
        entries.push([key, value]);
      });

      expect(entries).toEqual([
        ['a', '1'],
        ['b', '2'],
      ]);
    });
  });

  describe('Symbol.iterator', () => {
    it('should be iterable with for...of', () => {
      const cache = new LRUCache<string>({ maxSize: 10 });
      cache.set('a', '1');
      cache.set('b', '2');

      const entries: [string, string][] = [];
      for (const [key, value] of cache) {
        entries.push([key, value]);
      }

      expect(entries).toEqual([
        ['a', '1'],
        ['b', '2'],
      ]);
    });

    it('should work with spread operator', () => {
      const cache = new LRUCache<string>({ maxSize: 10 });
      cache.set('a', '1');
      cache.set('b', '2');

      const entries = [...cache];
      expect(entries).toEqual([
        ['a', '1'],
        ['b', '2'],
      ]);
    });
  });

  describe('toObject/fromObject', () => {
    it('should convert cache to plain object', () => {
      const cache = new LRUCache<string>({ maxSize: 10 });
      cache.set('a', '1');
      cache.set('b', '2');

      const obj = cache.toObject();
      expect(obj).toEqual({ a: '1', b: '2' });
    });

    it('should load from plain object', () => {
      const cache = new LRUCache<string>({ maxSize: 10 });
      cache.fromObject({ a: '1', b: '2' });

      expect(cache.get('a')).toBe('1');
      expect(cache.get('b')).toBe('2');
    });

    it('should load from Map', () => {
      const cache = new LRUCache<string>({ maxSize: 10 });
      const map = new Map([['a', '1'], ['b', '2']]);
      cache.fromObject(map);

      expect(cache.get('a')).toBe('1');
      expect(cache.get('b')).toBe('2');
    });
  });

  describe('getStats', () => {
    it('should track hits and misses', () => {
      const cache = new LRUCache<string>({ maxSize: 10 });
      cache.set('a', '1');

      cache.get('a'); // Hit
      cache.get('a'); // Hit
      cache.get('b'); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });

    it('should track evictions', () => {
      const cache = new LRUCache<string>({ maxSize: 2 });
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3'); // Evicts 'a'

      const stats = cache.getStats();
      expect(stats.evictions).toBe(1);
    });

    it('should return correct size info', () => {
      const cache = new LRUCache<string>({ maxSize: 10 });
      cache.set('a', '1');
      cache.set('b', '2');

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(10);
    });
  });

  describe('resetStats', () => {
    it('should reset all statistics', () => {
      const cache = new LRUCache<string>({ maxSize: 10 });
      cache.set('a', '1');
      cache.get('a');
      cache.get('b');

      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
    });
  });

  describe('prune', () => {
    it('should remove expired entries', async () => {
      const cache = new LRUCache<string>({ maxSize: 10, ttlMs: 50 });
      cache.set('a', '1');
      cache.set('b', '2');

      await new Promise(resolve => setTimeout(resolve, 60));

      cache.set('c', '3'); // Not expired

      const pruned = cache.prune();
      expect(pruned).toBe(2);
      expect(cache.size).toBe(1);
    });
  });

  describe('setMaxSize', () => {
    it('should update max size', () => {
      const cache = new LRUCache<string>({ maxSize: 10 });
      cache.setMaxSize(5);

      const stats = cache.getStats();
      expect(stats.maxSize).toBe(5);
    });

    it('should evict if new size is smaller', () => {
      const cache = new LRUCache<string>({ maxSize: 5 });
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
      cache.set('d', '4');
      cache.set('e', '5');

      cache.setMaxSize(2);

      expect(cache.size).toBe(2);
    });
  });

  describe('dispose', () => {
    it('should clear cache and remove listeners', () => {
      const cache = new LRUCache<string>({ maxSize: 10 });
      const handler = jest.fn();
      cache.on('set', handler);

      cache.set('a', '1');
      cache.dispose();

      expect(cache.size).toBe(0);
      expect(cache.listenerCount('set')).toBe(0);
    });
  });

  describe('events', () => {
    it('should emit set event', () => {
      const cache = new LRUCache<string>({ maxSize: 10 });
      const handler = jest.fn();
      cache.on('set', handler);

      cache.set('key', 'value');

      expect(handler).toHaveBeenCalledWith({ key: 'key', value: 'value' });
    });

    it('should emit delete event', () => {
      const cache = new LRUCache<string>({ maxSize: 10 });
      const handler = jest.fn();
      cache.on('delete', handler);

      cache.set('key', 'value');
      cache.delete('key');

      expect(handler).toHaveBeenCalledWith({ key: 'key', value: 'value' });
    });

    it('should emit evict event', () => {
      const cache = new LRUCache<string>({ maxSize: 1 });
      const handler = jest.fn();
      cache.on('evict', handler);

      cache.set('a', '1');
      cache.set('b', '2');

      expect(handler).toHaveBeenCalledWith({ key: 'a', value: '1' });
    });
  });
});

describe('LRUMap', () => {
  it('should work as Map replacement', () => {
    const map = new LRUMap<number, string>(10);

    map.set(1, 'one');
    map.set(2, 'two');

    expect(map.get(1)).toBe('one');
    expect(map.get(2)).toBe('two');
    expect(map.size).toBe(2);
  });

  it('should support custom key serialization', () => {
    const map = new LRUMap<{ id: number }, string>(10, {
      keyToString: (k) => `id:${k.id}`,
    });

    map.set({ id: 1 }, 'one');
    expect(map.get({ id: 1 })).toBe('one');
  });

  it('should evict LRU entries', () => {
    const map = new LRUMap<number, string>(2);

    map.set(1, 'one');
    map.set(2, 'two');
    map.set(3, 'three');

    expect(map.has(1)).toBe(false);
    expect(map.has(2)).toBe(true);
    expect(map.has(3)).toBe(true);
  });

  it('should provide stats', () => {
    const map = new LRUMap<number, string>(10);
    map.set(1, 'one');
    map.get(1);
    map.get(2);

    const stats = map.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });
});

describe('Cache constants', () => {
  it('should have standard cache sizes', () => {
    expect(CACHE_SIZES.SMALL).toBe(100);
    expect(CACHE_SIZES.MEDIUM).toBe(500);
    expect(CACHE_SIZES.LARGE).toBe(1000);
    expect(CACHE_SIZES.XLARGE).toBe(5000);
  });

  it('should have standard TTL values', () => {
    expect(CACHE_TTL.SHORT).toBe(60 * 1000);
    expect(CACHE_TTL.MEDIUM).toBe(5 * 60 * 1000);
    expect(CACHE_TTL.LONG).toBe(30 * 60 * 1000);
    expect(CACHE_TTL.HOUR).toBe(60 * 60 * 1000);
    expect(CACHE_TTL.DAY).toBe(24 * 60 * 60 * 1000);
  });
});

describe('Factory functions', () => {
  it('createCheckpointCache should create cache with correct settings', () => {
    const cache = createCheckpointCache<string>();
    const stats = cache.getStats();
    expect(stats.maxSize).toBe(CACHE_SIZES.CHECKPOINT);
  });

  it('createChunkStoreCache should create cache with correct settings', () => {
    const cache = createChunkStoreCache<string>();
    const stats = cache.getStats();
    expect(stats.maxSize).toBe(CACHE_SIZES.CHUNK_STORE);
  });

  it('createMemoryCache should create cache with correct settings', () => {
    const cache = createMemoryCache<string>();
    const stats = cache.getStats();
    expect(stats.maxSize).toBe(CACHE_SIZES.MEMORY);
  });

  it('createAnalysisCache should create cache with correct settings', () => {
    const cache = createAnalysisCache<string>();
    const stats = cache.getStats();
    expect(stats.maxSize).toBe(CACHE_SIZES.ANALYSIS);
  });
});
