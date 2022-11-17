export type CacheEntrySerialized = { data: string; dateAdded: Date };
export type CacheEntryDeserialized<T> = { data: T; dateAdded: Date };

export function parseCacheEntry(entryStr: string): CacheEntrySerialized {
    const parsed = JSON.parse(entryStr) as CacheEntrySerialized & { dateAdded: string };

    return {
        data: parsed.data,
        dateAdded: new Date(parsed.dateAdded),
    };
}
