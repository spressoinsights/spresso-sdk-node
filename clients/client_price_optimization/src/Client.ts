import {
    CacheMiss,
    defaultSerialization,
    ICacheStrategy,
    SpressoServerDate,
    SyncServerDate,
} from '@spressoinsights/cache';
import { HttpClientOrg } from '@spressoinsights/http_client_org';
import {
    GetPriceOptimizationClientOutput,
    GetPriceOptimizationClientOutputData,
    GetPriceOptimizationInput,
    GetPriceOptimizationOutput,
    GetPriceOptimizationsClientOutput,
    GetPriceOptimizationsClientOutputData,
    GetPriceOptimizationsInput,
    GetPriceOptimizationsOutput,
} from './types/commands/GetPriceOptimization';
import { InMemory } from '@spressoinsights/cache_in_memory';
import lodash from 'lodash';

import {
    ConsecutiveBreaker,
    ExponentialBackoff,
    IRetryContext,
    TimeoutStrategy,
    ICancellationContext,
    Policy,
    IPolicy,
} from 'cockatiel';
import {
    defaultUserAgentBlacklist,
    PriceOptimizationOrgConfig,
    PriceOptimizationOrgConfigInMemory,
    UserAgentBlacklistItemInMemory,
} from './types/models/PriceOptimizationOrgConfig';
import { PriceOptimization, PriceOptimizationCacheKey, PriceOptimizationClientOptions } from './types/models';
import { HttpClientOptions } from '@spressoinsights/http_client';

// V3
// type ResiliencyPolicy = IMergedPolicy<
//     ICancellationContext & IRetryContext & IDefaultPolicyContext,
//     never,
//     [TimeoutPolicy, RetryPolicy, CircuitBreakerPolicy]
// >;
// V2
type ResiliencyPolicy = IPolicy<ICancellationContext & IRetryContext, never>;

export class PriceOptimimizationClient {
    private readonly baseUrl = 'https://public-catalog-api.us-east4.staging.spresso.com/v1';

    private readonly options: PriceOptimizationClientOptions;
    private readonly httpClient: HttpClientOrg;
    private readonly cache: ICacheStrategy<PriceOptimizationCacheKey, PriceOptimization>;
    private readonly configCache: InMemory<{ config: 'config' }, PriceOptimizationOrgConfigInMemory>;
    private readonly getPriceOptimizationResiliencyPolicy: ResiliencyPolicy; // this should only wrap the api call...
    private readonly getPriceOptimizationsResiliencyPolicy: ResiliencyPolicy; // this should only wrap the api call...

    constructor(options: PriceOptimizationClientOptions) {
        this.options = options;
        this.httpClient = new HttpClientOrg(options.authenticator, new HttpClientOptions());
        this.cache = options.cachingStrategy;
        this.configCache = new InMemory({ maxElementCount: 100, defaultTtlMs: 900000 });

        this.getPriceOptimizationResiliencyPolicy = this.resiliencyPolicy();
        this.getPriceOptimizationsResiliencyPolicy = this.resiliencyPolicy();

        this.cache.setSerializationScheme(defaultSerialization, (x) => ({
            deviceId: x.deviceId,
            itemId: x.itemId,
            isPriceOptimized: Boolean(x.isPriceOptimized),
            userId: x.userId,
            price: +x.price,
        }));

        this.configCache.setSerializationScheme(defaultSerialization, (x) => ({
            userAgentBlacklist: x.userAgentBlacklist.map((x) => ({
                name: x.name,
                regexp: new RegExp(x.regexp),
            })),
        }));
    }

    private resiliencyPolicy(): ResiliencyPolicy {
        const handler = Policy.handleWhenResult((res) => {
            const typedRes = res as GetPriceOptimizationOutput;
            switch (typedRes.kind) {
                case 'Success':
                    return false;
                case 'TimeoutError':
                case 'Unknown':
                    return true;
            }
        });

        // Create a retry policy that'll try whatever function we execute 3
        // times with a randomized exponential backoff.

        // V3
        // const retryFunc = Policy.retry(handler, {
        //     maxAttempts: this.options.resiliencyPolicy.numberOfRetries,
        //     backoff: new ExponentialBackoff(),
        // });
        // V2
        const retryFunc = handler
            .retry()
            .attempts(this.options.resiliencyPolicy.numberOfRetries)
            .backoff(new ExponentialBackoff());

        // Create a circuit breaker that'll stop calling the executed function for {circuitBreakerBreakDurationMs}
        // seconds if it fails {numberOfFailuresBeforeTrippingCircuitBreaker} times in a row.
        // This can give time for e.g. a database to recover without getting tons of traffic.
        // V3
        // const circuitBreakerFunc = circuitBreaker(handler, {
        //     halfOpenAfter: this.options.resiliencyPolicy.circuitBreakerBreakDurationMs,
        //     breaker: new ConsecutiveBreaker(this.options.resiliencyPolicy.numberOfFailuresBeforeTrippingCircuitBreaker),
        // });
        // V2
        const circuitBreakerFunc = handler.circuitBreaker(
            this.options.resiliencyPolicy.circuitBreakerBreakDurationMs,
            new ConsecutiveBreaker(this.options.resiliencyPolicy.numberOfFailuresBeforeTrippingCircuitBreaker)
        );

        // timeout the whole request
        //const timeoutPolicy = timeout(this.options.resiliencyPolicy.timeoutMs, TimeoutStrategy.Aggressive);

        const timeoutPolicy = Policy.timeout(this.options.resiliencyPolicy.timeoutMs, TimeoutStrategy.Aggressive);

        const resiliency = Policy.wrap(retryFunc, circuitBreakerFunc, timeoutPolicy);

        return resiliency;
    }

    private getCacheKey(input: Omit<GetPriceOptimizationInput, 'userAgent'>): PriceOptimizationCacheKey {
        return {
            itemId: input.itemId,
            deviceId: input.deviceId,
            defaultPrice: input.defaultPrice.toString(),
            overrideToDefaultPrice: input.overrideToDefaultPrice.toString(),
        };
    }

    private getCachePayload(
        apiInput: Omit<GetPriceOptimizationInput, 'userAgent'>,
        apiResponse: PriceOptimization
    ): {
        key: PriceOptimizationCacheKey;
        value: PriceOptimization;
    } {
        return {
            key: this.getCacheKey(apiInput),
            // Note: we need to do this to shake off any values that should only exist in the api response ie. ttlms
            value: {
                deviceId: apiResponse.deviceId,
                userId: apiResponse.userId,
                itemId: apiResponse.itemId,
                price: apiResponse.price,
                isPriceOptimized: apiResponse.isPriceOptimized,
            },
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

    private async getOrgConfig(): Promise<PriceOptimizationOrgConfigInMemory> {
        // add ttl to feature of 15 min to ttl config...
        const configTtlMs = 900000;

        const config = await this.configCache.get({
            key: { config: 'config' },
        });

        switch (config.kind) {
            case 'Success':
                switch (config.value.kind) {
                    case 'CacheHit':
                        return config.value.cachedValue;
                    case 'CacheMiss': {
                        const apiResponse = await this.getOrgConfigFromApi();

                        const inMemoryRepresentation: PriceOptimizationOrgConfigInMemory = {
                            userAgentBlacklist: apiResponse.userAgentBlacklist.map((x) => ({
                                name: x.name,
                                regexp: new RegExp(x.regexp),
                            })),
                        };

                        await this.configCache.set({
                            entry: { key: { config: 'config' }, value: inMemoryRepresentation },
                            ttlMs: configTtlMs,
                            logicalDateAdded: await this.syncServerTime(),
                        });

                        return inMemoryRepresentation;
                    }
                }
        }
    }

    private async getOrgConfigFromApi(): Promise<PriceOptimizationOrgConfig> {
        const url = `${this.baseUrl}/priceOptimizationOrgConfig`;

        const getConfigOutput = await this.httpClient.get<{
            data: PriceOptimizationOrgConfig;
        }>({
            url,
        });

        switch (getConfigOutput.kind) {
            case 'Success': {
                return getConfigOutput.value.data;
            }
            // For any errors return the default object thats the same as the server
            case 'AuthError':
            case 'BadRequest':
            case 'TimeoutError':
            case 'Unknown':
                return {
                    userAgentBlacklist: defaultUserAgentBlacklist,
                };
        }
    }

    private allowUserAgent(userAgent: string, userAgentBlacklist: UserAgentBlacklistItemInMemory[]): boolean {
        return !userAgentBlacklist.some((item) => item.regexp.test(userAgent));
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
                    price: input.defaultPrice,
                    deviceId: input.deviceId,
                    isPriceOptimized: false,
                };
            }

            return res.value;
        } catch (err) {
            return {
                userId: input.userId,
                itemId: input.itemId,
                price: input.defaultPrice,
                deviceId: input.deviceId,
                isPriceOptimized: false,
            };
        }
    }

    private async _getPriceOptimization(input: GetPriceOptimizationInput): Promise<GetPriceOptimizationOutput> {
        const config = await this.getOrgConfig();

        if (!this.allowUserAgent(input.userAgent, config.userAgentBlacklist)) {
            return {
                kind: 'Success',
                value: {
                    userId: input.userId,
                    itemId: input.itemId,
                    price: input.defaultPrice,
                    deviceId: input.deviceId,
                    isPriceOptimized: false,
                },
            };
        }

        const cachedItem = await this.cache.get({
            key: {
                deviceId: input.deviceId,
                itemId: input.itemId,
                overrideToDefaultPrice: input.overrideToDefaultPrice.toString(),
                defaultPrice: input.defaultPrice.toString(),
            },
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
                        entry: this.getCachePayload(input, result.value),
                        ttlMs: result.value.ttlMs,
                        logicalDateAdded: await this.syncServerTime(), //[this.spressoServerTime(), dateFromConfig the last job run date].max()
                    })
                    .catch(); // dont error on not being able to cache ... need to add logging func as an input
                return result;
            }
            case 'Success': {
                switch (cachedItem.value.kind) {
                    case 'CacheHit':
                        return { kind: 'Success', value: cachedItem.value.cachedValue };
                    case 'CacheMiss': {
                        const result = await this.getPriceOptimizationFromApi(input);
                        if (result.kind == 'TimeoutError' || result.kind == 'Unknown') {
                            return result;
                        }

                        await this.cache
                            .set({
                                entry: this.getCachePayload(input, result.value),
                                ttlMs: result.value.ttlMs,
                                logicalDateAdded: await this.syncServerTime(),
                            })
                            .catch(); // dont error on not being able to cache ... need to add logging func as an input

                        return {
                            kind: 'Success',
                            value: {
                                userId: result.value.userId,
                                itemId: result.value.itemId,
                                price: result.value.price,
                                deviceId: result.value.deviceId,
                                isPriceOptimized: result.value.isPriceOptimized,
                            },
                        };
                    }
                }
            }
        }
    }

    private async getPriceOptimizationFromApi(
        input: GetPriceOptimizationInput
    ): Promise<GetPriceOptimizationClientOutput> {
        // todo build/find query string utils with proper escaping and stuff
        const url = `${this.baseUrl}/priceOptimizations`;
        const finalUrl =
            `${url}?deviceId=${input.deviceId}&itemId=${input.itemId}&defaultPrice=${
                input.defaultPrice
            }&overrideToDefaultPrice=${input.overrideToDefaultPrice.toString()}` +
            (input.userId != null ? `&userId=${input.userId}` : '');

        const getPriceOptimizationOutputClient = await this.httpClient.get<{
            data: GetPriceOptimizationClientOutputData;
        }>({
            url: finalUrl,
        });

        switch (getPriceOptimizationOutputClient.kind) {
            case 'Success':
                return {
                    kind: 'Success',
                    value: {
                        ...getPriceOptimizationOutputClient.value.data,
                        price: getPriceOptimizationOutputClient.value.data.price,
                    },
                };
            case 'AuthError':
            case 'BadRequest':
                return {
                    kind: 'Success',
                    value: {
                        ...input,
                        price: input.defaultPrice,
                        isPriceOptimized: false,
                        ttlMs: 300000, // check back in 5 min
                    },
                };
            case 'TimeoutError':
            case 'Unknown':
                return getPriceOptimizationOutputClient;
        }
    }

    // Many
    public async getPriceOptimizations(input: GetPriceOptimizationsInput): Promise<PriceOptimization[]> {
        try {
            const res = await this.getPriceOptimizationsResiliencyPolicy.execute(async () =>
                this._getPriceOptimizations(input)
            );

            if (res.kind == 'TimeoutError' || res.kind == 'Unknown') {
                return input.items.map((x) => ({
                    userId: x.userId,
                    itemId: x.itemId,
                    deviceId: x.deviceId,
                    price: x.defaultPrice,
                    isPriceOptimized: false,
                }));
            }

            return res.value;
        } catch (err) {
            return input.items.map((x) => ({
                userId: x.userId,
                itemId: x.itemId,
                deviceId: x.deviceId,
                price: x.defaultPrice,
                isPriceOptimized: false,
            }));
        }
    }

    private async _getPriceOptimizations(input: GetPriceOptimizationsInput): Promise<GetPriceOptimizationsOutput> {
        const config = await this.getOrgConfig();

        if (!this.allowUserAgent(input.userAgent, config.userAgentBlacklist)) {
            return {
                kind: 'Success',
                value: input.items.map((x) => ({
                    userId: x.userId,
                    itemId: x.itemId,
                    deviceId: x.deviceId,
                    price: x.defaultPrice,
                    isPriceOptimized: false,
                })),
            };
        }

        const cachedItems = await this.cache.getMany({
            keys: input.items.map((input) => ({
                deviceId: input.deviceId,
                itemId: input.itemId,
                overrideToDefaultPrice: input.overrideToDefaultPrice.toString(),
                defaultPrice: input.defaultPrice.toString(),
            })),
        });

        switch (cachedItems.kind) {
            case 'FatalError':
                return this.getPriceOptimizationsFromApi(input);
            case 'Success': {
                // create map so we can get the inputs that didnt exist in the cache
                const hashedInputs = input.items.map((x) => {
                    const obj = this.getCacheKey(x);

                    // eslint-disable-next-line functional/immutable-data
                    const key = JSON.stringify(
                        obj,
                        Object.keys(obj).sort((a, b) => a.localeCompare(b))
                    );
                    return [key, x] as [string, GetPriceOptimizationInput];
                });

                const clientInputMap = new Map(hashedInputs);

                const cacheMissesRequests = (
                    cachedItems.value.filter((x) => x.kind === 'CacheMiss') as CacheMiss<PriceOptimizationCacheKey>[]
                ).map((x) => {
                    const obj = x.input;

                    const key = JSON.stringify(
                        obj,
                        Object.keys(obj).sort((a, b) => a.localeCompare(b))
                    );
                    return clientInputMap.get(key) as GetPriceOptimizationInput; // this should always resolve
                });

                const apiResponses = await this.getPriceOptimizationsFromApi({
                    items: cacheMissesRequests,
                    userAgent: input.userAgent,
                });

                if (apiResponses.kind == 'TimeoutError' || apiResponses.kind == 'Unknown') {
                    return apiResponses;
                }

                // Note: Api should always return the responses to mimic the ordering and count of the input list
                const responsesWithInput = lodash.zip(input.items, apiResponses.value).map((x) => ({
                    getPriceOptimizationInput: x[0] as Omit<GetPriceOptimizationInput, 'userAgent'>,
                    priceOptimization: x[1] as GetPriceOptimizationClientOutputData,
                }));

                const apiResponseMapEntries = responsesWithInput.map((x) => {
                    const obj = this.getCacheKey(x.getPriceOptimizationInput);

                    const key = JSON.stringify(
                        obj,
                        Object.keys(obj).sort((a, b) => a.localeCompare(b))
                    );

                    const priceOptimization: PriceOptimization = {
                        userId: x.priceOptimization.userId,
                        itemId: x.priceOptimization.itemId,
                        price: x.priceOptimization.price,
                        deviceId: x.priceOptimization.deviceId,
                        isPriceOptimized: x.priceOptimization.isPriceOptimized,
                    };

                    return [key, priceOptimization] as [string, PriceOptimization];
                });

                const apiResponseMap = new Map(apiResponseMapEntries);

                const serverTime = await this.syncServerTime();

                await Promise.all(
                    responsesWithInput.map(async (x) => {
                        await this.cache.set({
                            entry: this.getCachePayload(x.getPriceOptimizationInput, x.priceOptimization),
                            ttlMs: x.priceOptimization.ttlMs,
                            logicalDateAdded: serverTime,
                        });
                    })
                ).catch();

                // Note: We do this to preserve order
                return {
                    kind: 'Success',
                    value: cachedItems.value.map((cacheOutput) => {
                        switch (cacheOutput.kind) {
                            case 'CacheHit':
                                return cacheOutput.cachedValue;
                            case 'CacheMiss': {
                                const obj = cacheOutput.input;
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
    ): Promise<GetPriceOptimizationsClientOutput> {
        const url = `${this.baseUrl}/priceOptimizations`;

        const getPriceOptimizationsOutputClient = await this.httpClient.post<{
            data: GetPriceOptimizationsClientOutputData;
        }>({
            url,
            body: {
                items: input.items,
            },
        });

        switch (getPriceOptimizationsOutputClient.kind) {
            case 'Success': {
                return { kind: 'Success', value: getPriceOptimizationsOutputClient.value.data };
            }
            case 'AuthError':
            case 'BadRequest':
                return {
                    kind: 'Success',
                    value: input.items.map((x) => ({
                        ...x,
                        price: x.defaultPrice,
                        isPriceOptimized: false,
                        ttlMs: 300000, // check back in 5 min
                    })),
                };
            case 'TimeoutError':
            case 'Unknown':
                return getPriceOptimizationsOutputClient;
        }
    }
}
