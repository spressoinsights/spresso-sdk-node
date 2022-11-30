export function inMemoryKeyToString<Key>(key: Key): string {
    // eslint-disable-next-line functional/immutable-data
    return JSON.stringify(
        key,
        Object.keys(key).sort((a, b) => a.localeCompare(b))
    );
}
