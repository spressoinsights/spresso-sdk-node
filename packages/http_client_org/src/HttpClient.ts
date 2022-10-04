import { HttpClient, Response } from '@spresso-sdk/http_client';
import { Authenticator } from '@spresso-sdk/auth';

export class HttpClientOrg {
    private readonly client: HttpClient;

    // authenticator
    constructor(private readonly authenticator: Authenticator) {
        this.client = new HttpClient();
    }

    public async get(url: string): Promise<Response> {
        const accessToken = await this.authenticator.getAccessToken();
        return this.client.get(url, { authorization: accessToken });
    }

    public async post(url: string, json: Record<string, unknown>): Promise<Response> {
        const accessToken = await this.authenticator.getAccessToken();
        return this.client.post(url, { authorization: accessToken }, json);
    }

    public async put(url: string, json: Record<string, unknown>): Promise<Response> {
        const accessToken = await this.authenticator.getAccessToken();
        return this.client.put(url, { authorization: accessToken }, json);
    }

    public async patch(url: string, json: Record<string, unknown>): Promise<Response> {
        const accessToken = await this.authenticator.getAccessToken();
        return this.client.patch(url, { authorization: accessToken }, json);
    }

    public async delete(url: string, json: Record<string, unknown>): Promise<Response> {
        const accessToken = await this.authenticator.getAccessToken();
        return this.client.delete(url, { authorization: accessToken }, json);
    }
}
