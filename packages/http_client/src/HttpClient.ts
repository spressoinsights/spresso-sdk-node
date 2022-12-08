/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { HttpResponse, Success, AuthError, BadRequestError, UnknownError, TimeoutError } from './types';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import http from 'http';
import https from 'https';
import { HttpClientOptions } from './types/models';

// TODO add agent in the header
export class HttpClient {
    private readonly client: AxiosInstance;

    constructor(private readonly options: HttpClientOptions) {
        this.client = axios.create({
            httpAgent: new http.Agent({ keepAlive: true }),
            httpsAgent: new https.Agent({ keepAlive: true }),
            timeout: options.defaultTimeoutMs,
            validateStatus: () => true, // Dont throw errors when non 200 code is returned
        });
    }

    private mapResponse<T>(response: AxiosResponse<any, any>): HttpResponse<T> {
        const { logger } = this.options;
        if (response.status >= 200 && response.status < 300) {
            // should parse this with a validator...
            return { kind: 'Success', value: response.data as T };
        } else if (response.status >= 300 && response.status < 400) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            return { kind: 'Unknown', statusCode: response.status, reason: response.statusText };
        } else if (response.status >= 400 && response.status < 500) {
            if (response.status == 401 || response.status == 403) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                return { kind: 'AuthError', statusCode: response.status, reason: response.statusText };
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                return { kind: 'BadRequest', statusCode: response.status, reason: response.statusText };
            }
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            return { kind: 'Unknown', statusCode: response.status, reason: response.statusText };
        }
    }

    private mapError<T>(err: any): HttpResponse<T> {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (err.code == 'ECONNABORTED') {
            return { kind: 'TimeoutError' };
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            return { kind: 'Unknown', statusCode: err['status'] ?? 500, reason: err };
        }
    }

    public async get<T>(getInput: {
        url: string;
        headers?: Record<string, string>;
        options?: { timeoutMs?: number };
    }): Promise<HttpResponse<T>> {
        const { logger } = this.options;

        logger.debug({ msg: 'GET Request', url: getInput.url });

        return this.client
            .get(getInput.url, {
                headers: getInput.headers ?? {},
                timeout: getInput.options?.timeoutMs ?? this.options.defaultTimeoutMs,
            })
            .then(
                (x) => this.mapResponse<T>(x),
                (err) => this.mapError(err)
            );
    }

    public async post<T>(postInput: {
        url: string;
        headers?: Record<string, string>;
        body: Record<string, unknown>;
        options?: { timeoutMs?: number };
    }): Promise<HttpResponse<T>> {
        const { logger } = this.options;

        logger.debug({ msg: 'POST Request', url: postInput.url, body: postInput.body });

        return this.client
            .post(postInput.url, postInput.body, {
                headers: postInput.headers ?? {},
                timeout: postInput.options?.timeoutMs ?? this.options.defaultTimeoutMs,
            })
            .then(
                (x) => this.mapResponse<T>(x),
                (err) => this.mapError(err)
            );
    }
}
