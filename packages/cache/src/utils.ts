import { CacheHit, CacheInputGet, CacheMiss } from './types';
import { CacheEntry } from './types/models';

export function mapGet<Key extends Record<string, string>, Output>(
    input: CacheInputGet<Key>,
    item: CacheEntry<Output> | undefined | null
): CacheHit<Output> | CacheMiss<Key> {
    if (item == undefined || item == null) {
        return { kind: 'CacheMiss', input: input.key };
    }

    // if we cant parse then its a cache miss... This will only be applicable if we change the schema and dont force refresh redis.
    const parsedItem = item;

    if (
        parsedItem.dateAdded.getMilliseconds() + input.ttlMs >= input.now.getDate() ||
        parsedItem.dateAdded.getMilliseconds() + parsedItem.ttlMs >= input.now.getDate()
    ) {
        return { kind: 'CacheMiss', input: input.key };
    } else {
        return { kind: 'CacheHit', value: parsedItem.data };
    }
}
