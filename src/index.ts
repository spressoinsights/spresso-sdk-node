import axios, { AxiosInstance } from 'axios';
import https from 'https';

/* TODO:
    1. DRY up get methods
    2. Handle bot user agents
    3. Switch to prod -> optionally accept a param for staging v prod?
    4. Initial vs subsequent connection timeouts
*/

const DEFAULT_SOCKET_COUNT = 128;
const DEFAULT_CONNECTION_TIMEOUT_MS = 1000;
const DEFAULT_KEEPALIVE_TIMEOUT_MS = 30000;

const ENDPOINT = 'https://api.staging.spresso.com';

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
    keepAliveTimeoutMS?: number;
    logger?: ILogger;
    socketCount?: number;
};

type AuthResponse = {
    access_token: string;
    expires_in: number;
}

class SpressoSDK {
    private authToken: string | null = null;
    private readonly axiosInstance: AxiosInstance;
    private readonly clientID: string;
    private readonly clientSecret: string;
    private readonly logger: ILogger | undefined;
    private tokenExpiration: number | null = null;

    constructor(options: SDKOptions) {
        this.axiosInstance = axios.create({
            baseURL: ENDPOINT,
            headers: {
                Accept: 'application/json',
            },
            timeout: options.connectionTimeoutMS ?? DEFAULT_CONNECTION_TIMEOUT_MS,
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

        this.authenticate().catch(err => {
            this.logError(err);
        });
    }

    async getPrice(request: PricingRequest): Promise<PricingResponse> {
        await this.authenticate().catch((err) => {
            this.logError(err);
            return this.emptyResponse(request);
        });

        return this.axiosInstance.request({
            headers: {
                'Authorization': this.authHeader()
            },
            method: 'get',
            url: '/pim/v1/prices',
            params: request,
        }).then(response => {
            if (response.status != 200) {
                this.logError(response.data);
                return this.emptyResponse(request);
            }
            return response.data as PricingResponse;
        }).catch((err) => {
            this.logError(err);
            return this.emptyResponse(request);
        });
    }

    async getPrices(requests: PricingRequest[]): Promise<PricingResponse[]> {
        await this.authenticate().catch((err) => {
            this.logError(err);
            return this.emptyResponses(requests);
        });

        return this.axiosInstance.request({
            headers: {
                'Authorization': this.authHeader()
            },
            method: 'post',
            url: '/pim/v1/prices',
            params: {
                requests
            },
        }).then(response => {
            if (response.status != 200) {
                this.logError(response.data);
                return this.emptyResponses(requests);
            }
            return response.data as PricingResponse[]; 
        }).catch((err) => {
            this.logError(err);
            return this.emptyResponses(requests);
        });
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
            if (response.status == 200) {
                const authResponse = (response.data as AuthResponse);
                this.authToken = authResponse.access_token;
                this.tokenExpiration = now + (authResponse.expires_in * 1000);
            } else {
                this.logError(response.data);
            }
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

    private logError(err: unknown): void {
        const errMsg = `Spresso API Error: ${JSON.stringify(err)}`;
        if (this.logger != undefined) {
            this.logger.error(errMsg);
        } else {
            console.log(errMsg);
        }
    }
}

export default SpressoSDK;