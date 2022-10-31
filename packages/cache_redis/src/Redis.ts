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
    FatalError,
    ICacheStrategy,
    mapGet,
    Ok,
} from '@spresso-sdk/cache';
import lodash from 'lodash';
import { RedisClientType } from 'redis';

export class RedisCache<Key extends Record<string, string>, Output> implements ICacheStrategy<Key, Output> {
    // satodo make this an interface so we can ducktype... we dont need to have a handle on an actual redis instance

    constructor(private readonly redisClient: RedisClientType<any, any>) {}

    private keyToString<Key>(key: Key): string {
        // eslint-disable-next-line functional/immutable-data
        const redisKey = Object.entries(key)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map((x) => `${x[0]}:${x[1] as string}`)
            .join('|');

        return `SpressoPriceOptimization-${redisKey}`;
    }

    private mapGetRedis(
        input: Required<CacheInputGet<Key>>,
        item: string | null | undefined
    ): CacheHit<Output> | CacheMiss<Key> {
        const parsedItem: CacheEntry<Output> | undefined =
            item == null || item == undefined ? undefined : (JSON.parse(item) as CacheEntry<Output>);

        return mapGet<Key, Output>(input, parsedItem);
    }

    async get(input: CacheInputGet<Key>): Promise<Ok<CacheHit<Output> | CacheMiss<Key>> | FatalError> {
        try {
            const item = await this.redisClient.get(this.keyToString(input.key));

            const mapInput: Required<CacheInputGet<Key>> = {
                key: input.key,
                evictIfBeforeDate: input.evictIfBeforeDate,
            };

            return { kind: 'Ok', ok: this.mapGetRedis(mapInput, item) };
        } catch (error) {
            return { kind: 'FatalError', error: error };
        }
    }

    async getMany(input: CacheInputGetMany<Key>): Promise<Ok<(CacheHit<Output> | CacheMiss<Key>)[]> | FatalError> {
        try {
            const keys = input.keys.map((x) => this.keyToString(x));
            const items = await this.redisClient.mGet(keys);

            // Note: Redis will return the list in the exact order as input.keys
            const zippedList = lodash.zip(
                items,
                input.keys.map((key) => ({ ...input, key }))
            );

            return {
                kind: 'Ok',
                ok: zippedList.map((x) => {
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

    async set(input: CacheInputSet<Key, Output>): Promise<Ok<Output> | FatalError> {
        try {
            const cacheEntryInput: CacheEntry<Output> = {
                data: input.entry.value,
                dateAdded: input.logicalDateAdded,
            };
            await this.redisClient.set(this.keyToString(input.entry.key), JSON.stringify(cacheEntryInput), {
                PX: input.ttlMs,
            });
            return { kind: 'Ok', ok: input.entry.value };
        } catch (error) {
            return { kind: 'FatalError', error };
        }
    }

    async setMany(input: CacheInputSetMany<Key, Output>): Promise<Ok<Output[]> | FatalError> {
        try {
            // Note: Multiple updates in one statement is not optimal. ie. mSet
            await Promise.all(
                input.entries.map(async (i) => {
                    const cacheEntryInput: CacheEntry<Output> = {
                        data: i.value,
                        dateAdded: input.logicalDateAdded,
                    };
                    await this.redisClient.set(this.keyToString(i.key), JSON.stringify(cacheEntryInput), {
                        PX: input.ttlMs,
                    });
                })
            );

            return { kind: 'Ok', ok: input.entries.map((x) => x.value) };
        } catch (error) {
            return { kind: 'FatalError', error };
        }
    }

    async delete(input: CacheInputDelete<Key>): Promise<Ok<Key> | FatalError> {
        try {
            await this.redisClient.del(this.keyToString(input.key));
            return { kind: 'Ok', ok: input.key };
        } catch (error) {
            return { kind: 'FatalError', error };
        }
    }

    async deleteMany(input: CacheInputDeleteMany<Key>): Promise<Ok<Key[]> | FatalError> {
        try {
            await Promise.all(input.keys.map(async (i) => this.redisClient.del(this.keyToString(i))));
            return { kind: 'Ok', ok: input.keys };
        } catch (error) {
            return { kind: 'FatalError', error };
        }
    }
}
