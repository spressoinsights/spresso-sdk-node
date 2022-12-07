import { expect } from 'chai';
import { JSONStringifyOrderedKeys } from '../../src/json';

describe('JSON', () => {
    it('should order keys', () => {
        const obj = {
            z: 2,
            y: 'abc',
            e: 12,
        };
        expect(JSONStringifyOrderedKeys(obj)).to.be.eq('{"e":12,"y":"abc","z":2}');
    });
});
