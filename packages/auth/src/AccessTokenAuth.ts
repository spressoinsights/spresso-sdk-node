import { HttpResponseError } from '@spressoinsights/http_client';
import { IAuth } from './IAuth';

export class Authenticator implements IAuth {
    private readonly accessToken: string;
    constructor(options: { accessToken: string }) {
        this.accessToken = options.accessToken;
    }

    public async getAccessToken(): Promise<
        { success: true; accessToken: string } | { success: false; error: HttpResponseError }
    > {
        return Promise.resolve({ success: true, accessToken: this.accessToken });
    }
}
