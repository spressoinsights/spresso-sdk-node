type HttpClientOptionsType = {
    defaultTimeoutMs: number;
};

export class HttpClientOptions {
    public readonly defaultTimeoutMs: number;

    private readonly defaultOptions = {
        defaultTimeoutMs: 5000, // 5 second default timeout
    };

    constructor(
        readonly options?: {
            timeoutMs?: number;
        }
    ) {
        const defaultedOptions = { ...options, ...this.defaultOptions };
        this.defaultTimeoutMs = this.sanitizeDefaultTimeoutMS(defaultedOptions);
    }

    private sanitizeDefaultTimeoutMS(options: HttpClientOptionsType): number {
        // if less than or equal to zero default to 5 seconds
        return options.defaultTimeoutMs <= 0 ? 5000 : options.defaultTimeoutMs;
    }
}
