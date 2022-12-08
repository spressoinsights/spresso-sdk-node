import { Logger, LoggerFuncs } from '@spressoinsights/utils';

type HttpClientOptionsType = {
    defaultTimeoutMs: number;
};

export class HttpClientOptions {
    public readonly defaultTimeoutMs: number;
    public readonly logger: Logger;

    private readonly defaultOptions = {
        defaultTimeoutMs: 5000, // 5 second default timeout
    };

    constructor(options?: { defaultTimeoutMs?: number; logger?: LoggerFuncs | Logger }) {
        const defaultedOptions = { ...this.defaultOptions, ...options };
        this.defaultTimeoutMs = this.sanitizeDefaultTimeoutMS(defaultedOptions);
        this.logger = new Logger({ namespace: '@HttpClient', logger: options?.logger });
    }

    private sanitizeDefaultTimeoutMS(options: HttpClientOptionsType): number {
        // if less than or equal to zero default to 5 seconds
        return options.defaultTimeoutMs <= 0 ? 5000 : options.defaultTimeoutMs;
    }
}
