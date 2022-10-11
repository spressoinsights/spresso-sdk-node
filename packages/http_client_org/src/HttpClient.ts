import { HttpClient, HttpResponse } from '@spresso-sdk/http_client';
import { Authenticator } from '@spresso-sdk/auth';

export class HttpClientOrg {
    private readonly client: HttpClient;

    // authenticator
    constructor(private readonly authenticator: Authenticator) {
        this.client = new HttpClient();
    }

    public async get<T>(url: string): Promise<HttpResponse<T>> {
        const accessToken = await this.authenticator.getAccessToken();
        if (!accessToken.success) {
            return accessToken.error;
        }

        return this.client.get(url, { authorization: accessToken.accessToken });
    }

    public async post<T>(url: string, json: Record<string, unknown>): Promise<HttpResponse<T>> {
        const accessToken = await this.authenticator.getAccessToken();
        if (!accessToken.success) {
            return accessToken.error;
        }
        return this.client.post(url, { authorization: accessToken.accessToken }, json);
    }
}
