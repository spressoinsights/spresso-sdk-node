export type CacheResult<T, Key extends Record<string, string>> = Success<CacheHit<T> | CacheMiss<Key>> | FatalError;

// should this be moved out to a common utils package?
export type Success<T> = { kind: 'Success'; value: T };
export type CacheHit<T> = { kind: 'CacheHit'; cachedValue: T };
export type CacheMiss<Key extends Record<string, string>> = { kind: 'CacheMiss'; input: Key };

export type FatalError = { kind: 'FatalError'; error: unknown };
