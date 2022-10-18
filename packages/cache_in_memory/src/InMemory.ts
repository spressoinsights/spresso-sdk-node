import {
    CacheEntry,
    CacheHit,
    CacheInputDelete,
    CacheInputDeleteMany,
    CacheInputGet,
    CacheInputGetMany,
    CacheInputSet,
    CacheInputSetMany,
    CacheMiss,
    ICacheStrategy,
    mapGet,
    Ok,
} from '@spresso-sdk/cache';

// Should probably be a lru with some ttl checks. Dont see the memory footprint being anything we really need to worry about tho for the short term.

export class InMemory<Key extends Record<string, string>, Output> implements ICacheStrategy<Key, Output> {
    private readonly map: Map<string, CacheEntry<Output>>;

    constructor() {
        this.map = new Map<string, CacheEntry<Output>>();
    }

    // the ttl should be the jobs cadence

    // If the systems time is off what happens?
    // Should everything be relative?

    // how to force refresh?
    private keyToString<Key>(key: Key): string {
        // eslint-disable-next-line functional/immutable-data
        return JSON.stringify(
            key,
            Object.keys(key).sort((a, b) => a.localeCompare(b))
        );
    }

    async get(input: CacheInputGet<Key>): Promise<Ok<CacheHit<Output> | CacheMiss<Key>>> {
        const item = this.map.get(this.keyToString(input.key));
        return Promise.resolve({ kind: 'Ok', ok: mapGet<Key, Output>(input, item) });
    }

    async getMany(input: CacheInputGetMany<Key>): Promise<Ok<(CacheHit<Output> | CacheMiss<Key>)[]>> {
        return Promise.resolve({
            kind: 'Ok',
            ok: input.keys.map((x) => {
                const item = this.map.get(this.keyToString(x));
                return mapGet<Key, Output>({ ...input, key: x }, item);
            }),
        });
    }

    async set(input: CacheInputSet<Key, Output>): Promise<Ok<Output>> {
        this.map.set(this.keyToString(input.entry.key), {
            data: input.entry.value,
            dateAdded: input.now,
            ttlMs: input.ttlMs,
        });
        return Promise.resolve({ kind: 'Ok', ok: input.entry.value });
    }

    async setMany(input: CacheInputSetMany<Key, Output>): Promise<Ok<Output[]>> {
        return Promise.resolve({
            kind: 'Ok',
            ok: input.entries.map((entry) => {
                this.map.set(this.keyToString(entry.key), {
                    data: entry.value,
                    dateAdded: input.now,
                    ttlMs: input.ttlMs,
                });
                return entry.value;
            }),
        });
    }

    async delete(input: CacheInputDelete<Key>): Promise<Ok<Key>> {
        this.map.delete(this.keyToString(input.key));
        return Promise.resolve({ kind: 'Ok', ok: input.key });
    }

    async deleteMany(input: CacheInputDeleteMany<Key>): Promise<Ok<Key[]>> {
        return Promise.resolve({
            kind: 'Ok',
            ok: input.keys.map((key) => {
                this.map.delete(this.keyToString(key));
                return key;
            }),
        });
    }
}
