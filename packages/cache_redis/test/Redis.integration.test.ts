/* eslint-disable mocha/no-setup-in-describe */
import { defaultSerialization } from '@spresso-sdk/cache';
import { expect } from 'chai';
import { baseCacheTests, TestKey, TestValue } from '../../cache/test/BaseCacheTests';
import { createClient } from 'redis4';
import { RedisCache } from '../src/Redis';
import { redisKeyToString } from '../src/RedisUtils';

describe('Cache - Redis 6', () => {
    it('satisfies base functionality', async () => {
        const redisClient = createClient({ socket: { host: 'localhost', port: 9006 } });
        await redisClient.connect();

        baseCacheTests(() => {
            const redisCache = new RedisCache<TestKey, TestValue>(redisClient);
            redisCache.setSerializationScheme(defaultSerialization, (x) => ({
                fieldString: x.fieldString,
                fieldNumber: +x.fieldNumber,
                fieldBoolean: Boolean(x.fieldBoolean),
                fieldDate: new Date(x.fieldDate),
                fieldRegExp: new RegExp(x.fieldRegExp),
            }));

            return redisCache;
        });

        await redisClient.memoryPurge();
    });

    describe('Func - inMemoryKeyToString', () => {
        it('correctly converts', () => {
            const keyString = redisKeyToString({ keyB: 'B', keyA: 'A' });
            expect(keyString).to.be.eq('SpressoPriceOptimization-keyA:A|keyB:B');
        });
    });
});
