/* eslint-disable functional/immutable-data */
import {
    CacheEntryDeserialized,
    CacheEntrySerialized,
    CacheHit,
    CacheInputDelete,
    CacheInputDeleteMany,
    CacheInputGet,
    CacheInputGetMany,
    CacheInputSet,
    CacheInputSetMany,
    CacheMiss,
    FatalError,
    ICacheStrategy,
    mapGet,
    parseCacheEntry,
    ParserInput,
    Success,
} from '@spresso-sdk/cache';
import lodash from 'lodash';
import { redisKeyToString } from './RedisUtils';
import { RedisClient } from './types';

export class RedisCache<Key extends Record<string, string>, Output> implements ICacheStrategy<Key, Output> {
    private serializer: (serializerInput: Output) => string = JSON.stringify;

    private deserializer: (deserializerInput: ParserInput<Output>) => Output = (
        deserializerInput: ParserInput<Output>
    ) => deserializerInput as unknown as Output;

    constructor(private readonly redisClient: RedisClient) {}

    public setSerializationScheme(
        serializer: (serializerInput: Output) => string,
        deserializer: (deserializerInput: ParserInput<Output>) => Output
    ): void {
        this.deserializer = deserializer;
        this.serializer = serializer;
    }

    private mapGetRedis(
        input: Required<CacheInputGet<Key>>,
        item: string | null | undefined
    ): CacheHit<Output> | CacheMiss<Key> {
        const itemString: string | undefined = item == null || item == undefined ? undefined : item;

        if (itemString == undefined) {
            return { kind: 'CacheMiss', input: input.key };
        }

        try {
            const parsedEntry = parseCacheEntry(itemString);

            const parsedItem: CacheEntryDeserialized<Output> = {
                data: this.deserializer(JSON.parse(parsedEntry.data) as ParserInput<Output>),
                dateAdded: parsedEntry.dateAdded,
            };

            return mapGet<Key, Output>(input, parsedItem);
        } catch (err) {
            return { kind: 'CacheMiss', input: input.key };
        }
    }

    // output parser input. can type check it as well.
    async get(input: CacheInputGet<Key>): Promise<Success<CacheHit<Output> | CacheMiss<Key>> | FatalError> {
        try {
            const item = await this.redisClient.get(redisKeyToString(input.key));

            const mapInput: Required<CacheInputGet<Key>> = {
                key: input.key,
                evictIfBeforeDate: input.evictIfBeforeDate,
            };

            return { kind: 'Success', value: this.mapGetRedis(mapInput, item) };
        } catch (error) {
            return { kind: 'FatalError', error: error };
        }
    }

    async getMany(input: CacheInputGetMany<Key>): Promise<Success<(CacheHit<Output> | CacheMiss<Key>)[]> | FatalError> {
        try {
            const keys = input.keys.map((x) => redisKeyToString(x));
            const items = await this.redisClient.mGet(keys);

            // Note: Redis will return the list in the exact order as input.keys
            const zippedList = lodash.zip(
                items,
                input.keys.map((key) => ({ ...input, key }))
            );

            return {
                kind: 'Success',
                value: zippedList.map((x) => {
                    const cacheInput = x[1] as CacheInputGet<Key>;
                    const mapInput: Required<CacheInputGet<Key>> = {
                        key: cacheInput.key,
                        evictIfBeforeDate: cacheInput.evictIfBeforeDate,
                    };

                    return this.mapGetRedis(mapInput, x[0]);
                }),
            };
        } catch (error) {
            return { kind: 'FatalError', error };
        }
    }

    async set(input: CacheInputSet<Key, Output>): Promise<Success<Output> | FatalError> {
        try {
            const cacheEntryInput: CacheEntrySerialized = {
                data: this.serializer(input.entry.value),
                dateAdded: input.logicalDateAdded,
            };

            await this.redisClient.set(redisKeyToString(input.entry.key), JSON.stringify(cacheEntryInput), {
                PX: input.ttlMs,
            });
            return { kind: 'Success', value: input.entry.value };
        } catch (error) {
            return { kind: 'FatalError', error };
        }
    }

    async setMany(input: CacheInputSetMany<Key, Output>): Promise<Success<Output[]> | FatalError> {
        try {
            // Note: Multiple updates in one statement is not optimal. ie. mSet
            await Promise.all(
                input.entries.map(async (i) => {
                    const cacheEntryInput: CacheEntrySerialized = {
                        data: this.serializer(i.value),
                        dateAdded: input.logicalDateAdded,
                    };
                    await this.redisClient.set(redisKeyToString(i.key), JSON.stringify(cacheEntryInput), {
                        PX: input.ttlMs,
                    });
                })
            );

            return { kind: 'Success', value: input.entries.map((x) => x.value) };
        } catch (error) {
            return { kind: 'FatalError', error };
        }
    }

    async delete(input: CacheInputDelete<Key>): Promise<Success<Key> | FatalError> {
        try {
            await this.redisClient.del(redisKeyToString(input.key));
            return { kind: 'Success', value: input.key };
        } catch (error) {
            return { kind: 'FatalError', error };
        }
    }

    async deleteMany(input: CacheInputDeleteMany<Key>): Promise<Success<Key[]> | FatalError> {
        try {
            await Promise.all(input.keys.map(async (i) => this.redisClient.del(redisKeyToString(i))));
            return { kind: 'Success', value: input.keys };
        } catch (error) {
            return { kind: 'FatalError', error };
        }
    }
}
