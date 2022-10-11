import { Authenticator, IAuth } from '@spresso-sdk/auth';
import { HttpClientOrg } from '@spresso-sdk/http_client_org';
import { GetPriceOptimizationInput, GetPriceOptimizationOutput } from './commands/GetPriceOptimization';

type GetPriceOptimizationOutputClient = GetPriceOptimizationOutput & { price: number | null };

export class PriceOptimimizationClient {
    // find better way to concat urls
    //private readonly baseUrl = "https://api.spresso.com/v1";
    //private readonly baseUrl = "https://api.spresso.com/v1";
    private readonly baseUrl = 'https://public-catalog-api.us-east4.staging.spresso.com/v1';

    private readonly httpClient: HttpClientOrg;

    //constructor(options:{refreshToken: string, accessToken:string, blackListUserAgents: string[], cacheStrategy: ICacheStrategy}) {
    //constructor(options: { clientId: string; clientSecret: string }) {
    constructor(options: { authenticator: IAuth }) {
        this.httpClient = new HttpClientOrg(options.authenticator);
    }

    public async getPriceOptimization(input: GetPriceOptimizationInput): Promise<GetPriceOptimizationOutput> {
        const url = `${this.baseUrl}/priceOptimizations`;

        // todo build/find query string utils with proper escaping and stuff
        const finalUrl = `${url}?userId=${input.userId}&itemId=${input.itemId}`;

        // try get from cache here

        const getPriceOptimizationOutputClient = await this.httpClient.get<{ data: GetPriceOptimizationOutputClient }>(
            finalUrl
        );

        switch (getPriceOptimizationOutputClient.kind) {
            case 'ok':
                return {
                    ...getPriceOptimizationOutputClient.body.data,
                    price: getPriceOptimizationOutputClient.body.data.price ?? input.fallBackPrice,
                };
            case 'authError':
            case 'timeoutError':
            case 'badRequest':
            case 'unknown':
                return {
                    ...input,
                    price: input.fallBackPrice,
                };
        }
    }
}
