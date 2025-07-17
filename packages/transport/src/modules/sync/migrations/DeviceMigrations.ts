import { AccountController } from "../../accounts/AccountController";

export class DeviceMigrations {
    public constructor(private readonly _accountController: AccountController) {}

    public async v1(): Promise<void> {
        // noop
    }
}
