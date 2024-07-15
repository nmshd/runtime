export interface LocalAccountDTO {
    id: string;
    address?: string;
    name: string;
    realm: string;
    directory: string;
    order: number;
    lastAccessedAt?: string;
    devicePushIdentifier?: string;
}
