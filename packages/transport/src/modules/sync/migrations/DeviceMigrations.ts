import { AccountController } from "../../accounts/AccountController.js";

export class DeviceMigrations {
    public constructor(private readonly _accountController: AccountController) {}

    public v1(): Promise<void> {
        // no upgrade steps necessary for v1
        return Promise.resolve();
    }
}
