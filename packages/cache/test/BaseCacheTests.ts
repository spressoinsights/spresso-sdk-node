/* eslint-disable mocha/no-exports */
import { CacheInputGet, CacheInputSet, CacheInputSetMany, ICacheStrategy, SyncServerDate } from '../src/types';
import { expect } from 'chai';
import { expectCacheHit, expectCacheMiss, expectOk } from '../../cache/test/utils/Assert';
import { isBoolean, isNumber } from 'lodash';

export type TestKey = { key0: string; key1: string };
export type TestValue = {
    fieldString: string;
    fieldNumber: number;
    fieldBoolean: boolean;
    fieldDate: Date;
    fieldRegExp: RegExp;
};

export const testKey0 = { key0: 'A', key1: 'B' };
export const testValue0 = {
    fieldString: 'SomeField',
    fieldNumber: 200,
    fieldBoolean: true,
    fieldDate: new Date('2022-12-13T03:24:00Z'),
    fieldRegExp: new RegExp('hellow399\\/31'),
};

export const testKey1 = { key0: 'C', key1: 'D' };
export const testValue1 = {
    fieldString: 'SomeField',
    fieldNumber: 200,
    fieldBoolean: false,
    fieldDate: new Date('2022-12-13T03:24:00Z'),
    fieldRegExp: new RegExp('hellow399\\/31'),
};

function assertFieldTypes(value: TestValue): void {
    expect(isNumber(value.fieldNumber)).to.be.true;
    expect(isBoolean(value.fieldBoolean)).to.be.true;
    expect(value.fieldDate).to.be.instanceOf(Date);
    expect(value.fieldRegExp).to.be.instanceOf(RegExp);
}

export function baseCacheTests(genCacheFunc: () => ICacheStrategy<TestKey, TestValue>): void {
    describe('Cache', () => {
        describe('Class - "single" operations', () => {
            it('successfully caches and gets', async () => {
                const cache = genCacheFunc();

                const inputSet: CacheInputSet<TestKey, TestValue> = {
                    entry: {
                        key: testKey0,
                        value: testValue0,
                    },
                    ttlMs: 10000,
                    logicalDateAdded: new Date() as SyncServerDate,
                };
                const setResult = await cache.set(inputSet);

                // expect success
                expectOk(setResult);
                expect(JSON.stringify(setResult.ok)).to.be.eq(JSON.stringify(testValue0));

                const inputGet: CacheInputGet<TestKey, TestValue> = { key: testKey0 };
                const getResult = await cache.get(inputGet);

                expectCacheHit(getResult);

                expect(JSON.stringify(getResult.ok.value)).to.be.eq(JSON.stringify(testValue0));
                assertFieldTypes(getResult.ok.value);
            });

            it('successfully deletes', async () => {
                const cache = genCacheFunc();

                const inputSet: CacheInputSet<TestKey, TestValue> = {
                    entry: {
                        key: testKey0,
                        value: testValue0,
                    },
                    ttlMs: 10000,
                    logicalDateAdded: new Date() as SyncServerDate,
                };

                const setResult = await cache.set(inputSet);

                expectOk(setResult);
                expect(JSON.stringify(setResult.ok)).to.be.eq(JSON.stringify(testValue0));

                await cache.delete({
                    key: testKey0,
                });

                const inputGet: CacheInputGet<TestKey, TestValue> = { key: testKey0 };
                const getResult = await cache.get(inputGet);

                expectCacheMiss(getResult);
            });

            it('successfully overrides', async () => {
                const cache = genCacheFunc();

                const inputSet0: CacheInputSet<TestKey, TestValue> = {
                    entry: {
                        key: testKey0,
                        value: testValue0,
                    },
                    ttlMs: 10000,
                    logicalDateAdded: new Date() as SyncServerDate,
                };
                const setResult0 = await cache.set(inputSet0);

                expectOk(setResult0);
                expect(JSON.stringify(setResult0.ok)).to.be.eq(JSON.stringify(testValue0));

                const inputSet1: CacheInputSet<TestKey, TestValue> = {
                    entry: {
                        key: testKey0,
                        value: testValue1,
                    },
                    ttlMs: 10000,
                    logicalDateAdded: new Date() as SyncServerDate,
                };

                const setResult1 = await cache.set(inputSet1);
                expectOk(setResult1);
                expect(JSON.stringify(setResult1.ok)).to.be.eq(JSON.stringify(testValue1));

                const inputGet: CacheInputGet<TestKey, TestValue> = { key: testKey0 };
                const getResult = await cache.get(inputGet);

                expectCacheHit(getResult);

                expect(JSON.stringify(getResult.ok.value)).to.be.eq(JSON.stringify(testValue1));
                assertFieldTypes(getResult.ok.value);
            });

            it('respects ttl', async () => {
                const cache = genCacheFunc();

                const inputSet0: CacheInputSet<TestKey, TestValue> = {
                    entry: {
                        key: testKey0,
                        value: testValue0,
                    },
                    ttlMs: 1, // Note: force ttl
                    logicalDateAdded: new Date() as SyncServerDate,
                };

                const result = await cache.set(inputSet0);
                expectOk(result);

                await new Promise((resolve) => setTimeout(resolve, 10));

                const getResult = await cache.get({ key: testKey0 });
                expectCacheMiss(getResult);
            });
        });

        describe('Class - "many" operations', () => {
            it('successfully caches and gets', async () => {
                const cache = genCacheFunc();

                const entries = [
                    {
                        key: testKey0,
                        value: testValue0,
                    },
                    {
                        key: testKey1,
                        value: testValue1,
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
                const inputGet0: CacheInputGet<TestKey, TestValue> = { key: testKey0 };
                const getResult0 = await cache.get(inputGet0);

                expectCacheHit(getResult0);
                assertFieldTypes(getResult0.ok.value);
                expect(JSON.stringify(getResult0.ok.value)).to.be.eq(JSON.stringify(entries[0]?.value));

                // Get Element 1
                const inputGet1: CacheInputGet<TestKey, TestValue> = { key: testKey1 };
                const getResult1 = await cache.get(inputGet1);

                expectCacheHit(getResult1);
                expect(JSON.stringify(getResult1.ok.value)).to.be.eq(JSON.stringify(entries[1]?.value));
                assertFieldTypes(getResult1.ok.value);
            });

            it('successfully deletes', async () => {
                const cache = genCacheFunc();

                const entries = [
                    {
                        key: testKey0,
                        value: testValue0,
                    },
                    {
                        key: testKey1,
                        value: testValue1,
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
                const inputGet0: CacheInputGet<TestKey, TestValue> = { key: testKey0 };
                const getResult0 = await cache.get(inputGet0);
                expectCacheMiss(getResult0);

                // Get Element 1
                const inputGet1: CacheInputGet<TestKey, TestValue> = { key: testKey1 };
                const getResult1 = await cache.get(inputGet1);
                expectCacheMiss(getResult1);
            });

            it('successfully overrides', async () => {
                const cache = genCacheFunc();

                const entries = [
                    {
                        key: testKey0,
                        value: testValue0,
                    },
                    {
                        key: testKey1,
                        value: testValue1,
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
                const inputGet0: CacheInputGet<TestKey, TestValue> = { key: testKey0 };
                const getResult0 = await cache.get(inputGet0);

                expectCacheHit(getResult0);
                assertFieldTypes(getResult0.ok.value);
                expect(JSON.stringify(getResult0.ok.value)).to.be.eq(JSON.stringify(entries[0]?.value));

                // Override
                const entriesOverride = [
                    {
                        key: testKey0,
                        value: testValue0,
                    },
                    {
                        key: testKey1,
                        value: testValue1,
                    },
                ];

                const inputSetOverride: CacheInputSetMany<TestKey, TestValue> = {
                    entries: entriesOverride,
                    ttlMs: 10000,
                    logicalDateAdded: new Date() as SyncServerDate,
                };

                expectOk(await cache.setMany(inputSetOverride));

                const inputGetOverride: CacheInputGet<TestKey, TestValue> = { key: testKey0 };
                const getResultOverride = await cache.get(inputGetOverride);

                expectCacheHit(getResultOverride);
                expect(JSON.stringify(getResultOverride.ok.value)).to.be.eq(JSON.stringify(entriesOverride[0]?.value));
                assertFieldTypes(getResultOverride.ok.value);
            });

            it('respects ttl', async () => {
                const cache = genCacheFunc();

                const inputSet: CacheInputSetMany<TestKey, TestValue> = {
                    entries: [
                        {
                            key: testKey0,
                            value: testValue0,
                        },
                    ],
                    ttlMs: 1, // Note: force ttl
                    logicalDateAdded: new Date() as SyncServerDate,
                };

                expectOk(await cache.setMany(inputSet));

                await new Promise((resolve) => setTimeout(resolve, 10));

                const getResult = await cache.get({ key: testKey0 });
                expectCacheMiss(getResult);
            });
        });

        describe('Class - misc operations', () => {
            it('will respect force eviction time', async () => {
                const cache = genCacheFunc();

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
    });
}
