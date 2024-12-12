import { Result } from "@js-soft/ts-utils";
import { DevicesController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { UseCase } from "../../common";

export interface DoesIdentityRecoveryKitExistResponse {
    exists: boolean;
}

export class DoesIdentityRecoveryKitExistUseCase extends UseCase<void, DoesIdentityRecoveryKitExistResponse> {
    public constructor(@Inject private readonly devicesController: DevicesController) {
        super();
    }

    protected async executeInternal(): Promise<Result<DoesIdentityRecoveryKitExistResponse>> {
        const devices = await this.devicesController.list();

        return Result.ok({
            exists: devices.some((device) => device.isBackupDevice)
        });
    }
}
