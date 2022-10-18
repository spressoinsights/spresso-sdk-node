export type Auth0Response = {
    access_token: string;
    scope: string;
    expires_in: number; // in seconds
    token_type: 'Bearer';
};
