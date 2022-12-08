import { HttpClient, HttpClientOptions, HttpResponse } from '@spressoinsights/http_client';
import { IAuth } from '@spressoinsights/auth';

export class HttpClientOrg {
    private readonly client: HttpClient;

    constructor(private readonly authenticator: IAuth, private readonly options: HttpClientOptions) {
        this.client = new HttpClient(options);
    }

    public async get<T>(getInput: { url: string }): Promise<HttpResponse<T>> {
        const { logger } = this.options;
        logger.debug({ msg: 'Getting accessToken.' });

        const accessToken = await this.authenticator.getAccessToken();
        if (!accessToken.success) {
            logger.warn({ msg: 'Failed to get accessToken for GET.', err: accessToken.error });
            return accessToken.error;
        }

        return this.client.get({ url: getInput.url, headers: { authorization: accessToken.accessToken } });
    }

    public async post<T>(postInput: { url: string; body: Record<string, unknown> }): Promise<HttpResponse<T>> {
        const { logger } = this.options;
        logger.debug({ msg: 'Getting accessToken.' });

        const accessToken = await this.authenticator.getAccessToken();
        if (!accessToken.success) {
            logger.warn({ msg: 'Failed to get accessToken for POST.', err: accessToken.error });
            return accessToken.error;
        }

        return this.client.post({
            url: postInput.url,
            headers: { authorization: accessToken.accessToken },
            body: postInput.body,
        });
    }
}
