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
    isEphemeral: boolean;
    truncatedReference: string;
    url: string;
}
