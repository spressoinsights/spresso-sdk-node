// eslint-disable-next-line @typescript-eslint/naming-convention
export function JSONStringifyOrderedKeys(obj: Record<string, unknown>): string {
    return JSON.stringify(
        obj,
        // eslint-disable-next-line functional/immutable-data
        Object.keys(obj).sort((a, b) => a.localeCompare(b))
    );
}
