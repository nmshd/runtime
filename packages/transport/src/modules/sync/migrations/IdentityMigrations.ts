import { AccountController } from "../../accounts/AccountController.js";

export class IdentityMigrations {
    public constructor(private readonly accountController: AccountController) {}

    public v1(): Promise<void> {
        // no upgrade steps necessary for v1
        return Promise.resolve();
    }
}
