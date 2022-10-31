import { AuthError, BadRequestError, HttpResponse, Ok, TimeoutError, UnknownError } from '../../src/types';

type ExpectOk = <T>(response: HttpResponse<T>) => asserts response is Ok<T>;
export const expectOk: ExpectOk = (response) => {
    if (response.kind != 'Ok') {
        throw new Error(`Expected Http Status to be Ok but found ${JSON.stringify(response)}.`);
    }
};

type ExpectAuthError = <T>(response: HttpResponse<T>) => asserts response is AuthError;
export const expectAuthError: ExpectAuthError = (response) => {
    if (response.kind != 'AuthError') {
        throw new Error(`Expected Http Status to be AuthError but found ${JSON.stringify(response)}.`);
    }
};

type ExpectBadRequest = <T>(response: HttpResponse<T>) => asserts response is BadRequestError;
export const expectBadRequest: ExpectBadRequest = (response) => {
    if (response.kind != 'BadRequest') {
        throw new Error(`Expected Http Status to be BadRequest but found ${JSON.stringify(response)}.`);
    }
};

type ExpectTimeoutError = <T>(response: HttpResponse<T>) => asserts response is TimeoutError;
export const expectTimeout: ExpectTimeoutError = (response) => {
    if (response.kind != 'TimeoutError') {
        throw new Error(`Expected Http Status to be TimeoutError but found ${JSON.stringify(response)}.`);
    }
};

type ExpectUnknownError = <T>(response: HttpResponse<T>) => asserts response is UnknownError;
export const expectUnknown: ExpectUnknownError = (response) => {
    if (response.kind != 'Unknown') {
        throw new Error(`Expected Http Status to be Unknown but found ${JSON.stringify(response)}.`);
    }
};
