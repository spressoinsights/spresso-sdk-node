import {
    GetPriceOptimizationInput,
    GetPriceOptimizationsInput,
    PriceOptimimizationClient as PriceOptimimizationClient_1_0,
    PriceOptimization,
    PriceOptimizationClientOptions as PriceOptimizationClientOptions_1_0,
} from '@spressoinsights/price_optimization_1.0';
import {
    ClientSecretAuth as ClientSecretAuth_1_0,
    ClientSecretAuthOptions as ClientSecretAuthOptions_1_0,
} from '@spressoinsights/auth_1.0';
import { InMemory } from '@spressoinsights/cache_in_memory_1.0';
import { expect } from 'chai';
import { assertString } from '../utils';

const clientSecretEnv = process.env['CLIENTSECRET'];
assertString(clientSecretEnv);

async function testGetPriceOptimization(client: PriceOptimimizationClient_1_0): Promise<void> {
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

async function testGetPriceOptimizations(client: PriceOptimimizationClient_1_0): Promise<void> {
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

describe('Version 1.0', () => {
    it('Can successfully getPriceOptimization', async () => {
        const options = new PriceOptimizationClientOptions_1_0({
            authenticator: new ClientSecretAuth_1_0(
                new ClientSecretAuthOptions_1_0({
                    url: 'https://dev-369tg5rm.us.auth0.com/oauth/token/',
                    clientId: 'BKW7vdWHkSplXj6VshA7iEB8iiH6lNSI',
                    clientSecret: clientSecretEnv,
                })
            ),
            cachingStrategy: new InMemory({ maxElementCount: 100, defaultTtlMs: 100000 }),
        });

        const client = new PriceOptimimizationClient_1_0(options);

        await testGetPriceOptimization(client);
    });

    it('Can successfully getPriceOptimizations', async () => {
        const options = new PriceOptimizationClientOptions_1_0({
            authenticator: new ClientSecretAuth_1_0(
                new ClientSecretAuthOptions_1_0({
                    url: 'https://dev-369tg5rm.us.auth0.com/oauth/token/',
                    clientId: 'BKW7vdWHkSplXj6VshA7iEB8iiH6lNSI',
                    clientSecret: clientSecretEnv,
                })
            ),
            cachingStrategy: new InMemory({ maxElementCount: 100, defaultTtlMs: 100000 }),
        });

        const client = new PriceOptimimizationClient_1_0(options);

        await testGetPriceOptimizations(client);
    });
});
