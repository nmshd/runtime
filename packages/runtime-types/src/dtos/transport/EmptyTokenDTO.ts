export interface EmptyTokenDTO {
    id: string;
    expiresAt: string;
    reference: {
        truncated: string;
        url: string;
    };
}
