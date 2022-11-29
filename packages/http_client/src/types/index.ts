export * from './models';

export type HttpResponse<T> = Success<T> | HttpResponseError;

export type Success<T> = {
    kind: 'Success';
    value: T;
};

export type HttpResponseError = AuthError | BadRequestError | UnknownError | TimeoutError;

export type AuthError = {
    kind: 'AuthError';
};

export type BadRequestError = {
    kind: 'BadRequest';
};

export type TimeoutError = {
    kind: 'TimeoutError';
};

export type UnknownError = {
    kind: 'Unknown';
};
