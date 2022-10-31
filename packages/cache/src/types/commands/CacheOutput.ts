export type CacheResult<T, Key extends Record<string, string>> = Ok<CacheHit<T> | CacheMiss<Key>> | FatalError;

// should this be moved out to a common utils package?
export type Ok<T> = { kind: 'Ok'; ok: T };
export type CacheHit<T> = { kind: 'CacheHit'; value: T };
export type CacheMiss<Key extends Record<string, string>> = { kind: 'CacheMiss'; input: Key };

export type FatalError = { kind: 'FatalError'; error: unknown };
