import { HttpClient } from '@spresso-sdk/http_client';

type ClientSecretAuthOptionsInputType = {
    httpClient?: HttpClient;

    auth: {
        url?: string;
        clientId: string;
        clientSecret: string;
    };
};

type ClientSecretAuthOptionsOutputType = Required<ClientSecretAuthOptionsInputType> & {
    auth: Required<ClientSecretAuthOptionsInputType['auth']>;
};

export class ClientSecretAuthOptions {
    public readonly credentialsExpireWindowMs = 300000;

    public readonly auth: ClientSecretAuthOptionsOutputType['auth'];

    constructor(options: ClientSecretAuthOptionsInputType) {
        this.auth = this.sanitizeAuth(options);
    }

    private sanitizeAuth(options: ClientSecretAuthOptionsInputType): ClientSecretAuthOptionsOutputType['auth'] {
        const authDefaults = { url: 'https://api.spresso.com/oauth/token' };

        const auth = { ...authDefaults, ...options.auth };

        // Throws type error
        return { ...auth, url: new URL(auth.url).href };
    }
}
