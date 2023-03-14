import {
    ClientSecretAuth as ClientSecretAuth_Initial_Dev,
    ClientSecretAuthOptions as ClientSecretAuthOptions_Initial_Dev,
} from '@spressoinsights/auth_initial_dev';
import { InMemory } from '@spressoinsights/cache_in_memory_initial_dev';
import {
    GetPriceOptimizationInput,
    GetPriceOptimizationsInput,
    PriceOptimimizationClient as PriceOptimimizationClient_Initial_Dev,
    PriceOptimization,
    PriceOptimizationClientOptions as PriceOptimizationClientOptions_Initial_Dev,
} from '@spressoinsights/price_optimization_initial_dev';
import { expect } from 'chai';
import { pino } from 'pino';
import { assertString } from '../utils';

const clientSecretEnv = process.env['CLIENTSECRET'];
assertString(clientSecretEnv);

async function testGetPriceOptimization(client: PriceOptimimizationClient_Initial_Dev): Promise<void> {
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
        price: 25,
    };

    expect(output).to.include(res);
}

async function testGetPriceOptimizations(client: PriceOptimimizationClient_Initial_Dev): Promise<void> {
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
            price: 25,
        },
    ];

    expect(output).to.deep.equal(res);
}

describe('Version Initial_Dev', () => {
    it('Can successfully getPriceOptimization', async () => {
        const options = new PriceOptimizationClientOptions_Initial_Dev({
            authenticator: new ClientSecretAuth_Initial_Dev(
                new ClientSecretAuthOptions_Initial_Dev({
                    baseUrl: 'https://api.staging.spresso.com',
                    clientId: 'BKW7vdWHkSplXj6VshA7iEB8iiH6lNSI',
                    clientSecret: clientSecretEnv,
                })
            ),
            baseUrl: 'https://public-catalog-api.us-east4.staging.spresso.com',
            cachingStrategy: new InMemory({ maxElementCount: 100, defaultTtlMs: 100000 }),
            logger: pino(
                { level: 'debug' },
                pino.destination({
                    sync: true,
                })
            ),
        });

        const client = new PriceOptimimizationClient_Initial_Dev(options);

        await testGetPriceOptimization(client);
        // to make sure caching works
        await testGetPriceOptimization(client);
    });

    it('Can successfully getPriceOptimizations', async () => {
        const options = new PriceOptimizationClientOptions_Initial_Dev({
            authenticator: new ClientSecretAuth_Initial_Dev(
                new ClientSecretAuthOptions_Initial_Dev({
                    baseUrl: 'https://api.staging.spresso.com',
                    clientId: 'BKW7vdWHkSplXj6VshA7iEB8iiH6lNSI',
                    clientSecret: clientSecretEnv,
                })
            ),
            baseUrl: 'https://public-catalog-api.us-east4.staging.spresso.com',
            cachingStrategy: new InMemory({ maxElementCount: 100, defaultTtlMs: 100000 }),
            logger: pino(
                { level: 'debug' },
                pino.destination({
                    sync: true,
                })
            ),
        });

        const client = new PriceOptimimizationClient_Initial_Dev(options);

        await testGetPriceOptimizations(client);
        // to make sure caching works
        await testGetPriceOptimizations(client);
    });
});
