import { HttpClient, HttpClientOptions, HttpResponse, HttpResponseError } from '@spresso-sdk/http_client';
import { mapAuth0ToLocalAccessToken, shouldGetAccessToken } from './ClientSecretAuthUtils';
import { IAuth } from './IAuth';
import { ClientSecretAuthOptions } from './types/models';
import { Auth0Response } from './types/models/Auth0';
import { LocalAccessToken } from './types/models/LocalAccessToken';

export class ClientSecretAuth implements IAuth {
    private readonly httpClient: HttpClient;

    private localAccessToken: LocalAccessToken | undefined;

    constructor(private readonly options: ClientSecretAuthOptions) {
        this.httpClient = new HttpClient(new HttpClientOptions());
    }

    public async getAccessToken(): Promise<
        { success: true; accessToken: string } | { success: false; error: HttpResponseError }
    > {
        if (
            shouldGetAccessToken({
                accessToken: this.localAccessToken,
                currentDate: new Date(),
                credentialsExpireWindowMs: this.options.credentialsExpireWindowMs,
            })
        ) {
            const refreshTokenOrFailure = await this.getAndSaveAccessTokenLocally();
            if (!refreshTokenOrFailure.success) {
                return refreshTokenOrFailure;
            }
        }

        const token = this.localAccessToken as LocalAccessToken;

        return { success: true, accessToken: token.accessToken };
    }

    private async getAndSaveAccessTokenLocally(): Promise<
        { success: true } | { success: false; error: HttpResponseError }
    > {
        const response = await this.getAccessTokenFromAuthApi();

        switch (response.kind) {
            case 'Success': {
                // eslint-disable-next-line functional/immutable-data
                this.localAccessToken = mapAuth0ToLocalAccessToken({
                    auth0Response: response.value,
                    currentDate: new Date(),
                });

                return { success: true };
            }
            case 'BadRequest':
            case 'TimeoutError':
            case 'AuthError':
            case 'Unknown':
                return { success: false, error: response };
        }
    }

    private async getAccessTokenFromAuthApi(): Promise<HttpResponse<Auth0Response>> {
        const input = {
            client_id: this.options.clientId,
            client_secret: this.options.clientSecret,
            audience: 'https://spresso-api',
            grant_type: 'client_credentials',
        };

        return this.httpClient.post<Auth0Response>({ url: this.options.url, body: input });
    }
}
