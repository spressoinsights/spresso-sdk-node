import {
    CacheHit,
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
import { HttpClientOptions, Success } from '@spressoinsights/http_client';
import { JSONStringifyOrderedKeys } from '@spressoinsights/utils';

// V3
// type ResiliencyPolicy = IMergedPolicy<
//     ICancellationContext & IRetryContext & IDefaultPolicyContext,
//     never,
//     [TimeoutPolicy, RetryPolicy, CircuitBreakerPolicy]
// >;
// V2
type ResiliencyPolicy = IPolicy<ICancellationContext & IRetryContext, never>;

type ApiInputWithResponse = {
    getPriceOptimizationInput: Omit<GetPriceOptimizationInput, 'userAgent'>;
    priceOptimization: GetPriceOptimizationClientOutputData;
};

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
        const { logger } = this.options;

        logger.debug({ msg: 'Calling getOrgConfig.' });
        // add ttl to feature of 15 min to ttl config...
        const configTtlMs = 900000;

        const config = await this.configCache.get({
            key: { config: 'config' },
        });

        switch (config.kind) {
            case 'Success':
                switch (config.value.kind) {
                    case 'CacheHit':
                        logger.debug({ msg: 'CacheHit: getOrgConfig.' });
                        return config.value.cachedValue;
                    case 'CacheMiss': {
                        logger.debug({ msg: 'CacheMiss: getOrgConfig.' });
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
        const { logger } = this.options;
        const url = `${this.baseUrl}/priceOptimizationOrgConfig`;

        const getConfigOutput = await this.httpClient.get<{
            data: PriceOptimizationOrgConfig;
        }>({
            url,
        });

        switch (getConfigOutput.kind) {
            case 'Success': {
                logger.debug({ msg: 'Success: getOrgConfig from API.' });
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
        const { logger } = this.options;
        logger.debug({ msg: 'getPriceOptimization called with:', input });

        try {
            const res = await this.getPriceOptimizationResiliencyPolicy.execute(async () =>
                this._getPriceOptimization(input)
            );

            if (res.kind == 'TimeoutError' || res.kind == 'Unknown') {
                logger.warn({ msg: `Error: getting PriceOptimization ${res.kind}` });
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
            logger.warn({ msg: 'Task Cancelled: getPriceOptimization', err });
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
        const { logger } = this.options;
        const config = await this.getOrgConfig();

        if (!this.allowUserAgent(input.userAgent, config.userAgentBlacklist)) {
            logger.debug({ msg: 'Skipping PriceOptimization: UserAgent in blacklist', input });
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
            case 'FatalError': {
                logger.error({ msg: `${cachedItem.kind} when accessing cache.`, input });
                const result = await this.getPriceOptimizationFromApi(input);
                if (result.kind == 'TimeoutError' || result.kind == 'Unknown') {
                    logger.warn({ msg: `Error: getting PriceOptimization after cache failure` });
                    return result;
                }

                const cacheRes = await this.cache.set({
                    entry: this.getCachePayload(input, result.value),
                    ttlMs: result.value.ttlMs,
                    logicalDateAdded: await this.syncServerTime(), //[this.spressoServerTime(), dateFromConfig the last job run date].max()
                });

                if (cacheRes.kind == 'FatalError') {
                    logger.warn({ msg: `Unable to set cache input`, input });
                }
                return result;
            }
            case 'Success': {
                switch (cachedItem.value.kind) {
                    case 'CacheHit':
                        logger.debug({ msg: 'CacheHit returning: ', cachedItem });
                        return { kind: 'Success', value: cachedItem.value.cachedValue };
                    case 'CacheMiss': {
                        const result = await this.getPriceOptimizationFromApi(input);
                        if (result.kind == 'TimeoutError' || result.kind == 'Unknown') {
                            logger.warn({ msg: `Error: getting PriceOptimization after cache miss` });
                            return result;
                        }

                        const cacheRes = await this.cache.set({
                            entry: this.getCachePayload(input, result.value),
                            ttlMs: result.value.ttlMs,
                            logicalDateAdded: await this.syncServerTime(),
                        });

                        if (cacheRes.kind == 'FatalError') {
                            logger.error({ msg: 'Fatal Error when trying to set cache', err: cacheRes.error });
                        }

                        logger.debug({ msg: 'Successfully acccessed API to get PriceOptimization', result });

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
        const { logger } = this.options;
        logger.debug({ msg: 'getPriceOptimizations called with:', input });

        try {
            const res = await this.getPriceOptimizationsResiliencyPolicy.execute(async () =>
                this._getPriceOptimizations(input)
            );

            if (res.kind == 'TimeoutError' || res.kind == 'Unknown') {
                logger.warn({ msg: `Error: getting PriceOptimizations ${res.kind}` });
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
            logger.warn({ msg: 'Task Cancelled: getPriceOptimization', err });
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
        const { logger } = this.options;
        const config = await this.getOrgConfig();

        if (!this.allowUserAgent(input.userAgent, config.userAgentBlacklist)) {
            logger.debug({ msg: 'Skipping PriceOptimizations: UserAgent in blacklist', input });
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
                logger.error({ msg: `${cachedItems.kind} when accessing cache.`, input });
                return this.getPriceOptimizationsFromApi(input);
            case 'Success': {
                // create map so we can get the inputs that didnt exist in the cache
                const hashedInputs = input.items.map((x) => {
                    const obj = this.getCacheKey(x);

                    // eslint-disable-next-line functional/immutable-data
                    const key = JSONStringifyOrderedKeys(obj);
                    return [key, x] as [string, GetPriceOptimizationInput];
                });

                logger.debug({ msg: 'getPriceOptimizations: hashedInputs', hashedInputs });

                const clientInputMap = new Map(hashedInputs);

                const cacheMissesRequests = (
                    cachedItems.value.filter((x) => x.kind === 'CacheMiss') as CacheMiss<PriceOptimizationCacheKey>[]
                ).map((x) => {
                    const obj = x.input;
                    const key = JSONStringifyOrderedKeys(obj);

                    return clientInputMap.get(key) as GetPriceOptimizationInput; // this should always resolve
                });

                logger.debug({ msg: 'getPriceOptimizations: cacheMissesRequests', cacheMissesRequests });

                const cacheMissInput = {
                    items: cacheMissesRequests,
                    userAgent: input.userAgent,
                };

                const apiResponsesOrError = await this.getPriceOptimizationsFromApi(cacheMissInput);

                if (apiResponsesOrError.kind == 'TimeoutError' || apiResponsesOrError.kind == 'Unknown') {
                    logger.warn({ msg: `Error: getting PriceOptimization after cache miss`, cacheMissInput });
                    const mockApiResponses = cacheMissesRequests.map((x) => this._mockAPIResponseFromInput(x));
                    const responsesWithInput = this._zipApiInputsWithResponses(cacheMissInput, mockApiResponses);
                    const apiResponseMap = this._generateApiResponseMap(responsesWithInput);

                    return {
                        kind: 'Success',
                        value: this._generateResponse(cachedItems, apiResponseMap),
                    };
                }

                const responsesWithInput = this._zipApiInputsWithResponses(cacheMissInput, apiResponsesOrError.value);
                const apiResponseMap = this._generateApiResponseMap(responsesWithInput);

                const serverTime = await this.syncServerTime();

                await Promise.all(
                    responsesWithInput.map(async (x) => {
                        const cacheInput = this.getCachePayload(x.getPriceOptimizationInput, x.priceOptimization);
                        logger.debug({ msg: 'Caching', cacheInput });
                        const result = await this.cache.set({
                            entry: cacheInput,
                            ttlMs: x.priceOptimization.ttlMs,
                            logicalDateAdded: serverTime,
                        });

                        if (result.kind == 'FatalError') {
                            logger.warn({ msg: `Unable to cache input`, input: x.getPriceOptimizationInput });
                        }
                    })
                );

                return {
                    kind: 'Success',
                    value: this._generateResponse(cachedItems, apiResponseMap),
                };
            }
        }
    }

    private _mockAPIResponseFromInput(input: GetPriceOptimizationInput): GetPriceOptimizationClientOutputData {
        return {
            userId: input.userId,
            itemId: input.itemId,
            price: input.defaultPrice,
            deviceId: input.deviceId,
            isPriceOptimized: false,
            ttlMs: -1,
        };
    }

    // Note: We do this to preserve order
    private _generateResponse(
        cachedItems: Success<(CacheHit<PriceOptimization> | CacheMiss<PriceOptimizationCacheKey>)[]>,
        apiResponseMap: Map<string, PriceOptimization>
    ): PriceOptimization[] {
        return cachedItems.value.map((cacheOutput) => {
            switch (cacheOutput.kind) {
                case 'CacheHit':
                    return cacheOutput.cachedValue;
                case 'CacheMiss': {
                    const obj = cacheOutput.input;
                    const key = JSONStringifyOrderedKeys(obj);
                    return apiResponseMap.get(key) as PriceOptimization;
                }
            }
        });
    }

    private _zipApiInputsWithResponses(
        input: GetPriceOptimizationsInput,
        apiResponses: GetPriceOptimizationsClientOutputData
    ): ApiInputWithResponse[] {
        // Note: Api should always return the responses to mimic the ordering and count of the input list
        return lodash
            .chain(input.items)
            .zip(apiResponses)
            .map((x) => ({
                getPriceOptimizationInput: x[0] as Omit<GetPriceOptimizationInput, 'userAgent'>,
                priceOptimization: x[1] as GetPriceOptimizationClientOutputData,
                // Note: Filter here ensures we only are dealing with entries we made calls for.
            }))
            .filter((x) => x.priceOptimization != undefined)
            .value();
    }

    private _generateApiResponseMap(apiInputWithResponse: ApiInputWithResponse[]): Map<string, PriceOptimization> {
        const apiResponseMapEntries = apiInputWithResponse.map((x) => {
            const obj = this.getCacheKey(x.getPriceOptimizationInput);

            const key = JSONStringifyOrderedKeys(obj);
            const priceOptimization: PriceOptimization = {
                userId: x.priceOptimization.userId,
                itemId: x.priceOptimization.itemId,
                price: x.priceOptimization.price,
                deviceId: x.priceOptimization.deviceId,
                isPriceOptimized: x.priceOptimization.isPriceOptimized,
            };

            return [key, priceOptimization] as [string, PriceOptimization];
        });

        return new Map(apiResponseMapEntries);
    }

    private async getPriceOptimizationsFromApi(
        input: GetPriceOptimizationsInput
    ): Promise<GetPriceOptimizationsClientOutput> {
        if (lodash.isEmpty(input.items)) {
            return {
                kind: 'Success',
                value: [],
            };
        }

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
