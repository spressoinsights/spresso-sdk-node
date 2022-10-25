import { expect } from 'chai';
import { HttpClientOptions } from '../src/types';

describe('HttpClientOptions', () => {
    it('Defaults All Fields', () => {
        const options = new HttpClientOptions();
        expect(options.defaultTimeoutMs).to.not.be.null;
        expect(options.defaultTimeoutMs).to.not.be.undefined;
    });

    describe('Field - defaultTimeoutMs', () => {
        it('Overrides defaultTimeout', () => {
            const randomPositiveNumber = Math.abs(Math.random());
            const options = new HttpClientOptions({ defaultTimeoutMs: randomPositiveNumber });
            expect(options.defaultTimeoutMs).to.be.eq(randomPositiveNumber);
        });

        it('Overrides defaultTimeout if invalid - undefined', () => {
            const defaultOptions = new HttpClientOptions();
            const options = new HttpClientOptions({});
            expect(options.defaultTimeoutMs).to.be.eq(defaultOptions.defaultTimeoutMs);
        });

        it('Overrides defaultTimeout if invalid - negative number', () => {
            const defaultOptions = new HttpClientOptions();
            const options = new HttpClientOptions({ defaultTimeoutMs: -111 });
            expect(options.defaultTimeoutMs).to.not.be.null;
            expect(options.defaultTimeoutMs).to.not.be.undefined;
            expect(options.defaultTimeoutMs).to.be.eq(defaultOptions.defaultTimeoutMs);
        });
    });
});
