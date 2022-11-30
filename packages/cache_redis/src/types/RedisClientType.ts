export type RedisClient = {
    get(key: string): Promise<string | null>;
    mGet(keys: string[]): Promise<(string | null)[]>;
    set(key: string, value: string, options: { PX: number }): Promise<any>;
    del(key: string): Promise<number>;
};
