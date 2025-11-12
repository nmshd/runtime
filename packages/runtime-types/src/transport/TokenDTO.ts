import { PasswordProtectionDTO } from "./PasswordProtectionDTO.js";

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
    reference: {
        truncated: string;
        url: string;
    };
    isEphemeral: boolean;
}
