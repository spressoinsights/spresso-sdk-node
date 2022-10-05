import { HttpClient } from '@spresso-sdk/http_client';
import { Auth0Response } from './types/Auth0';

type LocalAccessToken = {
    accessToken: string;
    expiresIn: Date;
};

export class Authenticator {
    // can I have build flags for this?
    private readonly url = 'https://dev-369tg5rm.us.auth0.com/oauth/token';

    private readonly httpClient: HttpClient;
    private readonly clientId: string;
    private readonly clientSecret: string;

    private localAccessToken: LocalAccessToken | undefined;

    // Have a 5 minutes window to refresh the token before it expires.
    private readonly credentialsExpireWindowInMilliSeconds = 300000;

    constructor(options: { clientId: string; clientSecret: string }) {
        this.httpClient = new HttpClient();
        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
    }

    public async getAccessToken(): Promise<string> {
        if (
            this.localAccessToken == undefined ||
            this.localAccessToken.expiresIn.getTime() - Date.now() <= this.credentialsExpireWindowInMilliSeconds
        ) {
            await this.getAndSaveAccessTokenLocally();
        }

        const token = this.localAccessToken as LocalAccessToken;

        return token.accessToken;
    }

    private async getAndSaveAccessTokenLocally(): Promise<void> {
        const input = {
            client_id: this.clientId,
            client_secret: this.clientSecret,
            audience: 'https://spresso-api',
            grant_type: 'client_credentials',
        };

        const response = (await this.httpClient.post(this.url, {}, input)).body as Auth0Response;

        const dateTimeNow = new Date();
        const expiresIn = new Date(dateTimeNow.setSeconds(dateTimeNow.getSeconds() + response.expires_in));

        // eslint-disable-next-line functional/immutable-data
        this.localAccessToken = {
            accessToken: this.ensureBearerPrepended(response.access_token),
            expiresIn,
        };
    }

    private ensureBearerPrepended(token: string): string {
        return !token.startsWith('bearer') && !token.startsWith('Bearer') ? `Bearer ${token}` : token;
    }
}
