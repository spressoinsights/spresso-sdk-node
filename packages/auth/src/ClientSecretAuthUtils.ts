import { Auth0Response } from './types/models';
import { LocalAccessToken } from './types/models/LocalAccessToken';

export function shouldGetAccessToken(input: {
    accessToken: LocalAccessToken | undefined;
    currentDate: Date;
    credentialsExpireWindowMs: number;
}): boolean {
    const { accessToken, currentDate, credentialsExpireWindowMs } = input;

    const firstTimeGettingToken = accessToken == undefined;
    const existingTokenExpired =
        accessToken != undefined &&
        accessToken.expiresIn.valueOf() - currentDate.valueOf() <= credentialsExpireWindowMs;

    return firstTimeGettingToken || existingTokenExpired;
}

export function ensureBearerPrepended(token: string): string {
    return !token.startsWith('bearer') && !token.startsWith('Bearer') ? `Bearer ${token}` : token;
}

export function mapAuth0ToLocalAccessToken(input: {
    auth0Response: Auth0Response;
    currentDate: Date;
}): LocalAccessToken {
    const { auth0Response, currentDate } = input;
    const expiresIn = new Date(currentDate.setSeconds(currentDate.getSeconds() + auth0Response.expires_in));

    return {
        accessToken: ensureBearerPrepended(auth0Response.access_token),
        expiresIn,
    };
}
