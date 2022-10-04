import { ICacheStrategy } from '@spresso-sdk/cache';

// Just an example
// Should probably be a lru with some ttl checks. Dont see the memory footprint being anything we really need to worry about tho for the short term.

export class InMemory<T> implements ICacheStrategy<T> {
    private readonly map: Map<string, T>;

    constructor() {
        this.map = new Map<string, T>();
    }

    async get(key: string): Promise<T | undefined> {
        return Promise.resolve(this.map.get(key));
    }

    async set(key: string, value: T, ttl: number): Promise<void> {
        this.map.set(key, value);
        return Promise.resolve();
    }

    async delete(key: string): Promise<void> {
        this.map.delete(key);
        return Promise.resolve();
    }
}
