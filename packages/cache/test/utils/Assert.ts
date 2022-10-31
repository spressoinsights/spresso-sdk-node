import { CacheHit, CacheMiss, CacheResult, FatalError, Ok } from '../../src/types';

type ExpectOk = <T, Key extends Record<string, string>>(response: Ok<T> | FatalError) => asserts response is Ok<T>;
export const expectOk: ExpectOk = (response) => {
    if (response.kind != 'Ok') {
        throw new Error(`Expected reponse to be Ok but found ${JSON.stringify(response)}.`);
    }
};

type ExpectCacheHit = <T, Key extends Record<string, string>>(
    response: CacheResult<T, Key>
) => asserts response is Ok<CacheHit<T>>;
export const expectCacheHit: ExpectCacheHit = (response) => {
    if (response.kind != 'Ok') {
        throw new Error(`Expected CacheResult to be Ok but found ${JSON.stringify(response)}.`);
    }
    if (response.ok.kind != 'CacheHit') {
        throw new Error(`Expected CacheResult to be CacheHit but found ${JSON.stringify(response)}.`);
    }
};

type ExpectCacheMiss = <T, Key extends Record<string, string>>(
    response: CacheResult<T, Key>
) => asserts response is Ok<CacheMiss<Key>>;
export const expectCacheMiss: ExpectCacheMiss = (response) => {
    if (response.kind != 'Ok') {
        throw new Error(`Expected CacheResult to be Ok but found ${JSON.stringify(response)}.`);
    }
    if (response.ok.kind != 'CacheMiss') {
        throw new Error(`Expected CacheResult to be CacheMiss but found ${JSON.stringify(response)}.`);
    }
};

type ExpectFatalError = <T, Key extends Record<string, string>>(
    response: CacheResult<T, Key>
) => asserts response is FatalError;
export const expectFatalError: ExpectFatalError = (response) => {
    if (response.kind != 'FatalError') {
        throw new Error(`Expected CacheResult to be FatalError but found ${JSON.stringify(response)}.`);
    }
};
