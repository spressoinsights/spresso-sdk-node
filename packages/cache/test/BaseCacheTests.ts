/* eslint-disable mocha/no-exports */
import { CacheInputGet, CacheInputSet, CacheInputSetMany, ICacheStrategy, SyncServerDate } from '@spresso-sdk/cache';
import { expect } from 'chai';
import { expectCacheHit, expectCacheMiss, expectFatalError, expectOk } from '../../cache/test/utils/Assert';

export type TestKey = { key0: string; key1: string };
export type TestValue = { field: string };

export function baseCacheTests(genCacheFunc: () => ICacheStrategy<TestKey, TestValue>): void {
    describe('Cache - InMemory', () => {
        describe('Class - "single" operations', () => {
            it('successfully caches and gets', async () => {
                const cache = genCacheFunc();

                const testKey: TestKey = { key0: 'SomeKey0', key1: 'SomeKey1' };
                const testValue: TestValue = { field: 'SomeField' };

                const inputSet: CacheInputSet<TestKey, TestValue> = {
                    entry: {
                        key: testKey,
                        value: testValue,
                    },
                    ttlMs: 10000,
                    logicalDateAdded: new Date() as SyncServerDate,
                };
                const setResult = await cache.set(inputSet);

                // expect success
                expectOk(setResult);
                expect(JSON.stringify(setResult.ok)).to.be.eq(JSON.stringify(testValue));

                const inputGet: CacheInputGet<TestKey> = { key: { key0: 'SomeKey0', key1: 'SomeKey1' } };
                const getResult = await cache.get(inputGet);

                expectCacheHit(getResult);

                expect(JSON.stringify(getResult.ok.value)).to.be.eq(JSON.stringify(testValue));
            });

            it('successfully deletes', async () => {
                const cache = genCacheFunc();

                const testKey: TestKey = { key0: 'SomeKey0', key1: 'SomeKey1' };
                const testValue: TestValue = { field: 'SomeField' };

                const inputSet: CacheInputSet<TestKey, TestValue> = {
                    entry: {
                        key: testKey,
                        value: testValue,
                    },
                    ttlMs: 10000,
                    logicalDateAdded: new Date() as SyncServerDate,
                };

                const setResult = await cache.set(inputSet);

                expectOk(setResult);

                expect(JSON.stringify(setResult.ok)).to.be.eq(JSON.stringify(testValue));

                await cache.delete({
                    key: testKey,
                });

                const inputGet: CacheInputGet<TestKey> = { key: { key0: 'SomeKey0', key1: 'SomeKey1' } };
                const getResult = await cache.get(inputGet);

                expectCacheMiss(getResult);
            });

            it('successfully overrides', async () => {
                const cache = genCacheFunc();
                const testKey: TestKey = { key0: 'SomeKey0', key1: 'SomeKey1' };

                // Cache Set 0
                const testValue0: TestValue = { field: 'SomeField' };

                const inputSet0: CacheInputSet<TestKey, TestValue> = {
                    entry: {
                        key: testKey,
                        value: testValue0,
                    },
                    ttlMs: 10000,
                    logicalDateAdded: new Date() as SyncServerDate,
                };
                const setResult0 = await cache.set(inputSet0);

                expectOk(setResult0);
                expect(JSON.stringify(setResult0.ok)).to.be.eq(JSON.stringify(testValue0));

                // Cache Set 1
                const testValue1: TestValue = { field: 'New Field' };
                const inputSet1: CacheInputSet<TestKey, TestValue> = {
                    entry: {
                        key: testKey,
                        value: testValue1,
                    },
                    ttlMs: 10000,
                    logicalDateAdded: new Date() as SyncServerDate,
                };

                const setResult1 = await cache.set(inputSet1);
                expectOk(setResult1);
                expect(JSON.stringify(setResult1.ok)).to.be.eq(JSON.stringify(testValue1));

                const inputGet: CacheInputGet<TestKey> = { key: { key0: 'SomeKey0', key1: 'SomeKey1' } };
                const getResult = await cache.get(inputGet);

                expectCacheHit(getResult);

                expect(JSON.stringify(getResult.ok.value)).to.be.eq(JSON.stringify(testValue1));
            });

            it('respects ttl', async () => {
                const cache = genCacheFunc();
                const testKey: TestKey = { key0: 'SomeKey0', key1: 'SomeKey1' };

                // Cache Set 0
                const testValue0: TestValue = { field: 'SomeField' };

                const inputSet0: CacheInputSet<TestKey, TestValue> = {
                    entry: {
                        key: testKey,
                        value: testValue0,
                    },
                    ttlMs: 1, // Note: force ttl
                    logicalDateAdded: new Date() as SyncServerDate,
                };

                const result = await cache.set(inputSet0);
                expectOk(result);

                await new Promise((resolve) => setTimeout(resolve, 10));

                const getResult = await cache.get({ key: testKey });
                expectCacheMiss(getResult);
            });
        });

        describe('Class - "many" operations', () => {
            it('successfully caches and gets', async () => {
                const cache = genCacheFunc();

                const entries = [
                    {
                        key: { key0: 'A', key1: 'B' },
                        value: { field: 'SomeField' },
                    },
                    {
                        key: { key0: 'C', key1: 'D' },
                        value: { field: 'SomeField' },
                    },
                ];

                const inputSet: CacheInputSetMany<TestKey, TestValue> = {
                    entries,
                    ttlMs: 10000,
                    logicalDateAdded: new Date() as SyncServerDate,
                };

                const setResult = await cache.setMany(inputSet);
                expectOk(setResult);
                expect(JSON.stringify(setResult.ok)).to.be.eq(JSON.stringify(entries.map((x) => x.value)));

                // Get Element 0
                const inputGet0: CacheInputGet<TestKey> = { key: { key0: 'A', key1: 'B' } };
                const getResult0 = await cache.get(inputGet0);

                expectCacheHit(getResult0);

                expect(JSON.stringify(getResult0.ok.value)).to.be.eq(JSON.stringify(entries[0]?.value));

                // Get Element 1
                const inputGet1: CacheInputGet<TestKey> = { key: { key0: 'C', key1: 'D' } };
                const getResult1 = await cache.get(inputGet1);

                expectCacheHit(getResult1);
                expect(JSON.stringify(getResult1.ok.value)).to.be.eq(JSON.stringify(entries[1]?.value));
            });

            it('successfully deletes', async () => {
                const cache = genCacheFunc();

                const entries = [
                    {
                        key: { key0: 'A', key1: 'B' },
                        value: { field: 'SomeField' },
                    },
                    {
                        key: { key0: 'C', key1: 'D' },
                        value: { field: 'SomeField' },
                    },
                ];

                const inputSet: CacheInputSetMany<TestKey, TestValue> = {
                    entries,
                    ttlMs: 10000,
                    logicalDateAdded: new Date() as SyncServerDate,
                };

                const setMany = await cache.setMany(inputSet);
                expectOk(setMany);
                const deleteMany = await cache.deleteMany({ keys: entries.map((x) => x.key) });
                expectOk(deleteMany);

                // Get Element 0
                const inputGet0: CacheInputGet<TestKey> = { key: { key0: 'A', key1: 'B' } };
                const getResult0 = await cache.get(inputGet0);
                expectCacheMiss(getResult0);

                // Get Element 1
                const inputGet1: CacheInputGet<TestKey> = { key: { key0: 'C', key1: 'D' } };
                const getResult1 = await cache.get(inputGet1);
                expectCacheMiss(getResult1);
            });

            it('successfully overrides', async () => {
                const cache = genCacheFunc();

                const entries = [
                    {
                        key: { key0: 'A', key1: 'B' },
                        value: { field: 'SomeField' },
                    },
                    {
                        key: { key0: 'C', key1: 'D' },
                        value: { field: 'SomeField' },
                    },
                ];

                const inputSet: CacheInputSetMany<TestKey, TestValue> = {
                    entries,
                    ttlMs: 10000,
                    logicalDateAdded: new Date() as SyncServerDate,
                };

                const setResult = await cache.setMany(inputSet);
                expectOk(setResult);
                expect(JSON.stringify(setResult.ok)).to.be.eq(JSON.stringify(entries.map((x) => x.value)));

                // Get Element 0
                const inputGet0: CacheInputGet<TestKey> = { key: { key0: 'A', key1: 'B' } };
                const getResult0 = await cache.get(inputGet0);

                expectCacheHit(getResult0);
                expect(JSON.stringify(getResult0.ok.value)).to.be.eq(JSON.stringify(entries[0]?.value));

                // Override
                const entriesOverride = [
                    {
                        key: { key0: 'A', key1: 'B' },
                        value: { field: 'Override' },
                    },
                    {
                        key: { key0: 'C', key1: 'D' },
                        value: { field: 'Override' },
                    },
                ];

                const inputSetOverride: CacheInputSetMany<TestKey, TestValue> = {
                    entries: entriesOverride,
                    ttlMs: 10000,
                    logicalDateAdded: new Date() as SyncServerDate,
                };

                expectOk(await cache.setMany(inputSetOverride));

                const inputGetOverride: CacheInputGet<TestKey> = { key: { key0: 'A', key1: 'B' } };
                const getResultOverride = await cache.get(inputGetOverride);

                expectCacheHit(getResultOverride);
                expect(JSON.stringify(getResultOverride.ok.value)).to.be.eq(JSON.stringify(entriesOverride[0]?.value));
            });

            it('respects ttl', async () => {
                const cache = genCacheFunc();
                const testKey: TestKey = { key0: 'SomeKey0', key1: 'SomeKey1' };

                // Cache Set 0
                const testValue0: TestValue = { field: 'SomeField' };

                const inputSet: CacheInputSetMany<TestKey, TestValue> = {
                    entries: [
                        {
                            key: testKey,
                            value: testValue0,
                        },
                    ],
                    ttlMs: 1, // Note: force ttl
                    logicalDateAdded: new Date() as SyncServerDate,
                };

                expectOk(await cache.setMany(inputSet));

                await new Promise((resolve) => setTimeout(resolve, 10));

                const getResult = await cache.get({ key: testKey });
                expectCacheMiss(getResult);
            });
        });
    });
}
