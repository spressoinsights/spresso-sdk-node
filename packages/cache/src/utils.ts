import { CacheHit, CacheInputGet, CacheMiss } from './types';
import { CacheEntryDeserialized } from './types/models';

export function mapGet<Key extends Record<string, string>, Output>(
    input: Required<CacheInputGet<Key>>,
    item: CacheEntryDeserialized<Output> | undefined | null
): CacheHit<Output> | CacheMiss<Key> {
    if (item == undefined || item == null) {
        return { kind: 'CacheMiss', input: input.key };
    }

    // Note: if we cant parse then its a cache miss... This will only be applicable if we change the schema and dont force refresh redis.
    const parsedItem = item;

    if (input.evictIfBeforeDate != undefined && parsedItem.dateAdded <= input.evictIfBeforeDate) {
        return { kind: 'CacheMiss', input: input.key };
    } else {
        return { kind: 'CacheHit', cachedValue: parsedItem.data };
    }
}

// ttl cant be zero - zero signifies that it cant expire which we dont want
export function sanitizeTtl(ttl: number, defaultTtl: number): number {
    return ttl <= 0 ? defaultTtl : ttl;
}

export function defaultSerialization<T>(item: T): string {
    return JSON.stringify(item, (k, v) => {
        if (v instanceof RegExp) {
            return v.toString();
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return v;
        }
    });
}
