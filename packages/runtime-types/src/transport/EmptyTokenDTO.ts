import { PasswordProtectionDTO } from "./PasswordProtectionDTO";

export interface EmptyTokenDTO {
    id: string;
    expiresAt: string;
    passwordProtection: PasswordProtectionDTO;
    reference: {
        truncated: string;
        url: string;
    };
    isEphemeral: boolean;
}
