import {
    CacheEntryDeserialized,
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
    ParserInput,
    sanitizeTtl,
} from '@spresso-sdk/cache';

import LRUCache from 'lru-cache';
import { inMemoryKeyToString } from './InMemoryUtils';

export class InMemory<Key extends Record<string, string>, Output> implements ICacheStrategy<Key, Output> {
    private readonly lruCache: LRUCache<string, CacheEntryDeserialized<Output>>;

    private serializer: (serializerInput: Output) => string = JSON.stringify;
    private deserializer: (deserializerInput: ParserInput<Output>) => Output = (
        deserializerInput: ParserInput<Output>
    ) => deserializerInput as unknown as Output;

    constructor(private readonly options: { maxElementCount: number; defaultTtlMs: number }) {
        this.lruCache = new LRUCache({ max: options.maxElementCount });
    }

    // We dont serialize inmemory caches. This is mainly to adhere to the interface.
    public setSerializationScheme(
        serializer: (serializerInput: Output) => string,
        deserializer: (deserializerInput: ParserInput<Output>) => Output
    ): void {
        // eslint-disable-next-line functional/immutable-data
        this.deserializer = deserializer;
        // eslint-disable-next-line functional/immutable-data
        this.serializer = serializer;
    }

    async get(input: CacheInputGet<Key, Output>): Promise<Ok<CacheHit<Output> | CacheMiss<Key>>> {
        const item = this.lruCache.get(inMemoryKeyToString(input.key));

        const mapInput: Required<CacheInputGet<Key, Output>> = {
            key: input.key,
            evictIfBeforeDate: input.evictIfBeforeDate,
        };

        return Promise.resolve({ kind: 'Ok', ok: mapGet<Key, Output>(mapInput, item) });
    }

    async getMany(input: CacheInputGetMany<Key, Output>): Promise<Ok<(CacheHit<Output> | CacheMiss<Key>)[]>> {
        return Promise.resolve({
            kind: 'Ok',
            ok: input.keys.map((x) => {
                const item = this.lruCache.get(inMemoryKeyToString(x));

                const mapInput: Required<CacheInputGet<Key, Output>> = {
                    key: x,
                    evictIfBeforeDate: input.evictIfBeforeDate,
                };

                return mapGet<Key, Output>(mapInput, item);
            }),
        });
    }

    async set(input: CacheInputSet<Key, Output>): Promise<Ok<Output>> {
        this.lruCache.set(
            inMemoryKeyToString(input.entry.key),
            {
                data: input.entry.value,
                dateAdded: input.logicalDateAdded,
            },
            { ttl: sanitizeTtl(input.ttlMs, this.options.defaultTtlMs) }
        );

        return Promise.resolve({ kind: 'Ok', ok: input.entry.value });
    }

    async setMany(input: CacheInputSetMany<Key, Output>): Promise<Ok<Output[]>> {
        const setMany = input.entries.map((entry) => {
            // side effect in map
            this.lruCache.set(
                inMemoryKeyToString(entry.key),
                {
                    data: entry.value,
                    dateAdded: input.logicalDateAdded,
                },
                { ttl: sanitizeTtl(input.ttlMs, this.options.defaultTtlMs) }
            );

            return entry.value;
        });

        return Promise.resolve({
            kind: 'Ok',
            ok: setMany,
        });
    }

    async delete(input: CacheInputDelete<Key>): Promise<Ok<Key>> {
        this.lruCache.delete(inMemoryKeyToString(input.key));
        return Promise.resolve({ kind: 'Ok', ok: input.key });
    }

    async deleteMany(input: CacheInputDeleteMany<Key>): Promise<Ok<Key[]>> {
        return Promise.resolve({
            kind: 'Ok',
            ok: input.keys.map((key) => {
                this.lruCache.delete(inMemoryKeyToString(key));
                return key;
            }),
        });
    }
}
