type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

export function isReferenceCacheEnabled() {
  return process.env.REFERENCE_PROVIDER_CACHE_ENABLED !== "false";
}

export function getReferenceCache<T>(key: string): T | null {
  if (!isReferenceCacheEnabled()) {
    return null;
  }

  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    return null;
  }

  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

export function setReferenceCache<T>(key: string, value: T, ttlMs = 1000 * 60 * 20) {
  if (!isReferenceCacheEnabled()) {
    return;
  }

  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}