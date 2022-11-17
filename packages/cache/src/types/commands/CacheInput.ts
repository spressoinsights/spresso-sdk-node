import { SyncServerDate } from '../models';

type Parseable = string | number | Date | boolean | RegExp;
export type ParserInput<Output> = {
    [key in keyof Output]: Output[key] extends Parseable
        ? string
        : Output[key] extends [infer I]
        ? ParserInput<I>
        : ParserInput<Output[key]>;
};

export type CacheInputGet<Key extends Record<string, string>, Output> = {
    key: Key;
    evictIfBeforeDate?: SyncServerDate | undefined;
};

export type CacheInputGetMany<Key extends Record<string, string>, Output> = {
    keys: Key[];
    evictIfBeforeDate?: SyncServerDate | undefined;
};

export type CacheInputSet<Key extends Record<string, string>, Output> = {
    entry: {
        key: Key;
        value: Output;
    };
    logicalDateAdded: SyncServerDate; // Logical date the entry is being added to the cache with
    ttlMs: number;
};

export type CacheInputSetMany<Key extends Record<string, string>, Output> = {
    entries: {
        key: Key;
        value: Output;
    }[];
    logicalDateAdded: SyncServerDate; // Logical date the entry is being added to the cache with
    ttlMs: number;
};

export type CacheInputDelete<Key extends Record<string, string>> = { key: Key };
export type CacheInputDeleteMany<Key extends Record<string, string>> = { keys: Key[] };
