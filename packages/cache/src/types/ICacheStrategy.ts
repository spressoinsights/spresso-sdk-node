import { CacheHit, CacheMiss, FatalError, Success } from './commands/CacheOutput';
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

    get(input: CacheInputGet<Key>): Promise<Success<CacheHit<Output> | CacheMiss<Key>> | FatalError>;
    getMany(input: CacheInputGetMany<Key>): Promise<Success<(CacheHit<Output> | CacheMiss<Key>)[]> | FatalError>;

    set(input: CacheInputSet<Key, Output>): Promise<Success<Output> | FatalError>;
    setMany(input: CacheInputSetMany<Key, Output>): Promise<Success<Output[]> | FatalError>;

    delete(key: CacheInputDelete<Key>): Promise<Success<Key> | FatalError>;
    deleteMany(key: CacheInputDeleteMany<Key>): Promise<Success<Key[]> | FatalError>;
}
