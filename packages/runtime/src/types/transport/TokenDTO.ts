export interface TokenDTO {
    id: string;
    createdBy: string;
    createdByDevice: string;
    content: any;
    createdAt: string;
    expiresAt: string;
    secretKey: string;
    forIdentity?: string;
    truncatedReference: string;
    isEphemeral: boolean;
}
