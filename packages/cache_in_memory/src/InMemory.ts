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
    ParserInput,
    sanitizeTtl,
    Success,
} from '@spressoinsights/cache';

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

    async get(input: CacheInputGet<Key>): Promise<Success<CacheHit<Output> | CacheMiss<Key>>> {
        const item = this.lruCache.get(inMemoryKeyToString(input.key));

        const mapInput: Required<CacheInputGet<Key>> = {
            key: input.key,
            evictIfBeforeDate: input.evictIfBeforeDate,
        };

        return Promise.resolve({ kind: 'Success', value: mapGet<Key, Output>(mapInput, item) });
    }

    async getMany(input: CacheInputGetMany<Key>): Promise<Success<(CacheHit<Output> | CacheMiss<Key>)[]>> {
        return Promise.resolve({
            kind: 'Success',
            value: input.keys.map((x) => {
                const item = this.lruCache.get(inMemoryKeyToString(x));

                const mapInput: Required<CacheInputGet<Key>> = {
                    key: x,
                    evictIfBeforeDate: input.evictIfBeforeDate,
                };

                return mapGet<Key, Output>(mapInput, item);
            }),
        });
    }

    async set(input: CacheInputSet<Key, Output>): Promise<Success<Output>> {
        this.lruCache.set(
            inMemoryKeyToString(input.entry.key),
            {
                data: input.entry.value,
                dateAdded: input.logicalDateAdded,
            },
            { ttl: sanitizeTtl(input.ttlMs, this.options.defaultTtlMs) }
        );

        return Promise.resolve({ kind: 'Success', value: input.entry.value });
    }

    async setMany(input: CacheInputSetMany<Key, Output>): Promise<Success<Output[]>> {
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
            kind: 'Success',
            value: setMany,
        });
    }

    async delete(input: CacheInputDelete<Key>): Promise<Success<Key>> {
        this.lruCache.delete(inMemoryKeyToString(input.key));
        return Promise.resolve({ kind: 'Success', value: input.key });
    }

    async deleteMany(input: CacheInputDeleteMany<Key>): Promise<Success<Key[]>> {
        return Promise.resolve({
            kind: 'Success',
            value: input.keys.map((key) => {
                this.lruCache.delete(inMemoryKeyToString(key));
                return key;
            }),
        });
    }
}
