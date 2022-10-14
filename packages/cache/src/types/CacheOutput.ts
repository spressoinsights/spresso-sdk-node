export type Ok<T> = { kind: 'Ok'; ok: T };
export type CacheHit<T> = { kind: 'CacheHit'; value: T };

export type CacheErrors<Key extends Record<string, string>> = CacheMiss<Key> | FatalError;

export type CacheMiss<Key extends Record<string, string>> = { kind: 'CacheMiss'; input: Key };
export type FatalError = { kind: 'FatalError'; error: unknown };
