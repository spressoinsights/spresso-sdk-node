import { CacheHit, CacheMiss, CacheResult, FatalError, Success } from '../../src/types';

type ExpectSuccess = <T>(response: Success<T> | FatalError) => asserts response is Success<T>;
export const expectOk: ExpectSuccess = (response) => {
    if (response.kind != 'Success') {
        throw new Error(`Expected reponse to be Success but found ${JSON.stringify(response)}.`);
    }
};

type ExpectCacheHit = <T, Key extends Record<string, string>>(
    response: CacheResult<T, Key>
) => asserts response is Success<CacheHit<T>>;
export const expectCacheHit: ExpectCacheHit = (response) => {
    if (response.kind != 'Success') {
        throw new Error(`Expected CacheResult to be Ok but found ${JSON.stringify(response)}.`);
    }
    if (response.value.kind != 'CacheHit') {
        throw new Error(`Expected CacheResult to be CacheHit but found ${JSON.stringify(response)}.`);
    }
};

type ExpectCacheMiss = <T, Key extends Record<string, string>>(
    response: CacheResult<T, Key>
) => asserts response is Success<CacheMiss<Key>>;
export const expectCacheMiss: ExpectCacheMiss = (response) => {
    if (response.kind != 'Success') {
        throw new Error(`Expected CacheResult to be Ok but found ${JSON.stringify(response)}.`);
    }
    if (response.value.kind != 'CacheMiss') {
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
