import { Result } from "@js-soft/ts-utils";
import { LanguageISO639 } from "@nmshd/core-types";
import { DeviceController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface SetCommunicationLanguageRequest {
    communicationLanguage: LanguageISO639;
}

class Validator extends SchemaValidator<SetCommunicationLanguageRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("SetCommunicationLanguageRequest"));
    }
}

export class SetCommunicationLanguageUseCase extends UseCase<SetCommunicationLanguageRequest, void> {
    public constructor(
        @Inject private readonly deviceController: DeviceController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: SetCommunicationLanguageRequest): Promise<Result<void>> {
        await this.deviceController.setCommunicationLanguage(request.communicationLanguage);

        return Result.ok(undefined);
    }
}
