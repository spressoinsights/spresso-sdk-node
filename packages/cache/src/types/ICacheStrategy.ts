import { CacheHit, CacheMiss, FatalError, Ok } from './commands/CacheOutput';
import {
    CacheInputDelete,
    CacheInputDeleteMany,
    CacheInputGet,
    CacheInputGetMany,
    CacheInputSet,
    CacheInputSetMany,
    ParserInput,
} from './commands/CacheInput';

export interface ICacheStrategy<Key extends Record<string, string>, Output> {
    setSerializationScheme(
        serializer: (serializerInput: Output) => string,
        deserializer: (input: ParserInput<Output>) => Output
    ): void;

    get(input: CacheInputGet<Key, Output>): Promise<Ok<CacheHit<Output> | CacheMiss<Key>> | FatalError>;
    getMany(input: CacheInputGetMany<Key, Output>): Promise<Ok<(CacheHit<Output> | CacheMiss<Key>)[]> | FatalError>;

    set(input: CacheInputSet<Key, Output>): Promise<Ok<Output> | FatalError>;
    setMany(input: CacheInputSetMany<Key, Output>): Promise<Ok<Output[]> | FatalError>;

    delete(key: CacheInputDelete<Key>): Promise<Ok<Key> | FatalError>;
    deleteMany(key: CacheInputDeleteMany<Key>): Promise<Ok<Key[]> | FatalError>;
}
