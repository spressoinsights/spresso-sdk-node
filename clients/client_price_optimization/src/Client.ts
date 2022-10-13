import { IAuth } from '@spresso-sdk/auth';
import { HttpClientOrg } from '@spresso-sdk/http_client_org';
import { ICacheStrategy } from '@spresso-sdk/cache';
import { GetPriceOptimizationInput, GetPriceOptimizationOutput } from './commands/GetPriceOptimization';

type GetPriceOptimizationOutputClient = GetPriceOptimizationOutput & { price: number | null };

export class PriceOptimimizationClient {
    // find better way to concat urls
    //private readonly baseUrl = "https://api.spresso.com/v1";
    //private readonly baseUrl = "https://api.spresso.com/v1";
    private readonly baseUrl = 'https://public-catalog-api.cors.us-east4.staging.spresso.com/v1';

    private readonly httpClient: HttpClientOrg;

    private readonly cache: ICacheStrategy<number>;

    //constructor(options:{refreshToken: string, accessToken:string, blackListUserAgents: string[], cacheStrategy: ICacheStrategy}) {
    //constructor(options: { clientId: string; clientSecret: string }) {
    constructor(options: { authenticator: IAuth; cacheStrategy: ICacheStrategy<number> }) {
        this.httpClient = new HttpClientOrg(options.authenticator);
        this.cache = options.cacheStrategy;
    }

    public async getPriceOptimization(input: GetPriceOptimizationInput): Promise<GetPriceOptimizationOutput> {
        const url = `${this.baseUrl}/priceOptimizations`;

        // todo build/find query string utils with proper escaping and stuff
        const finalUrl = `${url}?userId=${input.userId}&itemId=${input.itemId}`;

        // try get from cache here
        const cachedPrice = await this.cache.get(finalUrl);

        if (typeof cachedPrice === 'number') {
            return {
                ...input,
                price: cachedPrice,
            };
        }

        const getPriceOptimizationOutputClient = await this.httpClient.get<{ data: GetPriceOptimizationOutputClient }>(
            finalUrl
        );

        let optimizedPrice;

        switch (getPriceOptimizationOutputClient.kind) {
            case 'ok':
                optimizedPrice = getPriceOptimizationOutputClient.body.data.price ?? input.fallBackPrice;
                await this.cache.set(finalUrl, optimizedPrice);
                return {
                    ...getPriceOptimizationOutputClient.body.data,
                    price: optimizedPrice,
                };
            case 'authError':
            case 'timeoutError':
            case 'badRequest':
            case 'unknown':
                await this.cache.set(finalUrl, input.fallBackPrice);
                return {
                    ...input,
                    price: input.fallBackPrice,
                };
        }
    }
}
