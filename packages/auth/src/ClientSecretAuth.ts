import { HttpClient, HttpResponseError } from '@spresso-sdk/http_client';
import { IAuth } from './IAuth';
import { Auth0Response } from './types/Auth0';

type LocalAccessToken = {
    accessToken: string;
    expiresIn: Date;
};

export class ClientSecretAuth implements IAuth {
    // can I have build flags for this?
    private readonly url = 'https://dev-369tg5rm.us.auth0.com/oauth/token';

    private readonly httpClient: HttpClient;
    private readonly clientId: string;
    private readonly clientSecret: string;

    private localAccessToken: LocalAccessToken | undefined;

    // Have a 5 minutes window to refresh the token before it expires.
    private readonly credentialsExpireWindowMs = 300000;

    constructor(options: { clientId: string; clientSecret: string }) {
        this.httpClient = new HttpClient();
        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
    }

    public async getAccessToken(): Promise<
        { success: true; accessToken: string } | { success: false; error: HttpResponseError }
    > {
        if (
            this.localAccessToken == undefined ||
            this.localAccessToken.expiresIn.getTime() - Date.now() <= this.credentialsExpireWindowMs
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
            client_id: this.clientId,
            client_secret: this.clientSecret,
            audience: 'https://spresso-api',
            grant_type: 'client_credentials',
        };

        const response = await this.httpClient.post<Auth0Response>(this.url, {}, input);

        switch (response.kind) {
            case 'ok': {
                const dateTimeNow = new Date();
                const expiresIn = new Date(dateTimeNow.setSeconds(dateTimeNow.getSeconds() + response.body.expires_in));

                this.localAccessToken = {
                    accessToken: this.ensureBearerPrepended(response.body.access_token),
                    expiresIn,
                };
                return { success: true };
            }
            case 'badRequest':
            case 'timeoutError':
            case 'authError':
            case 'unknown':
                return { success: false, error: response };
        }
    }

    private ensureBearerPrepended(token: string): string {
        return !token.startsWith('bearer') && !token.startsWith('Bearer') ? `Bearer ${token}` : token;
    }
}
