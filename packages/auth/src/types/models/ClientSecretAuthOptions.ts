type ClientSecretAuthOptionsInputType = {
    baseUrl?: string;
    clientId: string;
    clientSecret: string;
};

export class ClientSecretAuthOptions {
    public readonly credentialsExpireWindowMs = 300000;

    public readonly baseUrl: string;
    public readonly clientId: string;
    public readonly clientSecret: string;

    constructor(options: ClientSecretAuthOptionsInputType) {
        this.baseUrl = this.sanitizeUrl(options);
        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
    }

    private sanitizeUrl(options: ClientSecretAuthOptionsInputType): string {
        if (options.baseUrl != undefined) {
            // Throws type error
            new URL(options.baseUrl);
            return options.baseUrl;
        } else {
            return 'https://api.spresso.com';
        }
    }
}
