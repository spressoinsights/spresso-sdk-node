export type GetPriceOptimizationInput = {
    userId: string;
    itemId: string;
    fallBackPrice: number;
    userAgent: string;
};

export type GetPriceOptimizationOutput = {
    userId: string;
    itemId: string;
    price: number;
};

export type GetPriceOptimizationsInput = {
    pricingRequests: {
        userId: string;
        itemId: string;
        fallBackPrice: number;
    }[];
    userAgent: string;
};

export type GetPriceOptimizationsOutput = GetPriceOptimizationOutput[];
