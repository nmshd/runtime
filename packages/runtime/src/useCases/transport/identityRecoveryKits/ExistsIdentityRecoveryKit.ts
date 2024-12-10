import { Result } from "@js-soft/ts-utils";
import { DevicesController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { UseCase } from "../../common";

export interface ExistsIdentityRecoveryKitResponse {
    exists: boolean;
}

export class ExistsIdentityRecoveryKitUseCase extends UseCase<void, ExistsIdentityRecoveryKitResponse> {
    public constructor(@Inject private readonly devicesController: DevicesController) {
        super();
    }

    protected async executeInternal(): Promise<Result<ExistsIdentityRecoveryKitResponse>> {
        const devices = await this.devicesController.list();

        return Result.ok({
            exists: devices.some((device) => device.isBackupDevice)
        });
    }
}
