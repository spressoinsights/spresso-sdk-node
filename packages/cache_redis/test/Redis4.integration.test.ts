import { CacheInputGet, CacheInputSet, CacheInputSetMany, ICacheStrategy, SyncServerDate } from '@spresso-sdk/cache';
import { expect } from 'chai';
import { expectCacheHit, expectCacheMiss, expectFatalError } from '../../cache/test/utils/Assert';
import { baseCacheTests, TestKey, TestValue } from '../../cache/test/BaseCacheTests';

describe('Cache - Redis 4', () => {
    // // eslint-disable-next-line mocha/no-setup-in-base
    //CacheTests(() => new <TestKey, TestValue>({ maxElementCount: 100, defaultTtlMs: 10000 }));

    describe('Class', () => {
        it('will evict on size', () => {
            console.log();
        });

        // it('will respect force eviction time', async () => {

        // });
    });

    // describe('Func - redisKeyToString', () => {
    //     it('correctly converts', () => {

    //     });
    // });
});
