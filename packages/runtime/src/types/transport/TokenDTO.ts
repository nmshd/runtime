export interface TokenDTO {
    id: string;
    createdBy: string;
    createdByDevice: string;
    content: any;
    createdAt: string;
    expiresAt: string;
    forIdentity?: string;
    passwordProtection?: {
        password: string;
        passwordIsPin?: true;
    };
    truncatedReference: string;
    isEphemeral: boolean;
}
