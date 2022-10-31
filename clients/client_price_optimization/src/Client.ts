import { CacheMiss, ICacheStrategy, SpressoServerDate, SyncServerDate } from '@spresso-sdk/cache';
import { HttpClientOrg } from '@spresso-sdk/http_client_org';
import {
    GetPriceOptimizationInput,
    GetPriceOptimizationOutput,
    GetPriceOptimizationOutputClient,
    GetPriceOptimizationsInput,
    GetPriceOptimizationsOutput,
    GetPriceOptimizationsOutputClient,
} from './types/commands/GetPriceOptimization';
import { InMemory } from '@spresso-sdk/cache_in_memory';

import {
    ConsecutiveBreaker,
    ExponentialBackoff,
    retry,
    circuitBreaker,
    wrap,
    handleWhenResult,
    IMergedPolicy,
    IRetryContext,
    IDefaultPolicyContext,
    RetryPolicy,
    CircuitBreakerPolicy,
    timeout,
    TimeoutStrategy,
    TimeoutPolicy,
    ICancellationContext,
} from 'cockatiel';
import { PriceOptimizationFeatureConfig } from './types/models/PriceOptimizationFeatureConfig';
import { PriceOptimization, PriceOptimizationCacheKey, PriceOptimizationClientOptions } from './types/models';
import { HttpClientOptions } from '@spresso-sdk/http_client';

type ResiliencyPolicy = IMergedPolicy<
    ICancellationContext & IRetryContext & IDefaultPolicyContext,
    never,
    [TimeoutPolicy, RetryPolicy, CircuitBreakerPolicy]
>;

export class PriceOptimimizationClient {
    private readonly baseUrl = 'https://public-catalog-api.us-east4.staging.spresso.com/v1';

    private readonly options: PriceOptimizationClientOptions;
    private readonly httpClient: HttpClientOrg;
    private readonly cache: ICacheStrategy<PriceOptimizationCacheKey, PriceOptimization>;
    private readonly configCache: InMemory<{ config: 'config' }, PriceOptimizationFeatureConfig>;
    private readonly getPriceOptimizationResiliencyPolicy: ResiliencyPolicy;
    private readonly getPriceOptimizationsResiliencyPolicy: ResiliencyPolicy;

    constructor(options: PriceOptimizationClientOptions) {
        this.options = options;
        this.httpClient = new HttpClientOrg(options.authenticator, new HttpClientOptions());
        this.cache = options.cachingStrategy;
        this.configCache = new InMemory({ maxElementCount: 100 });

        this.getPriceOptimizationResiliencyPolicy = this.resiliencyPolicy();
        this.getPriceOptimizationsResiliencyPolicy = this.resiliencyPolicy();
    }

    private resiliencyPolicy(): ResiliencyPolicy {
        const handler = handleWhenResult((res) => {
            const typedRes = res as GetPriceOptimizationOutput;
            switch (typedRes.kind) {
                case 'Ok':
                    return false;
                case 'TimeoutError':
                case 'Unknown':
                    return true;
            }
        });

        // Create a retry policy that'll try whatever function we execute 3
        // times with a randomized exponential backoff.
        const retryFunc = retry(handler, {
            maxAttempts: this.options.resiliencyPolicy.numberOfRetries,
            backoff: new ExponentialBackoff(),
        });

        // Create a circuit breaker that'll stop calling the executed function for {circuitBreakerBreakDurationMs}
        // seconds if it fails {numberOfFailuresBeforeTrippingCircuitBreaker} times in a row.
        // This can give time for e.g. a database to recover without getting tons of traffic.
        const circuitBreakerFunc = circuitBreaker(handler, {
            halfOpenAfter: this.options.resiliencyPolicy.circuitBreakerBreakDurationMs,
            breaker: new ConsecutiveBreaker(this.options.resiliencyPolicy.numberOfFailuresBeforeTrippingCircuitBreaker),
        });

        // timeout the whole request
        //const timeoutPolicy = timeout(this.options.resiliencyPolicy.timeoutMs, TimeoutStrategy.Cooperative);
        const timeoutPolicy = timeout(this.options.resiliencyPolicy.timeoutMs, TimeoutStrategy.Aggressive);

        const resiliency = wrap(retryFunc, circuitBreakerFunc, timeoutPolicy);

        return resiliency;
    }

    private getKeyObj(apiResponse: PriceOptimization): {
        key: PriceOptimizationCacheKey;
        value: PriceOptimization;
    } {
        return {
            key: {
                userId: apiResponse.userId,
                itemId: apiResponse.itemId,
            },
            value: apiResponse,
        };
    }

    private async getServerTime(): Promise<SpressoServerDate> {
        // hits some date endpoint
        // if cant resolve then return current date of the sdk...or fail to initalize?
        return Promise.resolve(new Date() as SpressoServerDate);
    }

    private async syncServerTime(): Promise<SyncServerDate> {
        const now = new Date().valueOf();
        const serverTime = (await this.getServerTime()).valueOf(); // should be memoized

        return new Date(now + (now - serverTime)) as SyncServerDate;
    }

    // rough draft here
    private async getFeatureConfig(): Promise<PriceOptimizationFeatureConfig> {
        // add ttl to feature of 15 min to ttl config...
        const configTtlMs = 900000;
        const config = await this.configCache.get({ key: { config: 'config' } });

        switch (config.kind) {
            case 'Ok':
                switch (config.ok.kind) {
                    case 'CacheHit':
                        return config.ok.value;
                    case 'CacheMiss': {
                        // get server time as well and cache in config
                        // this can fail so we need some defaults in the sdk itself
                        const apiResponse = await Promise.resolve({
                            ttlMs: 3600000,
                            userAgentBlacklist: [],
                            userAgentBlacklistRegExp: [],
                        });

                        await this.configCache.set({
                            entry: { key: { config: 'config' }, value: apiResponse },
                            ttlMs: configTtlMs,
                            logicalDateAdded: await this.syncServerTime(),
                        });

                        return apiResponse;
                    }
                }
        }
    }

    private allowUserAgent(userAgent: string, userAgentBlacklistRegExp: RegExp[]): boolean {
        return !userAgentBlacklistRegExp.some((regex) => regex.test(userAgent));
    }

    public async getPriceOptimization(input: GetPriceOptimizationInput): Promise<PriceOptimization> {
        try {
            const res = await this.getPriceOptimizationResiliencyPolicy.execute(async () =>
                this._getPriceOptimization(input)
            );

            if (res.kind == 'TimeoutError' || res.kind == 'Unknown') {
                return {
                    userId: input.userId,
                    itemId: input.itemId,
                    price: input.fallBackPrice,
                };
            }

            return res.ok;
        } catch (err) {
            return {
                userId: input.userId,
                itemId: input.itemId,
                price: input.fallBackPrice,
            };
        }
    }

    private async _getPriceOptimization(input: GetPriceOptimizationInput): Promise<GetPriceOptimizationOutput> {
        const config = await this.getFeatureConfig();

        if (!this.allowUserAgent(input.userAgent, config.userAgentBlacklistRegExp)) {
            return {
                kind: 'Ok',
                ok: {
                    userId: input.userId,
                    itemId: input.itemId,
                    price: input.fallBackPrice,
                },
            };
        }

        const cachedItem = await this.cache.get({
            key: { userId: input.userId, itemId: input.itemId },
        });

        switch (cachedItem.kind) {
            // FatalCacheError?
            case 'FatalError': {
                const result = await this.getPriceOptimizationFromApi(input);
                if (result.kind == 'TimeoutError' || result.kind == 'Unknown') {
                    return result;
                }

                await this.cache
                    .set({
                        entry: this.getKeyObj(result.ok),
                        ttlMs: config.ttlMs,
                        logicalDateAdded: await this.syncServerTime(), //[this.spressoServerTime(), dateFromConfig the last job run date].max()
                    })
                    .catch(); // dont error on not being able to cache ... need to add logging func as an input
                return result;
            }
            case 'Ok': {
                switch (cachedItem.ok.kind) {
                    case 'CacheHit':
                        return { kind: 'Ok', ok: cachedItem.ok.value };
                    case 'CacheMiss': {
                        const result = await this.getPriceOptimizationFromApi(input);
                        if (result.kind == 'TimeoutError' || result.kind == 'Unknown') {
                            return result;
                        }

                        await this.cache
                            .set({
                                entry: this.getKeyObj(result.ok),
                                ttlMs: config.ttlMs,
                                logicalDateAdded: await this.syncServerTime(),
                            })
                            .catch(); // dont error on not being able to cache ... need to add logging func as an input
                        return result;
                    }
                }
            }
        }
    }

    private async getPriceOptimizationFromApi(input: GetPriceOptimizationInput): Promise<GetPriceOptimizationOutput> {
        // todo build/find query string utils with proper escaping and stuff
        const url = `${this.baseUrl}/priceOptimizations`;
        const finalUrl = `${url}?userId=${input.userId}&itemId=${input.itemId}`;

        const getPriceOptimizationOutputClient = await this.httpClient.get<{ data: GetPriceOptimizationOutputClient }>({
            url: finalUrl,
        });

        switch (getPriceOptimizationOutputClient.kind) {
            case 'Ok':
                // Note: We will be forcing all http calls to have fallbackprice in its payload ... this code will most likley become redundant
                return {
                    kind: 'Ok',
                    ok: {
                        ...getPriceOptimizationOutputClient.body.data,
                        price: getPriceOptimizationOutputClient.body.data.price ?? input.fallBackPrice,
                    },
                };
            case 'AuthError':
            case 'BadRequest':
                return {
                    kind: 'Ok',
                    ok: {
                        ...input,
                        price: input.fallBackPrice,
                    },
                };
            case 'TimeoutError':
            case 'Unknown':
                return getPriceOptimizationOutputClient;
        }
    }

    public async getPriceOptimizations(input: GetPriceOptimizationsInput): Promise<PriceOptimization[]> {
        try {
            const res = await this.getPriceOptimizationsResiliencyPolicy.execute(async () =>
                this._getPriceOptimizations(input)
            );

            if (res.kind == 'TimeoutError' || res.kind == 'Unknown') {
                return input.pricingRequests.map((x) => ({
                    userId: x.userId,
                    itemId: x.itemId,
                    price: x.fallBackPrice,
                }));
            }

            return res.ok;
        } catch (err) {
            return input.pricingRequests.map((x) => ({
                userId: x.userId,
                itemId: x.itemId,
                price: x.fallBackPrice,
            }));
        }
    }

    private async _getPriceOptimizations(input: GetPriceOptimizationsInput): Promise<GetPriceOptimizationsOutput> {
        const config = await this.getFeatureConfig();

        if (!this.allowUserAgent(input.userAgent, config.userAgentBlacklistRegExp)) {
            return {
                kind: 'Ok',
                ok: input.pricingRequests.map((x) => ({
                    userId: x.userId,
                    itemId: x.itemId,
                    price: x.fallBackPrice,
                })),
            };
        }

        const cachedItems = await this.cache.getMany({
            keys: input.pricingRequests.map((x) => ({ userId: x.userId, itemId: x.itemId })),
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
                    cachedItems.ok.filter((x) => x.kind === 'CacheMiss') as CacheMiss<PriceOptimizationCacheKey>[]
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

                if (apiResponses.kind == 'TimeoutError' || apiResponses.kind == 'Unknown') {
                    return apiResponses;
                }

                const apiResponseMapEntries = apiResponses.ok.map((x) => {
                    const obj = {
                        itemId: x.itemId,
                        userId: x.userId,
                    };

                    const key = JSON.stringify(
                        obj,
                        Object.keys(obj).sort((a, b) => a.localeCompare(b))
                    );
                    return [key, x] as [string, PriceOptimization];
                });

                const apiResponseMap = new Map(apiResponseMapEntries);

                await this.cache
                    .setMany({
                        entries: apiResponses.ok.map((x) => this.getKeyObj(x)),
                        logicalDateAdded: await this.syncServerTime(),
                        ttlMs: config.ttlMs,
                    })
                    .catch();

                // Note: We do this to preserve order
                return {
                    kind: 'Ok',
                    ok: cachedItems.ok.map((cacheOutput) => {
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
                                return apiResponseMap.get(key) as PriceOptimization;
                            }
                        }
                    }),
                };
            }
        }
    }

    private async getPriceOptimizationsFromApi(
        input: GetPriceOptimizationsInput
    ): Promise<GetPriceOptimizationsOutput> {
        const url = `${this.baseUrl}/priceOptimizations`;

        const getPriceOptimizationsOutputClient = await this.httpClient.post<{
            data: GetPriceOptimizationsOutputClient;
        }>({
            url,
            body: {
                pricingRefs: input.pricingRequests,
            },
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
                    return [key, x] as [string, PriceOptimization];
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

                return { kind: 'Ok', ok: op };
            }
            case 'AuthError':
            case 'BadRequest':
                return {
                    kind: 'Ok',
                    ok: input.pricingRequests.map((x) => ({
                        ...x,
                        price: x.fallBackPrice,
                    })),
                };
            case 'TimeoutError':
            case 'Unknown':
                return getPriceOptimizationsOutputClient;
        }
    }
}
