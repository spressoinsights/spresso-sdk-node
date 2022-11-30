export function assertString(str: string | null | undefined): asserts str is string {
    if (str == null || str == undefined) {
        throw new Error('Env Var is null');
    }
}
