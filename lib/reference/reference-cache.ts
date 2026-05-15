type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const defaultTtlMs = 1000 * 60 * 45;

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

export function setReferenceCache<T>(key: string, value: T, ttlMs = defaultTtlMs) {
  if (!isReferenceCacheEnabled()) {
    return;
  }

  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function createReferenceCacheKey({
  provider,
  query,
  preferencesHash,
  target,
}: {
  provider: string;
  query: string;
  preferencesHash: string;
  target: number;
}) {
  return [
    "reference",
    provider,
    hashKey(query),
    preferencesHash,
    String(target),
  ].join(":");
}

export function createReferencePreferencesHash(value: unknown) {
  return hashKey(JSON.stringify(value));
}

function hashKey(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}
