import {
    GetPriceOptimizationInput,
    GetPriceOptimizationsInput,
    PriceOptimimizationClient,
    PriceOptimization,
    PriceOptimizationClientOptions,
} from '../src';
import { ClientSecretAuth, ClientSecretAuthOptions } from '../../../packages/auth';
import { InMemory } from '../../../packages/cache_in_memory';
import { expect } from 'chai';
import { assertString } from '../../../tests/e2e/test/utils';

const clientSecretEnv = process.env['CLIENTSECRET'];
assertString(clientSecretEnv);

async function testGetPriceOptimization(client: PriceOptimimizationClient): Promise<void> {
    const input: GetPriceOptimizationInput = {
        deviceId: 'somedeviceid',
        userId: 'SomeUserId',
        itemId: '000001',
        defaultPrice: 11,
        userAgent: '',
        overrideToDefaultPrice: false,
    };

    const res = await client.getPriceOptimization(input);

    const output: PriceOptimization = {
        deviceId: input.deviceId,
        itemId: input.itemId,
        isPriceOptimized: true,
        userId: input.userId,
        price: 5,
    };

    expect(output).to.include(res);
}

async function testGetPriceOptimizations(client: PriceOptimimizationClient): Promise<void> {
    const input: GetPriceOptimizationsInput = {
        userAgent: '',
        items: [
            {
                deviceId: 'somedeviceid',
                userId: 'SomeUserId',
                itemId: '000001',
                defaultPrice: 11,
                overrideToDefaultPrice: false,
            },
        ],
    };

    const res = await client.getPriceOptimizations(input);

    const output: PriceOptimization[] = [
        {
            deviceId: input.items[0]?.deviceId as string,
            itemId: input.items[0]?.itemId as string,
            isPriceOptimized: true,
            userId: input.items[0]?.userId as string,
            price: 5,
        },
    ];

    expect(output).to.deep.equal(res);
}

describe('Client', () => {
    it('Can successfully getPriceOptimization', async () => {
        const options = new PriceOptimizationClientOptions({
            authenticator: new ClientSecretAuth(
                new ClientSecretAuthOptions({
                    baseUrl: 'https://dev-369tg5rm.us.auth0.com',
                    clientId: 'BKW7vdWHkSplXj6VshA7iEB8iiH6lNSI',
                    clientSecret: clientSecretEnv,
                })
            ),
            baseUrl: 'https://public-catalog-api.us-east4.staging.spresso.com',
            cachingStrategy: new InMemory({ maxElementCount: 100, defaultTtlMs: 100000 }),
            logger: console,
        });

        const client = new PriceOptimimizationClient(options);

        await testGetPriceOptimization(client);
        // to make sure caching works
        await testGetPriceOptimization(client);
    });

    it('Can successfully getPriceOptimizations', async () => {
        const options = new PriceOptimizationClientOptions({
            authenticator: new ClientSecretAuth(
                new ClientSecretAuthOptions({
                    baseUrl: 'https://dev-369tg5rm.us.auth0.com',
                    clientId: 'BKW7vdWHkSplXj6VshA7iEB8iiH6lNSI',
                    clientSecret: clientSecretEnv,
                })
            ),
            baseUrl: 'https://public-catalog-api.us-east4.staging.spresso.com',
            cachingStrategy: new InMemory({ maxElementCount: 100, defaultTtlMs: 100000 }),
            logger: console,
        });

        const client = new PriceOptimimizationClient(options);

        await testGetPriceOptimizations(client);
        // to make sure caching works
        await testGetPriceOptimizations(client);
    });
});
