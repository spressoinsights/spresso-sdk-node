import { ICacheStrategy } from '@spresso-sdk/cache';

export class CacheLocalStorage implements ICacheStrategy<number> {
    private readonly localStorageAvailable: boolean;
    private readonly defaultTtl: number = Date.now() + 24 * 60 * 60 * 1000;

    constructor() {
        this.localStorageAvailable = 'localStorage' in self;
        if (!this.localStorageAvailable) {
            console.error('Spresso SDK: `localStorage` is not available. Please choose a different cache strategy.');
        }
    }

    async get(key: string): Promise<number | undefined> {
        let value: number | undefined;

        if (!this.localStorageAvailable) {
            return Promise.resolve(value);
        }

        try {
            const cachedString = localStorage.getItem(key) ?? '{}';
            const cachedObject = JSON.parse(cachedString);

            if (cachedObject?.ttl - Date.now() > 0) {
                value = cachedObject?.value;
            }
        } catch (error) {
            // clear cache if JSON is malformed
            console.error('Spresso SDK:', error);
            await this.delete(key);
        }

        return Promise.resolve(value);
    }

    async set(key: string, value: number, ttl?: number): Promise<void> {
        if (!this.localStorageAvailable) {
            return Promise.resolve();
        }

        try {
            const stringToCache = JSON.stringify({ value, ttl: ttl ?? this.defaultTtl });
            localStorage.setItem(key, stringToCache);
        } catch (error) {
            console.error('Spresso SDK:', error);
        }

        return Promise.resolve();
    }

    async delete(key: string): Promise<void> {
        if (!this.localStorageAvailable) {
            return Promise.resolve();
        }

        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Spresso SDK:', error);
        }

        return Promise.resolve();
    }
}
