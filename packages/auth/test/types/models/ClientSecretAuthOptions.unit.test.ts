import { expect } from 'chai';
import { ClientSecretAuthOptions } from '../../../src/types/models';

describe('HttpClientOptions', () => {
    it('Defaults All Fields', () => {
        const options = new ClientSecretAuthOptions({
            auth: {
                clientId: '2331idj3ij',
                clientSecret: 'a398nz9ju2n',
            },
        });

        expect(options.auth.url).to.not.be.null;
        expect(options.auth.url).to.not.be.undefined;
    });

    describe('Field - url', () => {
        it('Defaults url', () => {
            const options = new ClientSecretAuthOptions({
                auth: {
                    clientId: '2331idj3ij',
                    clientSecret: 'a398nz9ju2n',
                },
            });

            expect(options.auth.url).to.be.eq('https://api.spresso.com/oauth/token');
        });

        it('Overrides url', () => {
            const options = new ClientSecretAuthOptions({
                auth: {
                    url: 'localhost:2000',
                    clientId: '2331idj3ij',
                    clientSecret: 'a398nz9ju2n',
                },
            });

            expect(options.auth.url).to.be.eq('localhost:2000');
        });

        it('Throws error if invalid url is provided', () => {
            const options = () =>
                new ClientSecretAuthOptions({
                    auth: {
                        url: 'abc..com111',
                        clientId: '2331idj3ij',
                        clientSecret: 'a398nz9ju2n',
                    },
                });

            expect(options).throws(TypeError);
        });
    });
});
