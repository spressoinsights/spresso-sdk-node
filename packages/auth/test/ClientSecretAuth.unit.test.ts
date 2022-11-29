import { expect } from 'chai';
import { Auth0Response, ClientSecretAuthOptions } from '../src/types/models';
import { ClientSecretAuth } from '../src/ClientSecretAuth';
import sinon from 'sinon';
import { HttpClient, HttpClientOptions } from '@spresso-sdk/http_client';
import { mapAuth0ToLocalAccessToken, shouldGetAccessToken } from '../src/ClientSecretAuthUtils';
import { LocalAccessToken } from '../src/types/models/LocalAccessToken';

describe('ClientSecretAuth', () => {
    const validAuth0Response: Auth0Response = {
        access_token: 'Bearer SomeAccessToken',
        scope: 'view',
        expires_in: 86400, // in seconds
        token_type: 'Bearer',
    };

    describe('class', () => {
        it('Saves access token correctly', async () => {
            const sandbox = sinon.createSandbox();

            const options = new ClientSecretAuthOptions({
                clientId: '2331idj3ij',
                clientSecret: 'a398nz9ju2n',
            });

            const client = new ClientSecretAuth(options);

            const httpClient = new HttpClient(new HttpClientOptions());

            const httpClientStub = sandbox.stub(httpClient, 'post').returns(
                Promise.resolve({
                    kind: 'Success',
                    value: validAuth0Response,
                })
            );

            // see if we can disable this for tests
            // eslint-disable-next-line functional/immutable-data
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            (client as any)['httpClient'] = httpClient;

            const res = await client.getAccessToken();
            expect(res.success).to.be.true;

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const localAccessToken = (client as any)['localAccessToken'] as LocalAccessToken;
            expect(localAccessToken.accessToken).to.be.eq(validAuth0Response.access_token);
        });

        it('Second getAccessToken request will use cached value', async () => {
            const sandbox = sinon.createSandbox();

            const options = new ClientSecretAuthOptions({
                clientId: '2331idj3ij',
                clientSecret: 'a398nz9ju2n',
            });

            const client = new ClientSecretAuth(options);

            const httpClient = new HttpClient(new HttpClientOptions());

            const httpClientStub = sandbox.stub(httpClient, 'post').returns(
                Promise.resolve({
                    kind: 'Success',
                    value: validAuth0Response,
                })
            );

            // see if we can disable this for tests
            // eslint-disable-next-line functional/immutable-data
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            (client as any)['httpClient'] = httpClient;

            await client.getAccessToken();
            const res = await client.getAccessToken();
            if (!res.success) throw new Error('Expected True');

            expect(httpClientStub.calledOnce).to.be.true;

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const localAccessToken = (client as any)['localAccessToken'] as LocalAccessToken;
            expect(localAccessToken.accessToken).to.be.eq(validAuth0Response.access_token);

            expect(localAccessToken.accessToken).to.be.eq(res.accessToken);
        });
    });

    describe('mapAuth0ToLocalAccessToken', () => {
        it('should calculate token expire correctly', () => {
            const auth0Response: Auth0Response = {
                access_token: 'SomeAccessToken',
                scope: 'view',
                expires_in: 86400, // in seconds
                token_type: 'Bearer',
            };

            const date = new Date('2022-12-17T03:24:00Z');
            const nextDate = new Date('2022-12-18T03:24:00Z');

            const localAccessToken = mapAuth0ToLocalAccessToken({ auth0Response, currentDate: date });

            expect(localAccessToken.expiresIn.getUTCMilliseconds()).to.be.eq(nextDate.getUTCMilliseconds());
        });

        it('should append bearer to token', () => {
            const auth0Response: Auth0Response = {
                access_token: 'SomeAccessToken',
                scope: 'view',
                expires_in: 86400, // in seconds
                token_type: 'Bearer',
            };

            const localAccessToken = mapAuth0ToLocalAccessToken({ auth0Response, currentDate: new Date() });

            expect(localAccessToken.accessToken).to.be.eq(`Bearer ${auth0Response.access_token}`);
        });

        it('should not append bearer to token if it is already prefixed', () => {
            const localAccessToken = mapAuth0ToLocalAccessToken({
                auth0Response: validAuth0Response,
                currentDate: new Date(),
            });

            expect(localAccessToken.accessToken).to.be.eq('Bearer SomeAccessToken');
        });
    });

    describe('shouldGetAccessToken', () => {
        it('should return true if input is undefined', () => {
            const date = new Date();
            const localToken = undefined;

            const res = shouldGetAccessToken({
                accessToken: localToken,
                currentDate: date,
                credentialsExpireWindowMs: 300000,
            });

            expect(res).to.be.true;
        });

        it('should return false if token is valid', () => {
            const currentDate = new Date('2022-12-18T02:49:59Z');
            const expireDate = new Date('2022-12-18T03:00:00Z');

            const localToken: LocalAccessToken = {
                accessToken: 'Bearer SomeAccessToken',
                expiresIn: expireDate,
            };

            const res = shouldGetAccessToken({
                accessToken: localToken,
                currentDate: currentDate,
                credentialsExpireWindowMs: 300000,
            });

            expect(res).to.be.false;
        });

        it('should return true if token is going to expire', () => {
            const currentDate = new Date('2022-12-18T02:55:00Z');
            const expireDate = new Date('2022-12-18T03:00:00Z');

            const localToken: LocalAccessToken = {
                accessToken: 'Bearer SomeAccessToken',
                expiresIn: expireDate,
            };

            const res = shouldGetAccessToken({
                accessToken: localToken,
                currentDate: currentDate,
                credentialsExpireWindowMs: 300000,
            });

            expect(res).to.be.true;
        });

        it('should return true if token has expired', () => {
            const currentDate = new Date('2022-12-18T05:55:01Z');
            const expireDate = new Date('2022-12-18T03:00:00Z');

            const localToken: LocalAccessToken = {
                accessToken: 'Bearer SomeAccessToken',
                expiresIn: expireDate,
            };

            const res = shouldGetAccessToken({
                accessToken: localToken,
                currentDate: currentDate,
                credentialsExpireWindowMs: 300000,
            });

            expect(res).to.be.true;
        });
    });
});
