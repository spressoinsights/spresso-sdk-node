type ClientSecretAuthOptionsInputType = {
    url?: string;
    clientId: string;
    clientSecret: string;
};

export class ClientSecretAuthOptions {
    public readonly credentialsExpireWindowMs = 300000;

    public readonly url: string;
    public readonly clientId: string;
    public readonly clientSecret: string;

    constructor(options: ClientSecretAuthOptionsInputType) {
        this.url = this.sanitizeUrl(options);
        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
    }

    private sanitizeUrl(options: ClientSecretAuthOptionsInputType): string {
        if (options.url != undefined) {
            // Throws type error
            return new URL(options.url).href;
        } else {
            return 'https://api.spresso.com/oauth/token';
        }
    }
}
