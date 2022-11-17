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

export type GetPriceOptimizationOutput = { kind: 'Ok'; ok: PriceOptimization } | TimeoutError | UnknownError;

export type GetPriceOptimizationsOutput = { kind: 'Ok'; ok: PriceOptimization[] } | TimeoutError | UnknownError;

// API Output with potential Errors
export type GetPriceOptimizationClientOutput =
    | { kind: 'Ok'; ok: GetPriceOptimizationClientOutputData }
    | TimeoutError
    | UnknownError;

export type GetPriceOptimizationsClientOutput =
    | { kind: 'Ok'; ok: GetPriceOptimizationsClientOutputData }
    | TimeoutError
    | UnknownError;

// API Output
export type GetPriceOptimizationClientOutputData = PriceOptimization & { ttlMs: number };
export type GetPriceOptimizationsClientOutputData = GetPriceOptimizationClientOutputData[];
