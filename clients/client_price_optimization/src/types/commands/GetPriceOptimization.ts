import { TimeoutError, UnknownError } from '@spresso-sdk/http_client';
import { PriceOptimization } from '../models';

export type GetPriceOptimizationInput = {
    userId: string;
    itemId: string;
    fallBackPrice: number;
    userAgent: string;
};

export type GetPriceOptimizationOutput = { kind: 'Ok'; ok: PriceOptimization } | TimeoutError | UnknownError;

export type GetPriceOptimizationsInput = {
    pricingRequests: {
        userId: string;
        itemId: string;
        fallBackPrice: number;
    }[];
    userAgent: string;
};

export type GetPriceOptimizationsOutput = { kind: 'Ok'; ok: PriceOptimization[] } | TimeoutError | UnknownError;

export type GetPriceOptimizationOutputClient = Omit<PriceOptimization, 'price'> & { price: number | null };
export type GetPriceOptimizationsOutputClient = GetPriceOptimizationOutputClient[];
