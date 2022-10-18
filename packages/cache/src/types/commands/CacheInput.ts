export type CacheInputGet<Key extends Record<string, string>> = { key: Key; now: Date; ttlMs: number };
export type CacheInputGetMany<Key extends Record<string, string>> = { keys: Key[]; now: Date; ttlMs: number };

export type CacheInputSet<Key extends Record<string, string>, Output> = {
    entry: {
        key: Key;
        value: Output;
    };
    now: Date;
    ttlMs: number;
};

export type CacheInputSetMany<Key extends Record<string, string>, Output> = {
    entries: {
        key: Key;
        value: Output;
    }[];
    now: Date;
    ttlMs: number;
};

export type CacheInputDelete<Key extends Record<string, string>> = { key: Key };
export type CacheInputDeleteMany<Key extends Record<string, string>> = { keys: Key[] };
