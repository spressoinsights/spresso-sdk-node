import { HttpResponse, Ok, AuthError, BadRequestError, UnknownError, TimeoutError } from './types';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import http from 'http';
import https from 'https';

export class HttpClient {
    private readonly client: AxiosInstance;

    constructor() {
        // Todo reuse tcp connection
        this.client = axios.create({
            httpAgent: new http.Agent({ keepAlive: true }),
            httpsAgent: new https.Agent({ keepAlive: true }),
        });
    }

    private mapResponse<T>(response: AxiosResponse<any, any>): HttpResponse<T> {
        if (response.status >= 200 && response.status < 300) {
            // should parse this with a validator...
            return { kind: 'Ok', body: response.data as T };
        } else if (response.status >= 300 && response.status < 400) {
            return { kind: 'Unknown' };
        } else if (response.status >= 400 && response.status < 500) {
            if (response.status == 401 || response.status == 403) {
                return { kind: 'AuthError' };
            } else {
                return { kind: 'BadRequest' };
            }
        } else {
            return { kind: 'Unknown' };
        }
    }

    private mapError<T>(err: any): HttpResponse<T> {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (err.code == 'ECONNABORTED') {
            return { kind: 'TimeoutError' };
        } else {
            return { kind: 'Unknown' };
        }
    }

    public async get<T>(url: string, headers: Record<string, string>): Promise<HttpResponse<T>> {
        return this.client.get(url, { headers, validateStatus: (x) => true }).then(
            (x) => this.mapResponse<T>(x),
            (err) => this.mapError(err)
        );
    }

    public async post<T>(
        url: string,
        headers: Record<string, string>,
        input: Record<string, unknown>
    ): Promise<HttpResponse<T>> {
        return this.client.post(url, { headers, validateStatus: () => true }, input).then(
            (x) => this.mapResponse<T>(x),
            (err) => this.mapError(err)
        );
    }
}
