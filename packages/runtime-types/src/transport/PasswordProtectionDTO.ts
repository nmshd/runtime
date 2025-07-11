import { PasswordLocationIndicatorOptions } from "@nmshd/core-types";

export interface PasswordProtectionDTO {
    password: string;
    passwordIsPin?: true;
    passwordLocationIndicator?: keyof typeof PasswordLocationIndicatorOptions | number;
}
