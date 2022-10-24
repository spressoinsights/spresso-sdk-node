import { expect } from 'chai';
import { HttpClient } from '../src/HttpClient';
import { HttpClientOptions } from '../src/types';
import nock from 'nock';
import { expectOk, expectAuthError, expectBadRequest, expectTimeout, expectUnknown } from './utils/assert';

describe('HttpClient', () => {
    describe('GET', () => {
        it('200 - Ok', async () => {
            const payload = { data: { s: 'Some Response' } };

            const scope = nock('http://localhost').get('/test').reply(200, payload);

            const httpClient = new HttpClient(new HttpClientOptions());

            const res = await httpClient.get<{ data: { s: string } }>({ url: 'http://localhost/test' });

            expectOk(res);

            expect(res.body).to.deep.eq(payload);

            scope.done();
        });

        it('300 - Unknown', async () => {
            const scope = nock('http://localhost').get('/test').reply(300);

            const httpClient = new HttpClient(new HttpClientOptions());

            const res = await httpClient.get({ url: 'http://localhost/test' });

            expectUnknown(res);

            scope.done();
        });

        it('400 - BadRequest', async () => {
            const scope = nock('http://localhost').get('/test').reply(400);

            const httpClient = new HttpClient(new HttpClientOptions());

            const res = await httpClient.get({ url: 'http://localhost/test' });

            expectBadRequest(res);

            scope.done();
        });

        it('401 - AuthError', async () => {
            const scope = nock('http://localhost').get('/test').reply(401);

            const httpClient = new HttpClient(new HttpClientOptions());

            const res = await httpClient.get({ url: 'http://localhost/test' });

            expectAuthError(res);

            scope.done();
        });

        it('403 - AuthError', async () => {
            const scope = nock('http://localhost').get('/test').reply(403);

            const httpClient = new HttpClient(new HttpClientOptions());

            const res = await httpClient.get({ url: 'http://localhost/test' });

            expectAuthError(res);

            scope.done();
        });

        it('500 - Unknown', async () => {
            const scope = nock('http://localhost').get('/test').reply(500);

            const httpClient = new HttpClient(new HttpClientOptions());

            const res = await httpClient.get({ url: 'http://localhost/test' });

            expectUnknown(res);

            scope.done();
        });

        it('Timeout Error', async () => {
            const payload = { data: { s: 'Some Response' } };

            const scope = nock('http://localhost').get('/test').delay(50).reply(200, payload);

            const httpClient = new HttpClient(new HttpClientOptions());

            const res = await httpClient.get<{ data: { s: string } }>({
                url: 'http://localhost/test',
                options: { timeoutMs: 10 },
            });

            expectTimeout(res);

            scope.done();
        });
    });

    describe('POST', () => {
        it('200 - Ok', async () => {
            const payload = { data: { s: 'Some Response' } };

            const scope = nock('http://localhost').post('/test').reply(200, payload);

            const httpClient = new HttpClient(new HttpClientOptions());

            const res = await httpClient.post<{ data: { s: string } }>({
                url: 'http://localhost/test',
                body: { somePayload: 'Some Payload' },
            });

            expectOk(res);

            expect(res.body).to.deep.eq(payload);

            scope.done();
        });

        it('300 - Unknown', async () => {
            const scope = nock('http://localhost').post('/test').reply(300);

            const httpClient = new HttpClient(new HttpClientOptions());

            const res = await httpClient.post({ url: 'http://localhost/test', body: { somePayload: 'Some Payload' } });

            expectUnknown(res);

            scope.done();
        });

        it('400 - BadRequest', async () => {
            const scope = nock('http://localhost').post('/test').reply(400);

            const httpClient = new HttpClient(new HttpClientOptions());

            const res = await httpClient.post({ url: 'http://localhost/test', body: { somePayload: 'Some Payload' } });

            expectBadRequest(res);

            scope.done();
        });

        it('401 - AuthError', async () => {
            const scope = nock('http://localhost').post('/test').reply(401);

            const httpClient = new HttpClient(new HttpClientOptions());

            const res = await httpClient.post({ url: 'http://localhost/test', body: { somePayload: 'Some Payload' } });

            expectAuthError(res);

            scope.done();
        });

        it('403 - AuthError', async () => {
            const scope = nock('http://localhost').post('/test').reply(403);

            const httpClient = new HttpClient(new HttpClientOptions());

            const res = await httpClient.post({ url: 'http://localhost/test', body: { somePayload: 'Some Payload' } });

            expectAuthError(res);

            scope.done();
        });

        it('500 - Unknown', async () => {
            const scope = nock('http://localhost').post('/test').reply(500);

            const httpClient = new HttpClient(new HttpClientOptions());

            const res = await httpClient.post({ url: 'http://localhost/test', body: { somePayload: 'Some Payload' } });

            expectUnknown(res);

            scope.done();
        });

        it('Timeout Error', async () => {
            const payload = { data: { s: 'Some Response' } };

            const scope = nock('http://localhost').post('/test').delay(50).reply(200, payload);

            const httpClient = new HttpClient(new HttpClientOptions());

            const res = await httpClient.post({
                url: 'http://localhost/test',
                body: { somePayload: 'Some Payload' },
                options: { timeoutMs: 10 },
            });

            expectTimeout(res);

            scope.done();
        });
    });
});
