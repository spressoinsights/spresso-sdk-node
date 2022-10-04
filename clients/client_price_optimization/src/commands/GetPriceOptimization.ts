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
