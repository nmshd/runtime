import { Result } from "@js-soft/ts-utils";
import { LanguageISO639 } from "@nmshd/content";
import { DeviceController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RuntimeErrors, UseCase } from "../../common";

export interface SetCommunicationLanguageRequest {
    communicationLanguage: string;
}

export class SetCommunicationLanguageUseCase extends UseCase<SetCommunicationLanguageRequest, void> {
    public constructor(@Inject private readonly deviceController: DeviceController) {
        super();
    }

    protected async executeInternal(request: SetCommunicationLanguageRequest): Promise<Result<void>> {
        if (request.communicationLanguage in LanguageISO639) {
            await this.deviceController.setCommunicationLanguage(request.communicationLanguage);

            return Result.ok(undefined);
        }

        return Result.fail(RuntimeErrors.devices.communicationLanguageNotISO639(request.communicationLanguage));
    }
}
