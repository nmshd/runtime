import { PasswordLocationIndicator } from "../../useCases/common";

export interface PasswordProtectionDTO {
    password: string;
    passwordIsPin?: true;
    passwordLocationIndicator?: PasswordLocationIndicator;
}
