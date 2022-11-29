import { TimeoutError, UnknownError } from '@spresso-sdk/http_client';
import { PriceOptimization } from '../models';

export type GetPriceOptimizationInput = {
    userId: string | null;
    deviceId: string;
    itemId: string;
    defaultPrice: number;
    overrideToDefaultPrice: boolean;
    userAgent: string;
};

export type GetPriceOptimizationsInput = {
    items: {
        userId: string | null;
        deviceId: string;
        itemId: string;
        defaultPrice: number;
        overrideToDefaultPrice: boolean;
    }[];
    userAgent: string;
};

export type GetPriceOptimizationOutput = { kind: 'Success'; value: PriceOptimization } | TimeoutError | UnknownError;

export type GetPriceOptimizationsOutput = { kind: 'Success'; value: PriceOptimization[] } | TimeoutError | UnknownError;

// API Output with potential Errors
export type GetPriceOptimizationClientOutput =
    | { kind: 'Success'; value: GetPriceOptimizationClientOutputData }
    | TimeoutError
    | UnknownError;

export type GetPriceOptimizationsClientOutput =
    | { kind: 'Success'; value: GetPriceOptimizationsClientOutputData }
    | TimeoutError
    | UnknownError;

// API Output
export type GetPriceOptimizationClientOutputData = PriceOptimization & { ttlMs: number };
export type GetPriceOptimizationsClientOutputData = GetPriceOptimizationClientOutputData[];
