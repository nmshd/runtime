import { PasswordLocationIndicator } from "@nmshd/core-types";

export interface PasswordProtectionDTO {
    password: string;
    passwordIsPin?: true;
    passwordLocationIndicator?: PasswordLocationIndicator;
}
