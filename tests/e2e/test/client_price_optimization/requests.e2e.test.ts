import {
    GetPriceOptimizationInput,
    PriceOptimimizationClient as PriceOptimimizationClient_1_0,
    PriceOptimization,
    PriceOptimizationClientOptions as PriceOptimizationClientOptions_1_0,
} from '@spresso-sdk/price_optimization_1.0';
import {
    ClientSecretAuth as ClientSecretAuth_1_0,
    ClientSecretAuthOptions as ClientSecretAuthOptions_1_0,
} from '@spresso-sdk/auth_1.0';
import { InMemory } from '@spresso-sdk/cache_in_memory_1.0';
import { expect } from 'chai';
import { assertString } from '../utils';

const clientSecretEnv = process.env['CLIENTSECRET'];
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
assertString(clientSecretEnv);

async function testFunctionalityVersion1(client: PriceOptimimizationClient_1_0): Promise<void> {
    const input: GetPriceOptimizationInput = {
        deviceId: 'somedeviceid',
        userId: 'abc',
        itemId: 'SomeItemId',
        defaultPrice: 3,
        userAgent: '',
        overrideToDefaultPrice: false,
    };

    const res = await client.getPriceOptimization(input);

    const output: PriceOptimization = {
        deviceId: input.deviceId,
        itemId: input.itemId,
        isPriceOptimized: false,
        userId: input.userId,
        price: input.defaultPrice,
    };

    // just an example
    expect(output).to.include(res);
}

describe('Version 1.0', () => {
    describe('getPriceOptimization', () => {
        it('Can connect successfully', async () => {
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

            // So here is why we might want another repo for e2e. We can have these as secrets in github actions as an alternative but it will be a pain to manage for local dev. Stil worth doing tho.
            const client = new PriceOptimimizationClient_1_0(options);

            await testFunctionalityVersion1(client);
        });
    });
});
