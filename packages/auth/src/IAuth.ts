import { HttpResponseError } from '@spresso-sdk/http_client';

export interface IAuth {
    getAccessToken(): Promise<{ success: true; accessToken: string } | { success: false; error: HttpResponseError }>;
}
