import { Result } from "@js-soft/ts-utils";
import { DevicesController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { UseCase } from "../../common/index.js";

export interface CheckForExistingIdentityRecoveryKitResponse {
    exists: boolean;
}

export class CheckForExistingIdentityRecoveryKitUseCase extends UseCase<void, CheckForExistingIdentityRecoveryKitResponse> {
    public constructor(@Inject private readonly devicesController: DevicesController) {
        super();
    }

    protected async executeInternal(): Promise<Result<CheckForExistingIdentityRecoveryKitResponse>> {
        const devices = await this.devicesController.list();

        return Result.ok({
            exists: devices.some((device) => device.isBackupDevice)
        });
    }
}
