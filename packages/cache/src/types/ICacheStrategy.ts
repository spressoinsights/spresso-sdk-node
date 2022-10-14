import { CacheHit, CacheMiss, FatalError, Ok } from './CacheOutput';
import {
    CacheInputDelete,
    CacheInputDeleteMany,
    CacheInputGet,
    CacheInputGetMany,
    CacheInputSet,
    CacheInputSetMany,
} from './CacheInput';

export interface ICacheStrategy<Key extends Record<string, string>, Output> {
    get(input: CacheInputGet<Key>): Promise<Ok<CacheHit<Output> | CacheMiss<Key>> | FatalError>;
    getMany(input: CacheInputGetMany<Key>): Promise<Ok<(CacheHit<Output> | CacheMiss<Key>)[]> | FatalError>;

    set(input: CacheInputSet<Key, Output>): Promise<Ok<Output> | FatalError>;
    setMany(input: CacheInputSetMany<Key, Output>): Promise<Ok<Output[]> | FatalError>;

    delete(key: CacheInputDelete<Key>): Promise<Ok<Key> | FatalError>;
    deleteMany(key: CacheInputDeleteMany<Key>): Promise<Ok<Key[]> | FatalError>;
}
