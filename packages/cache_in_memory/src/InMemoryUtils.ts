export function inMemoryKeyToString<Key>(key: Key): string {
    // eslint-disable-next-line functional/immutable-data
    return JSON.stringify(
        key,
        Object.keys(key).sort((a, b) => a.localeCompare(b))
    );
}

// ttl cant be zero - zero signifies that it cant expire
export function sanitizeTtl(ttl: number, defaultTtl: number): number {
    return ttl <= 0 ? defaultTtl : ttl;
}
