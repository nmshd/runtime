import { PasswordProtectionDTO } from "./PasswordProtectionDTO.js";

export interface EmptyTokenDTO {
    id: string;
    expiresAt: string;
    passwordProtection: PasswordProtectionDTO;
    reference: {
        truncated: string;
        url: string;
    };
}
