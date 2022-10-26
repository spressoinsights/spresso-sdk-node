import { HttpClient, HttpClientOptions, HttpResponseError } from '@spresso-sdk/http_client';
import { IAuth } from './IAuth';
import { ClientSecretAuthOptions } from './types/models';
import { Auth0Response } from './types/models/Auth0';

type LocalAccessToken = {
    accessToken: string;
    expiresIn: Date;
};

export class ClientSecretAuth implements IAuth {
    //private readonly url = 'https://dev-369tg5rm.us.auth0.com/oauth/token';
    private readonly httpClient: HttpClient;

    private localAccessToken: LocalAccessToken | undefined;

    constructor(private readonly options: ClientSecretAuthOptions) {
        this.httpClient = new HttpClient(new HttpClientOptions());
    }

    public async getAccessToken(): Promise<
        { success: true; accessToken: string } | { success: false; error: HttpResponseError }
    > {
        if (
            this.localAccessToken == undefined ||
            // Note: Defualt if 5 min
            this.localAccessToken.expiresIn.getTime() - Date.now() <= this.options.credentialsExpireWindowMs
        ) {
            // add retry here
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
        const input = {
            client_id: this.options.clientId,
            client_secret: this.options.clientSecret,
            audience: 'https://spresso-api',
            grant_type: 'client_credentials',
        };

        const response = await this.httpClient.post<Auth0Response>({ url: this.options.url, body: input });

        switch (response.kind) {
            case 'Ok': {
                const dateTimeNow = new Date();
                const expiresIn = new Date(dateTimeNow.setSeconds(dateTimeNow.getSeconds() + response.body.expires_in));

                this.localAccessToken = {
                    accessToken: this.ensureBearerPrepended(response.body.access_token),
                    expiresIn,
                };
                return { success: true };
            }
            case 'BadRequest':
            case 'TimeoutError':
            case 'AuthError':
            case 'Unknown':
                return { success: false, error: response };
        }
    }

    private ensureBearerPrepended(token: string): string {
        return !token.startsWith('bearer') && !token.startsWith('Bearer') ? `Bearer ${token}` : token;
    }
}
