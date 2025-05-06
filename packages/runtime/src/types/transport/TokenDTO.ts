import { PasswordProtectionDTO } from "./PasswordProtectionDTO";

export type TokenDTO = {
    id: string;
    createdBy: string;
    createdByDevice: string;
    content: any;
    createdAt: string;
    expiresAt: string;
    forIdentity?: string;
    passwordProtection?: PasswordProtectionDTO;
    isEphemeral: boolean;
} & (
    | {
          isOwn: true;
          truncatedReference: string;
          url: string;
      }
    | {
          isOwn: false;
          truncatedReference: undefined;
          url: undefined;
      }
);
