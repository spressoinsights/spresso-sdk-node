import { expect } from 'chai';
import { ClientSecretAuthOptions } from '../../../src/types/models';

describe('ClientSecretAuthOptions', () => {
    it('Defaults All Fields', () => {
        const options = new ClientSecretAuthOptions({
            clientId: '2331idj3ij',
            clientSecret: 'a398nz9ju2n',
        });

        expect(options.url).to.not.be.null;
        expect(options.url).to.not.be.undefined;
    });

    describe('Field - url', () => {
        it('Defaults url', () => {
            const options = new ClientSecretAuthOptions({
                clientId: '2331idj3ij',
                clientSecret: 'a398nz9ju2n',
            });

            expect(options.url).to.be.eq('https://api.spresso.com/oauth/token');
        });

        it('Overrides url', () => {
            const options = new ClientSecretAuthOptions({
                url: 'localhost:2000',
                clientId: '2331idj3ij',
                clientSecret: 'a398nz9ju2n',
            });

            expect(options.url).to.be.eq('localhost:2000');
        });

        it('Throws error if invalid url is provided', () => {
            const options = () =>
                new ClientSecretAuthOptions({
                    url: 'abc..com111',
                    clientId: '2331idj3ij',
                    clientSecret: 'a398nz9ju2n',
                });

            expect(options).throws(TypeError);
        });
    });
});
