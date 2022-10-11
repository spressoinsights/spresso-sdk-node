export type HttpResponse<T> = Ok<T> | HttpResponseError;

export type Ok<T> = {
    kind: 'ok';
    body: T;
};

export type HttpResponseError = AuthError | BadRequestError | UnknownError | TimeoutError;

export type AuthError = {
    kind: 'authError';
};

export type BadRequestError = {
    kind: 'badRequest';
};

export type UnknownError = {
    kind: 'unknown';
};

export type TimeoutError = {
    kind: 'timeoutError';
};
