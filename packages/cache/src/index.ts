import { CacheEntry, CacheInputGet } from './types';
import { CacheHit, CacheMiss } from './types/CacheOutput';

export * from './types';

export function mapGet<Key extends Record<string, string>, Output>(
    input: CacheInputGet<Key>,
    item: CacheEntry<Output> | undefined | null
): CacheHit<Output> | CacheMiss<Key> {
    if (item == undefined || item == null) {
        return { kind: 'CacheMiss', input: input.key };
    }

    // if we cant parse then its NotFound...
    //const parsedItem = item as CacheEntry<T>;
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
