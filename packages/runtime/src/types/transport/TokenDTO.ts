import { PasswordProtectionDTO } from "./PasswordProtectionDTO";

export interface TokenDTO {
    id: string;
    isOwn: boolean;
    createdBy: string;
    createdByDevice: string;
    content: any;
    createdAt: string;
    expiresAt: string;
    forIdentity?: string;
    passwordProtection?: PasswordProtectionDTO;
    truncatedReference: string;
    url: string;
    isEphemeral: boolean;
}
