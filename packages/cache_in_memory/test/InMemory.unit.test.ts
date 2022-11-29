import { CacheInputSetMany, SyncServerDate } from '@spresso-sdk/cache';
import { expect } from 'chai';
import { InMemory } from './../src/InMemory';
import { expectCacheHit, expectCacheMiss } from '../../cache/test/utils/Assert';
import { inMemoryKeyToString } from '../src/InMemoryUtils';
import {
    baseCacheTests,
    TestKey,
    testKey0,
    testKey1,
    TestValue,
    testValue0,
    testValue1,
} from '../../cache/test/BaseCacheTests';

describe('Cache - InMemory', () => {
    // eslint-disable-next-line mocha/no-setup-in-describe
    baseCacheTests(() => new InMemory<TestKey, TestValue>({ maxElementCount: 100, defaultTtlMs: 10000 }));

    describe('Class', () => {
        it('will evict on size', async () => {
            // Note: only one element is allowed in the cache
            const cache = new InMemory<TestKey, TestValue>({ maxElementCount: 1, defaultTtlMs: 10000 });

            const inputSet: CacheInputSetMany<TestKey, TestValue> = {
                entries: [
                    {
                        key: testKey0,
                        value: testValue0,
                    },
                    {
                        key: testKey1,
                        value: testValue1,
                    },
                ],
                ttlMs: 0,
                logicalDateAdded: new Date() as SyncServerDate,
            };

            await cache.setMany(inputSet);

            await new Promise((resolve) => setTimeout(resolve, 10));

            const getResult0 = await cache.get({ key: testKey0 });
            expectCacheMiss(getResult0);

            const getResult1 = await cache.get({ key: testKey1 });
            expectCacheHit(getResult1);
            expect(getResult1.value.cachedValue).to.be.eq(inputSet.entries[1]?.value);
        });
    });

    describe('Func - inMemoryKeyToString', () => {
        it('correctly converts', () => {
            // Will order keys
            const keyString = inMemoryKeyToString({ keyB: 'B', keyA: 'A' });
            expect(keyString).to.be.eq('{"keyA":"A","keyB":"B"}');
        });
    });
});
