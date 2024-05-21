export interface LocalAccountDTO {
    id: string;
    address?: string;
    name: string;
    directory: string;
    order: number;
    lastAccessedAt?: string;
}
