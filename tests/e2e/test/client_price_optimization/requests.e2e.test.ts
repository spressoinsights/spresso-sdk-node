import {
    PriceOptimimizationClient as PriceOptimimizationClient_1_0,
    PriceOptimizationClientOptions as PriceOptimizationClientOptions_1_0,
} from '@spresso-sdk/price_optimization_1.0';
import {
    ClientSecretAuth as ClientSecretAuth_1_0,
    ClientSecretAuthOptions as ClientSecretAuthOptions_1_0,
} from '@spresso-sdk/auth_1.0';
import { InMemory } from '@spresso-sdk/cache_in_memory_1.0';
import { expect } from 'chai';

async function testFunctionalityVersion1(client: PriceOptimimizationClient_1_0): Promise<void> {
    const input = { userId: 'abc', itemId: 'SomeItemId', fallBackPrice: 3 };

    const res = await client.getPriceOptimization({ ...input, userAgent: '' });

    // just an example
    expect({ ...input, price: input.fallBackPrice }).to.include(res);
}

describe('Version 1.0', () => {
    describe('getPriceOptimization', () => {
        it('Can connect successfully', async () => {
            const options = new PriceOptimizationClientOptions_1_0({
                authenticator: new ClientSecretAuth_1_0(
                    new ClientSecretAuthOptions_1_0({
                        url: 'https://dev-369tg5rm.us.auth0.com/oauth/token/',
                        clientId: 'foKGFuInp9llIfVIXWoa5M6fJvFZmM4E',
                        clientSecret: '7ugRF2iE7wDpJ5-IZkybHXZ2E5XRuket91HhBc-94F2MuXF6rUsL8Sl09WOdZF5I',
                    })
                ),
                cachingStrategy: new InMemory(),
            });

            // So here is why we might want another repo for e2e. We can have these as secrets in github actions as an alternative but it will be a pain to manage for local dev. Stil worth doing tho.
            const client = new PriceOptimimizationClient_1_0(options);

            await testFunctionalityVersion1(client);
        });
    });
});
