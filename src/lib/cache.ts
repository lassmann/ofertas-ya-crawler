import { LRUCache } from 'lru-cache'

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new LRUCache<string, any>({
  max: 500,
  ttl: TWELVE_HOURS_MS,
})

export const cacheService = {
  get: <T>(key: string): T | undefined => cache.get(key) as T | undefined,

  set: <T>(key: string, value: T, ttl?: number): void => {
    cache.set(key, value, { ttl })
  },

  has: (key: string): boolean => cache.has(key),

  invalidate: (pattern: string): void => {
    const prefix = pattern.replace('*', '')
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key)
      }
    }
  },

  delete: (key: string): void => {
    cache.delete(key)
  },

  clear: (): void => {
    cache.clear()
  },

  size: (): number => cache.size,

  keys: (): string[] => [...cache.keys()],
}

export type CacheService = typeof cacheService
