import { Result } from "@js-soft/ts-utils";
import { DeviceController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { UseCase } from "../../common";

export interface SetCommunicationLanguageRequest {
    communicationLanguage: string;
}

export class SetCommunicationLanguageUseCase extends UseCase<SetCommunicationLanguageRequest, void> {
    public constructor(
        @Inject private readonly deviceController: DeviceController
        // @Inject validator: Validator
    ) {
        super();
    }

    protected async executeInternal(request: SetCommunicationLanguageRequest): Promise<Result<void>> {
        await this.deviceController.setCommunicationLanguage(request.communicationLanguage);

        return Result.ok(undefined);
    }
}
