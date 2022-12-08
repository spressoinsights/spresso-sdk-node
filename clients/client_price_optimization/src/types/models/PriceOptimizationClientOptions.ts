import { IAuth } from '@spressoinsights/auth';
import { ICacheStrategy } from '@spressoinsights/cache';
import { PriceOptimization } from './PriceOptimization';
import { PriceOptimizationCacheKey } from './PriceOptimizationCacheKey';
import { Logger, LoggerFuncs } from '@spressoinsights/utils';

export type ResiliencyPolicy = {
    numberOfRetries: number;
    timeoutMs: number;
    numberOfFailuresBeforeTrippingCircuitBreaker: number;
    circuitBreakerBreakDurationMs: number;
};

export class PriceOptimizationClientOptions {
    public readonly authenticator: IAuth;
    public readonly cachingStrategy: ICacheStrategy<PriceOptimizationCacheKey, PriceOptimization>;
    public readonly resiliencyPolicy: ResiliencyPolicy;
    public readonly baseUrl: string;
    public readonly logger: Logger;

    private readonly defaultResiliencyPolicy: ResiliencyPolicy = {
        numberOfRetries: 10,
        timeoutMs: 10000,
        numberOfFailuresBeforeTrippingCircuitBreaker: 100,
        circuitBreakerBreakDurationMs: 60000,
    };

    constructor(
        readonly options: {
            authenticator: IAuth;
            cachingStrategy: ICacheStrategy<PriceOptimizationCacheKey, PriceOptimization>;
            baseUrl?: string;
            resiliencyPolicy?: {
                numberOfRetries?: number;
                timeoutMs?: number;
                numberOfFailuresBeforeTrippingCircuitBreaker?: number;
                circuitBreakerBreakDurationMs?: number;
            };
            logger?: LoggerFuncs;
        }
    ) {
        this.authenticator = options.authenticator;
        this.cachingStrategy = options.cachingStrategy;

        this.resiliencyPolicy = { ...options.resiliencyPolicy, ...this.defaultResiliencyPolicy };

        this.resiliencyPolicy.numberOfRetries = this.sanitizeResiliencyPolicyNumberOfRetries(this.resiliencyPolicy);
        this.resiliencyPolicy.timeoutMs = this.sanitizeTimeoutMs(this.resiliencyPolicy);
        this.resiliencyPolicy.circuitBreakerBreakDurationMs = this.sanitizeCircuitBreakerBreakDurationMs(
            this.resiliencyPolicy
        );
        this.resiliencyPolicy.numberOfFailuresBeforeTrippingCircuitBreaker =
            this.sanitizeNumberOfFailuresBeforeTrippingCircuitBreaker(this.resiliencyPolicy);

        this.baseUrl = options.baseUrl ?? 'https://api.spresso.com';
        this.logger = new Logger({ namespace: '@PriceOptimizationClient', logger: options?.logger });
    }

    private sanitizeResiliencyPolicyNumberOfRetries(policy: ResiliencyPolicy): number {
        if (policy.numberOfRetries <= 0) return 0;
        else if (policy.numberOfRetries >= 10) return 10;
        else return policy.numberOfRetries;
    }

    private sanitizeCircuitBreakerBreakDurationMs(policy: ResiliencyPolicy): number {
        return policy.circuitBreakerBreakDurationMs < 0 ? 0 : this.resiliencyPolicy.circuitBreakerBreakDurationMs;
    }

    private sanitizeNumberOfFailuresBeforeTrippingCircuitBreaker(policy: ResiliencyPolicy): number {
        return policy.numberOfFailuresBeforeTrippingCircuitBreaker <= 0
            ? 1
            : policy.numberOfFailuresBeforeTrippingCircuitBreaker;
    }

    private sanitizeTimeoutMs(policy: ResiliencyPolicy): number {
        if (policy.timeoutMs <= 0) return 10000;
        else if (policy.timeoutMs >= 180000) return 180000;
        else return policy.timeoutMs;
    }
}
