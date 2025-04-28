import { PasswordLocationIndicator } from "@nmshd/transport";

export interface PasswordProtectionDTO {
    password: string;
    passwordIsPin?: true;
    passwordLocationIndicator?: PasswordLocationIndicator;
}
