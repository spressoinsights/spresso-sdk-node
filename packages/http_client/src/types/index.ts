export * from './models';

export type HttpResponse<T> = Ok<T> | HttpResponseError;

export type Ok<T> = {
    kind: 'Ok';
    body: T;
};

export type HttpResponseError = AuthError | BadRequestError | UnknownError | TimeoutError;

export type AuthError = {
    kind: 'AuthError';
};

export type BadRequestError = {
    kind: 'BadRequest';
};

export type UnknownError = {
    kind: 'Unknown';
};

export type TimeoutError = {
    kind: 'TimeoutError';
};
