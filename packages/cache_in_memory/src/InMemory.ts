import {
    CacheEntry,
    CacheInputDelete,
    CacheInputDeleteMany,
    CacheInputGet,
    CacheInputGetMany,
    CacheInputSet,
    CacheInputSetMany,
    CacheMiss,
    ICacheStrategy,
    mapGet,
} from '@spresso-sdk/cache';
import { CacheHit, Ok } from '@spresso-sdk/cache/dist-types/types/CacheOutput';

// Just an example
// Should probably be a lru with some ttl checks. Dont see the memory footprint being anything we really need to worry about tho for the short term.

export class InMemory<Key extends Record<string, string>, Output> implements ICacheStrategy<Key, Output> {
    private readonly map: Map<string, CacheEntry<Output>>;

    constructor() {
        this.map = new Map<string, CacheEntry<Output>>();
    }

    // configureable ttl ...
    // we need date now...
    // the ttl should be the jobs cadence
    // when we update the cadence should we invalidate everything? simplest thing
    // If we dont then what ... we
    // We save the actual time the record made it into the cache
    // let computed ttl take effect
    // always check if ttl of current + now time is correct, if not then evict

    // If the systems time is off what happens?
    // Should everything be relative?

    // how to force refresh?
    // client needs to ttl config every 30 min or something
    // have a date time that says force refresh at specific time.

    // 3 options
    // ttl forward in time -> eviction will happen naturally
    // ttl backwards in time -> eviction will happen sooner
    // ttl the same -> eviction will happen naturally

    // Dont need to worry about threadsaftey

    // Add a function to make spresso aware strings so it works in redis
    private keyToString<Key>(key: Key): string {
        // eslint-disable-next-line functional/immutable-data
        return JSON.stringify(
            key,
            Object.keys(key).sort((a, b) => a.localeCompare(b))
        );
    }

    //async get(key: string, now: Date = Date.now, ttlMs: number): Promise<T | NotFound> {
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
