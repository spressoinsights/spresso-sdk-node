import { IAuth } from '@spresso-sdk/auth';
import { CacheMiss, ICacheStrategy } from '@spresso-sdk/cache';
import { HttpClientOrg } from '@spresso-sdk/http_client_org';
import {
    GetPriceOptimizationInput,
    GetPriceOptimizationOutput,
    GetPriceOptimizationsInput,
    GetPriceOptimizationsOutput,
} from './commands/GetPriceOptimization';
import { InMemory } from '@spresso-sdk/cache_in_memory';

type GetPriceOptimizationOutputClient = Omit<GetPriceOptimizationOutput, 'price'> & { price: number | null };
type GetPriceOptimizationsOutputClient = GetPriceOptimizationOutputClient[];
type PriceOptimizationKey = { userId: string; itemId: string };
type PriceOptimizationFeatureConfig = { ttlMs: number; userAgentBlackList: string[] };

export class PriceOptimimizationClient {
    private readonly baseUrl = 'https://public-catalog-api.us-east4.staging.spresso.com/v1';

    private readonly httpClient: HttpClientOrg;
    private readonly cache: ICacheStrategy<PriceOptimizationKey, GetPriceOptimizationOutput>;
    private readonly ttlMs = 3600000;

    private readonly configCache: InMemory<{ config: 'config' }, PriceOptimizationFeatureConfig>;

    constructor(options: {
        authenticator: IAuth;
        cachingStrategy: ICacheStrategy<PriceOptimizationKey, GetPriceOptimizationOutput>;
    }) {
        this.httpClient = new HttpClientOrg(options.authenticator);
        this.cache = options.cachingStrategy;
        this.configCache = new InMemory();
    }

    private getKeyObj(apiResponse: GetPriceOptimizationOutput): {
        key: PriceOptimizationKey;
        value: GetPriceOptimizationOutput;
    } {
        return {
            key: {
                userId: apiResponse.userId,
                itemId: apiResponse.itemId,
            },
            value: apiResponse,
        };
    }

    // rough draft here
    private async getFeatureConfig(): Promise<PriceOptimizationFeatureConfig> {
        // add ttl to feature of 15 min to ttl config...
        const configTtlMs = 900000;
        const config = await this.configCache.get({ key: { config: 'config' }, now: new Date(), ttlMs: configTtlMs });

        switch (config.kind) {
            case 'Ok':
                switch (config.ok.kind) {
                    case 'CacheHit':
                        return config.ok.value;
                    case 'CacheMiss': {
                        // this can fail so we need some defaults in the sdk itself
                        const apiResponse = await Promise.resolve({ ttlMs: 100, userAgentBlackList: [] });

                        await this.configCache.set({
                            entry: { key: { config: 'config' }, value: apiResponse },
                            now: new Date(),
                            ttlMs: configTtlMs,
                        });

                        return apiResponse;
                    }
                }
        }
    }

    public async getPriceOptimization(input: GetPriceOptimizationInput): Promise<GetPriceOptimizationOutput> {
        const config = await this.getFeatureConfig();

        // user agent check here -> return default price

        // try get from cache here
        const cachedItem = await this.cache.get({
            key: { userId: input.userId, itemId: input.itemId },
            now: new Date(),
            ttlMs: this.ttlMs, // comes from api config... defaulting for now to one hour
        });

        switch (cachedItem.kind) {
            // FatalCacheError?
            case 'FatalError': {
                const result = await this.getPriceOptimizationFromApi(input);
                await this.cache
                    .set({
                        //entry: { key: { userId: result.userId, itemId: result.itemId }, value: result },
                        entry: this.getKeyObj(result),
                        now: new Date(),
                        ttlMs: this.ttlMs,
                    })
                    .catch(); // dont error on not being able to cache ... need to add logging func as an input
                return result;
            }
            case 'Ok': {
                switch (cachedItem.ok.kind) {
                    case 'CacheHit':
                        return cachedItem.ok.value;
                    case 'CacheMiss': {
                        const result = await this.getPriceOptimizationFromApi(input);
                        await this.cache
                            .set({
                                entry: this.getKeyObj(result),
                                now: new Date(),
                                ttlMs: this.ttlMs,
                            })
                            .catch(); // dont error on not being able to cache ... need to add logging func as an input
                        return result;
                    }
                }
            }
        }
    }

    private async getPriceOptimizationFromApi(input: GetPriceOptimizationInput): Promise<GetPriceOptimizationOutput> {
        const config = await this.getFeatureConfig();

        // todo build/find query string utils with proper escaping and stuff
        const url = `${this.baseUrl}/priceOptimizations`;
        const finalUrl = `${url}?userId=${input.userId}&itemId=${input.itemId}`;

        const getPriceOptimizationOutputClient = await this.httpClient.get<{ data: GetPriceOptimizationOutputClient }>(
            finalUrl
        );

        switch (getPriceOptimizationOutputClient.kind) {
            case 'Ok':
                // Note: We will be forcing all http calls to have fallbackprice in its payload ... this code will most likley become redundant
                return {
                    ...getPriceOptimizationOutputClient.body.data,
                    price: getPriceOptimizationOutputClient.body.data.price ?? input.fallBackPrice,
                };
            case 'AuthError':
            case 'TimeoutError':
            case 'BadRequest':
            case 'Unknown':
                return {
                    ...input,
                    price: input.fallBackPrice,
                };
        }
    }

    public async getPriceOptimizations(input: GetPriceOptimizationsInput): Promise<GetPriceOptimizationsOutput> {
        // user agent check here -> return default price

        const cachedItems = await this.cache.getMany({
            keys: input.pricingRequests.map((x) => ({ userId: x.userId, itemId: x.itemId })),
            now: new Date(),
            ttlMs: 3600000,
        });

        switch (cachedItems.kind) {
            case 'FatalError':
                return this.getPriceOptimizationsFromApi(input);
            case 'Ok': {
                // create map so we can get the inputs that didnt exist in the cache
                const hashedInputs = input.pricingRequests.map((x) => {
                    const obj = {
                        itemId: x.itemId,
                        userId: x.userId,
                    };

                    // eslint-disable-next-line functional/immutable-data
                    const key = JSON.stringify(
                        obj,
                        Object.keys(obj).sort((a, b) => a.localeCompare(b))
                    );
                    return [key, x] as [string, GetPriceOptimizationInput];
                });

                const clientInputMap = new Map(hashedInputs);

                const cacheMissesRequests = (
                    cachedItems.ok.filter((x) => x.kind === 'CacheMiss') as CacheMiss<PriceOptimizationKey>[]
                ).map((x) => {
                    const obj = {
                        itemId: x.input.itemId,
                        userId: x.input.userId,
                    };
                    const key = JSON.stringify(
                        obj,
                        Object.keys(obj).sort((a, b) => a.localeCompare(b))
                    );
                    return clientInputMap.get(key) as GetPriceOptimizationInput; // this should always resolve
                });

                const apiResponses = await this.getPriceOptimizationsFromApi({
                    pricingRequests: cacheMissesRequests,
                    userAgent: input.userAgent,
                });
                // need to make this a map
                const apiResponseMapEntries = apiResponses.map((x) => {
                    const obj = {
                        itemId: x.itemId,
                        userId: x.userId,
                    };

                    const key = JSON.stringify(
                        obj,
                        Object.keys(obj).sort((a, b) => a.localeCompare(b))
                    );
                    return [key, x] as [string, GetPriceOptimizationOutput];
                });

                const apiResponseMap = new Map(apiResponseMapEntries);

                await this.cache
                    .setMany({
                        entries: apiResponses.map((x) => this.getKeyObj(x)),
                        now: new Date(),
                        ttlMs: this.ttlMs,
                    })
                    .catch();

                // Todo use getMany... time complexity is the same tho
                // we do this to preserver order
                return cachedItems.ok.map((cacheOutput) => {
                    switch (cacheOutput.kind) {
                        case 'CacheHit':
                            return cacheOutput.value;
                        case 'CacheMiss': {
                            const obj = {
                                itemId: cacheOutput.input.itemId,
                                userId: cacheOutput.input.userId,
                            };
                            const key = JSON.stringify(
                                obj,
                                Object.keys(obj).sort((a, b) => a.localeCompare(b))
                            );
                            return apiResponseMap.get(key) as GetPriceOptimizationOutput;
                        }
                    }
                });
            }
        }
    }

    private async getPriceOptimizationsFromApi(
        input: GetPriceOptimizationsInput
    ): Promise<GetPriceOptimizationsOutput> {
        const url = `${this.baseUrl}/priceOptimizations`;

        const getPriceOptimizationsOutputClient = await this.httpClient.post<{
            data: GetPriceOptimizationsOutputClient;
        }>(url, {
            pricingRefs: input.pricingRequests,
        });

        switch (getPriceOptimizationsOutputClient.kind) {
            case 'Ok': {
                // need to join on id.
                // can copy over utils from spresso catalog for this in the future
                const hashedInputs = getPriceOptimizationsOutputClient.body.data.map((x) => {
                    const obj = {
                        itemId: x.itemId,
                        userId: x.userId,
                    };

                    // eslint-disable-next-line functional/immutable-data
                    const key = JSON.stringify(
                        obj,
                        Object.keys(obj).sort((a, b) => a.localeCompare(b))
                    );
                    return [key, x] as [string, GetPriceOptimizationOutput];
                });

                const clientOutputMap = new Map(hashedInputs);

                // Note: We will be forcing all http calls to have fallbackprice in its payload ... this code will most likley become redundant
                const op = input.pricingRequests.map((input) => ({
                    ...input,
                    price:
                        clientOutputMap.get(
                            JSON.stringify({
                                itemId: input.itemId,
                                userId: input.userId,
                            })
                        )?.price ?? input.fallBackPrice,
                }));

                return op;
            }
            case 'AuthError':
            case 'TimeoutError':
            case 'BadRequest':
            case 'Unknown':
                return input.pricingRequests.map((x) => ({
                    ...x,
                    price: x.fallBackPrice,
                }));
        }
    }
}
