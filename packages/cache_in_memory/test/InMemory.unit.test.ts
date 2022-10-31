import { CacheInputGet, CacheInputSet, CacheInputSetMany, ICacheStrategy, SyncServerDate } from '@spresso-sdk/cache';
import { expect } from 'chai';
import { InMemory } from './../src/InMemory';
import { expectCacheHit, expectCacheMiss, expectFatalError } from '../../cache/test/utils/Assert';
import { inMemoryKeyToString } from '../src/InMemoryUtils';
import { baseCacheTests, TestKey, TestValue } from '../../cache/test/BaseCacheTests';

describe('Cache - InMemory', () => {
    // eslint-disable-next-line mocha/no-setup-in-describe
    baseCacheTests(() => new InMemory<TestKey, TestValue>({ maxElementCount: 100, defaultTtlMs: 10000 }));

    describe('Class', () => {
        it('will evict on size', async () => {
            // Note: only one element is allowed in the cache
            const cache = new InMemory<TestKey, TestValue>({ maxElementCount: 1, defaultTtlMs: 10000 });

            // Cache Set 0
            const testKey0: TestKey = { key0: 'SomeKey0', key1: 'SomeKey1' };
            const testValue0: TestValue = { field: 'SomeField' };

            // Cache Set 1
            const testKey1: TestKey = { key0: 'SomeKey1', key1: 'SomeKey1' };
            const testValue1: TestValue = { field: 'SomeField1' };

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
            expect(getResult1.ok.value).to.be.eq(inputSet.entries[1]?.value);
        });

        it('will respect force eviction time', async () => {
            const cache = new InMemory<TestKey, TestValue>({ maxElementCount: 100, defaultTtlMs: 10000 });

            // Cache Set 0
            const testKey0: TestKey = { key0: 'SomeKey0', key1: 'SomeKey1' };
            const testValue0: TestValue = { field: 'SomeField' };

            const inputSet: CacheInputSetMany<TestKey, TestValue> = {
                entries: [
                    {
                        key: testKey0,
                        value: testValue0,
                    },
                ],
                ttlMs: 10000,
                logicalDateAdded: new Date('2022-12-17T03:24:00Z') as SyncServerDate,
            };

            await cache.setMany(inputSet);

            const getResult0 = await cache.get({
                key: testKey0,
                // Note: we have it equal to since some of the entries will have a logical date of exactly when the last job ran
                evictIfBeforeDate: new Date('2022-12-17T03:24:00Z') as SyncServerDate,
            });

            expectCacheMiss(getResult0);
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
