export function redisKeyToString<Key>(key: Key): string {
    // eslint-disable-next-line functional/immutable-data
    const redisKey = Object.entries(key)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map((x) => `${x[0]}:${x[1] as string}`)
        .join('|');

    return `SpressoPriceOptimization-${redisKey}`;
}
