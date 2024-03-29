import axios, { AxiosInstance } from 'axios';
import https from 'https';

const DEFAULT_ENDPOINT = 'https://api.spresso.com';
const DEFAULT_CONNECTION_TIMEOUT_MS = 1000;
const DEFAULT_KEEPALIVE_TIMEOUT_MS = 30000;
const DEFAULT_SOCKET_COUNT = 128;

// 30 minute expiration padding for auth tokens
const AUTH_EXPIRATION_PAD_MS = 30 * 60 * 1000;

export interface ILogger {
    error(message?: any, ...optionalParams: any[]): void;
    info?(message?: any, ...optionalParams: any[]): void;
};

export type PricingRequest = {
    defaultPrice?: number;
    deviceId: string;
    overrideToDefaultPrice?: boolean;
    itemId: string;
    userId?: string;
};

export type PricingResponse = {
    deviceId: string;
    isPriceOptimized: boolean;
    price: number | null;
    itemId: string;
    userId: string | null;
};

export type SDKOptions = {
    clientID: string;
    clientSecret: string;
    connectionTimeoutMS?: number;
    endpointOverride?: string;
    keepAliveTimeoutMS?: number;
    logger?: ILogger;
    socketCount?: number;
};

type AuthResponse = {
    access_token: string;
    expires_in: number;
};

type UserAgent = {
    name: string;
    regexp: RegExp;
};

type UserAgentResponse = {
    name: string;
    regexp: string;
};

type OptimizedSkuResponse = {
    expiresAt: number;
    skus: string[];
    skipInactive: boolean;
};

const isBlank = (val: any) => {
    return val == null || val == undefined || String(val).trim().length === 0;
};

class SpressoSDK {
    private authToken: string | null = null;
    private readonly axiosInstance: AxiosInstance;
    private botUserAgents: UserAgent[] = [];
    private readonly clientID: string;
    private readonly clientSecret: string;
    private readonly logger: ILogger | undefined;
    private tokenExpiration: number | null = null;
    private optimizedSkus: Set<string>;
    private skipInactive: boolean | null = null;
    private skuExpiration: number | null = null;

    constructor(options: SDKOptions) {
        this.axiosInstance = axios.create({
            baseURL: options.endpointOverride ?? DEFAULT_ENDPOINT,
            headers: {
                Accept: 'application/json',
            },
            timeout: options.connectionTimeoutMS ?? DEFAULT_CONNECTION_TIMEOUT_MS,
            validateStatus: (status) => status == 200, // 200 is the only acceptable HTTP response from Spresso
        });

        // Use Keep-alive
        this.axiosInstance.defaults.httpsAgent = new https.Agent({
            keepAlive: true,
            maxSockets: options.socketCount ?? DEFAULT_SOCKET_COUNT,
            maxFreeSockets: options.socketCount ?? DEFAULT_SOCKET_COUNT,
            timeout: options.keepAliveTimeoutMS ?? DEFAULT_KEEPALIVE_TIMEOUT_MS,
        });

        this.optimizedSkus = new Set();
        this.logger = options.logger;
        this.clientID = options.clientID;
        this.clientSecret = options.clientSecret;

        // Pre-emptively fetch auth token, bot user agents and optimized skus
        this.authenticate()
            .then(() => this.getBotUserAgents())
            .then(() => this.getOptimizedSkus())
            .catch(() => {}); // intentional no-op
    }

    async getPrice(request: PricingRequest, userAgent: string | undefined): Promise<PricingResponse> {
        try {
            if (this.skipApiRequest([request])) {
                return this.emptyResponse(request);
            }

            const response = await this.makeRequest(
                'get',
                request,
                undefined,
                userAgent
            ).catch((err) => {
                this.handleAxiosError(err);
                return this.emptyResponse(request);
            });

            if (response == null) {
                return this.emptyResponse(request);
            }

            return response as PricingResponse;
        } catch (err) {
            return this.emptyResponse(request);
        }
    }

    async getPrices(requests: PricingRequest[], userAgent: string | undefined): Promise<PricingResponse[]> {
        try {
            if (this.skipApiRequest(requests)) {
                return this.emptyResponses(requests);
            }

            const response = await this.makeRequest(
                'post',
                undefined,
                { requests },
                userAgent
            ).catch((err) => {
                this.handleAxiosError(err);
                return this.emptyResponses(requests);
            });

            if (response == null) {
                return this.emptyResponses(requests);
            }

            return response as PricingResponse[];
        } catch (err) {
            return this.emptyResponses(requests);
        }
    }

    private skipApiRequest(requests: PricingRequest[]): boolean {
        // ANY missing device ID in batch will cause a 400 from our API, so we skip to avoid 400's on server
        const hasMissingDeviceId = requests.some((request) => isBlank(request.deviceId));
        if (hasMissingDeviceId) {
            this.logInfo('Missing deviceId, short-circuiting...');
            return true;
        }

        // Fetch optimized skus, don't await!
        this.getOptimizedSkus().catch(() => {});

        /* We only skip if ALL skus are non optimized
         * Why? The point of this is to minimize the API roundtrip.
         * If even one sku IS optimized we won't be able to skip, so no point adding the extra complexity of partial skips
         */
        const someOptimized = requests.some(request => this.optimizedSkus.has(request.itemId));
        if (this.skipInactive && !someOptimized) {
            this.logInfo('All SKUs are non-optimized, short-circuiting...');
            return true;
        }

        this.logInfo('Found optimized SKU, making API request...');
        return false;
    }

    private async authenticate(): Promise<void> {
        const now = new Date().getTime();
        if (this.isTokenValid(now)) {
            return Promise.resolve(); // Current token is valid and non-expired, no need to refetch
        }

        this.logInfo('Authenticating Spresso API...');
        return this.axiosInstance.request({
            method: 'post',
            url: '/identity/v1/public/token',
            data: {
                client_id: this.clientID,
                client_secret: this.clientSecret,
                audience: 'https://spresso-api',
                grant_type: 'client_credentials',
            },
        }).then(response => {
            this.logInfo('Spresso Authentication Successful!');
            const authResponse = (response.data as AuthResponse);
            this.authToken = authResponse.access_token;
            this.tokenExpiration = now + (authResponse.expires_in * 1000);
        });
    }

    private async getBotUserAgents(): Promise<void> {
        if (this.botUserAgents.length != 0 || !this.isTokenValid(new Date().getTime())) {
            return Promise.resolve(); // Bot user agent list has already been fetched OR we have no token, skip fetch
        }

        this.logInfo('Fetch Bot user-agent list...');
        return this.axiosInstance.request({
            headers: {
                'Authorization': this.authHeader()
            },
            method: 'get',
            url: '/pim/v1/priceOptimizationOrgConfig',
        }).then(response => {
            this.logInfo('Bot user-agent list fetched!');
            const userAgents = response.data.data.userAgentBlacklist.map((userAgent: UserAgentResponse) => {
                return {
                    name: userAgent.name,
                    regexp: new RegExp(userAgent.regexp),
                };
            });
            this.botUserAgents = userAgents;
        });
    }

    private async getOptimizedSkus(): Promise<void> {
        const now = new Date().getTime();
        if ((this.skuExpiration != null && now < this.skuExpiration) || !this.isTokenValid(now)) {
            return Promise.resolve(); // Optimized skus has already been fetched and has not expired OR we have no token, skip fetch
        }

        this.logInfo('Fetching optimized skus...');
        return this.axiosInstance.request({
            headers: {
                'Authorization': this.authHeader()
            },
            method: 'get',
            url: '/pim/v1/variants/optimizedSKUs',
        }).then(response => {
            const optimizedSkuResponse = (response.data as OptimizedSkuResponse);
            this.logInfo(`${optimizedSkuResponse.skus.length} optimized skus fetched!`);
            this.skuExpiration = optimizedSkuResponse.expiresAt * 1000;
            this.optimizedSkus = new Set(optimizedSkuResponse.skus);
            this.skipInactive = optimizedSkuResponse.skipInactive;
        });
    }

    private async makeRequest(
        method: string,
        params: any | undefined,
        data: any | undefined,
        userAgent: string | undefined
    ): Promise<any> {
        // 1. Authenticate
        await this.authenticate().catch((err) => {
            throw err;
        });

        // 2. Check user-agent
        if (userAgent != undefined) {
            await this.getBotUserAgents().catch(() => {}); // intentional no-op
            const isBot = this.botUserAgents.some(botUserAgent => botUserAgent.regexp.test(userAgent));
            if (isBot) {
                return Promise.resolve(null);
            }
        }

        // 3. Make request
        return this.axiosInstance.request({
            headers: {
                'Authorization': this.authHeader()
            },
            method,
            url: '/pim/v1/prices',
            params,
            data,
        }).then(response => {
            return response.data;
        });
    }

    private isTokenValid(now: number): boolean {
        return this.authToken != null && this.tokenExpiration != null && now < (this.tokenExpiration - AUTH_EXPIRATION_PAD_MS);
    }

    private authHeader(): string {
        return `Bearer ${this.authToken ?? ''}`;
    } 

    private emptyResponse(request: PricingRequest): PricingResponse {
        return {
            deviceId: request.deviceId,
            isPriceOptimized: false,
            price: request.defaultPrice ?? null,
            itemId: request.itemId,
            userId: request.userId ?? null,
        };
    }

    private emptyResponses(requests: PricingRequest[]): PricingResponse[] {
        return requests.map(request => this.emptyResponse(request));
    }

    private handleAxiosError(err: { response?: any, request?: any}): void {
        if (err.response) {
            // Server responded with non-200 code
            this.logError(JSON.stringify(err.response.data));
          } else if (err.request) {
            // Request was sent, but no response received
            this.logError("No response from Spresso");
          } else {
            // Unknown error
            this.logError('Unknown error');
          }
    }

    private logError(msg: string): void {
        const errMsg = `Spresso API Error: ${msg}`;
        if (this.logger != undefined) {
            this.logger.error(errMsg);
        } else {
            console.log(errMsg);
        }
    }

    private logInfo(msg: string): void {
        if (this.logger != undefined && this.logger.info != undefined) {
            this.logger.info(msg);
        }
    }
}

export default SpressoSDK;