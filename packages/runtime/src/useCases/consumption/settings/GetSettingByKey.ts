import { Result } from "@js-soft/ts-utils";
import { Setting, SettingsController, SettingScope } from "@nmshd/consumption";
import { SettingDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { SettingMapper } from "./SettingMapper";

export interface GetSettingByKeyRequest {
    key: string;
    reference?: string;
    scope?: "Identity" | "Device" | "Relationship";
}

class Validator extends SchemaValidator<GetSettingByKeyRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetSettingByKeyRequest"));
    }
}

export class GetSettingByKeyUseCase extends UseCase<GetSettingByKeyRequest, SettingDTO> {
    public constructor(
        @Inject private readonly settingController: SettingsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetSettingByKeyRequest): Promise<Result<SettingDTO>> {
        const query = {
            key: request.key,
            reference: request.reference ?? { $exists: false },
            scope: request.scope ?? SettingScope.Identity
        };

        const settings = await this.settingController.getSettings(query);
        if (settings.length === 0) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Setting));
        }

        const setting = settings.reduce((prev, current) => (prev.createdAt > current.createdAt ? prev : current));
        return Result.ok(SettingMapper.toSettingDTO(setting));
    }
}
