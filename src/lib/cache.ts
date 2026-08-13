/**
 * Multi-replica Resilient Cache Utility
 * Supports optional Upstash/Redis HTTP caching when REDIS_URL or UPSTASH_REDIS_REST_URL is configured,
 * with graceful in-memory fallback and Cache-Control header helpers.
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const memoryCache = new Map<string, CacheEntry<any>>()

// Clean expired entries from in-memory cache periodically (every 60s)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of memoryCache.entries()) {
      if (now > entry.expiresAt) {
        memoryCache.delete(key)
      }
    }
  }, 60000).unref?.()
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

    if (upstashUrl && upstashToken) {
      const res = await fetch(`${upstashUrl}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
        cache: 'no-store',
      })
      if (res.ok) {
        const json = await res.json()
        if (json.result) {
          return JSON.parse(json.result) as T
        }
      }
    }
  } catch (err) {
    console.warn('Redis GET cache fallback:', err)
  }

  // Memory fallback
  const entry = memoryCache.get(key)
  if (entry) {
    if (Date.now() < entry.expiresAt) {
      return entry.data as T
    }
    memoryCache.delete(key)
  }
  return null
}

export async function setCache<T>(key: string, data: T, ttlSeconds: number = 15): Promise<void> {
  try {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

    if (upstashUrl && upstashToken) {
      const value = JSON.stringify(data)
      await fetch(`${upstashUrl}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/EX/${ttlSeconds}`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
        cache: 'no-store',
      })
    }
  } catch (err) {
    console.warn('Redis SET cache fallback:', err)
  }

  // Memory fallback
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
}

export async function clearCachePattern(prefix: string): Promise<void> {
  // Clear memory cache keys starting with prefix
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key)
    }
  }
}

/**
 * Generates production-safe HTTP Cache-Control headers for CDN & Edge routing.
 */
export function getFeedCacheHeaders(ttlSeconds: number = 10, staleSeconds: number = 30): HeadersInit {
  return {
    'Cache-Control': `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}, stale-while-revalidate=${staleSeconds}`,
  }
}
