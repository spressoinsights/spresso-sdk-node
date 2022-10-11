import { SuperAgent, SuperAgentRequest, Response as SuperAgentResponse } from 'superagent';
import superagent from 'superagent';
import { HttpResponse, Ok, AuthError, BadRequestError, UnknownError, TimeoutError } from './types';

export type Response = SuperAgentResponse;

export class HttpClient {
    private readonly client: SuperAgent<SuperAgentRequest>;

    constructor() {
        // Todo reuse tcp connection
        this.client = superagent.agent();
    }

    private mapResponse<T>(response: Response): HttpResponse<T> {
        if (response.statusCode >= 200 && response.statusCode < 300) {
            // should parse this with a validator...
            return { kind: 'ok', body: response.body as T };
        } else if (response.statusCode >= 300 && response.statusCode < 400) {
            return { kind: 'unknown' };
        } else if (response.statusCode >= 400 && response.statusCode < 500) {
            if (response.statusCode == 401 || response.statusCode == 403) {
                return { kind: 'authError' };
            } else {
                return { kind: 'badRequest' };
            }
        } else {
            return { kind: 'unknown' };
        }
    }

    private mapError<T>(err: any): HttpResponse<T> {
        if ('timeout' in err) {
            return { kind: 'timeoutError' };
        } else {
            return { kind: 'unknown' };
        }
    }

    // serialize error?
    public async get<T>(url: string, headers: Record<string, string>): Promise<HttpResponse<T>> {
        return this.client
            .get(url)
            .set(headers)
            .ok(() => true)
            .then(
                (x) => this.mapResponse<T>(x),
                (err) => this.mapError(err)
            );
    }

    public async post<T>(
        url: string,
        headers: Record<string, string>,
        input: Record<string, unknown>
    ): Promise<HttpResponse<T>> {
        return this.client
            .post(url)
            .set(headers)
            .send(input)
            .ok(() => true)
            .then(
                (x) => this.mapResponse<T>(x),
                (err) => this.mapError(err)
            );
    }
}
