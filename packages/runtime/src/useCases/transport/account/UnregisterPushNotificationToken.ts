import { Result } from "@js-soft/ts-utils";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { UseCase } from "../../common";

export class UnregisterPushNotificationTokenUseCase extends UseCase<void, void> {
    public constructor(@Inject private readonly accountController: AccountController) {
        super();
    }

    protected async executeInternal(): Promise<Result<void>> {
        await this.accountController.unregisterPushNotificationToken();

        return Result.ok(undefined);
    }
}
