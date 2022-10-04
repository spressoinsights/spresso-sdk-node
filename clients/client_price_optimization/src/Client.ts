import { Authenticator } from '@spresso-sdk/auth';
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
    constructor(options: { clientId: string; clientSecret: string }) {
        this.httpClient = new HttpClientOrg(new Authenticator(options));
    }

    public async getPriceOptimization(input: GetPriceOptimizationInput): Promise<GetPriceOptimizationOutput> {
        const url = `${this.baseUrl}/priceOptimizations`;

        // todo build/find query string utils with proper escaping and stuff
        const finalUrl = `${url}?userId=${input.userId}&itemId=${input.itemId}`;

        // try get from cache here
        const response = await this.httpClient.get(finalUrl);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const getPriceOptimizationOutputClient = response.body['data'] as GetPriceOptimizationOutputClient;

        return {
            ...getPriceOptimizationOutputClient,
            price: getPriceOptimizationOutputClient.price ?? input.fallBackPrice,
        };

        // add to cache here
    }
}
