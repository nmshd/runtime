import { ApplicationError, Result } from "@js-soft/ts-utils";
import { NotificationsController } from "@nmshd/consumption";
import { Inject } from "@nmshd/typescript-ioc";
import { UseCase } from "../../common/index.js";

export class ProcessOpenNotifactionsReceivedByCurrentDeviceUseCase extends UseCase<void, void> {
    public constructor(@Inject private readonly notificationsController: NotificationsController) {
        super();
    }

    protected async executeInternal(): Promise<Result<void, ApplicationError>> {
        await this.notificationsController.processOpenNotifactionsReceivedByCurrentDevice();

        return Result.ok(undefined);
    }
}
