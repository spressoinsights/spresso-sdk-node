import axios, { AxiosInstance } from 'axios';
import https from 'https';

const DEFAULT_ENDPOINT = 'https://api.spresso.com';
const DEFAULT_CONNECTION_TIMEOUT_MS = 1000;
const DEFAULT_KEEPALIVE_TIMEOUT_MS = 30000;
const DEFAULT_SOCKET_COUNT = 128;

export interface ILogger {
    error(message: string): void;
}

export type PricingRequest = {
    defaultPrice?: number;
    deviceId: string;
    overrideToDefaultPrice?: boolean;
    sku: string;
    userId?: string;
};

export type PricingResponse = {
    deviceId: string;
    isPriceOptimized: boolean;
    price: number | null;
    sku: string;
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
}

type UserAgent = {
    name: string;
    regexp: RegExp;
}

type UserAgentResponse = {
    name: string;
    regexp: string;
}

class SpressoSDK {
    private authToken: string | null = null;
    private readonly axiosInstance: AxiosInstance;
    private botUserAgents: UserAgent[] = [];
    private readonly clientID: string;
    private readonly clientSecret: string;
    private readonly logger: ILogger | undefined;
    private tokenExpiration: number | null = null;

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

        this.logger = options.logger;
        this.clientID = options.clientID;
        this.clientSecret = options.clientSecret;

        // Pre-emptively fetch auth token and bot user agents
        this.authenticate()
            .then(() => this.getBotUserAgents())
            .catch(() => {}); // intentional no-op
    }

    async getPrice(request: PricingRequest, userAgent: string | undefined): Promise<PricingResponse> {
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
    }

    async getPrices(requests: PricingRequest[], userAgent: string | undefined): Promise<PricingResponse[]> {
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
    }

    private async authenticate(): Promise<void> {
        const now = new Date().getTime();
        if (this.authToken != null && this.tokenExpiration != null && now < this.tokenExpiration) {
            return Promise.resolve(); // Current token is valid and non-expired, no need to refetch
        }

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
            const authResponse = (response.data as AuthResponse);
            this.authToken = authResponse.access_token;
            this.tokenExpiration = now + (authResponse.expires_in * 1000);
        });
    }

    private async getBotUserAgents(): Promise<void> {
        if (this.botUserAgents.length != 0) {
            return Promise.resolve(); // Bot user agent list has already been fetched
        }

        return this.axiosInstance.request({
            headers: {
                'Authorization': this.authHeader()
            },
            method: 'get',
            url: '/pim/v1/priceOptimizationOrgConfig',
        }).then(response => {
            const userAgents = response.data.data.userAgentBlacklist.map((userAgent: UserAgentResponse) => {
                return {
                    name: userAgent.name,
                    regexp: new RegExp(userAgent.regexp),
                };
            });
            this.botUserAgents = userAgents;
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

    private authHeader(): string {
        return `Bearer ${this.authToken ?? ''}`;
    } 

    private emptyResponse(request: PricingRequest): PricingResponse {
        return {
            deviceId: request.deviceId,
            isPriceOptimized: false,
            price: request.defaultPrice ?? null,
            sku: request.sku,
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
}

export default SpressoSDK;