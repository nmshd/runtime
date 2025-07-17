import { AccountController } from "../../accounts/AccountController";

export class DeviceMigrations {
    public constructor(private readonly accountController: AccountController) {}

    public async v1(): Promise<void> {
        // this migration is no longer needed
    }
}
