import { Result } from "@js-soft/ts-utils";
import { Setting, SettingsController } from "@nmshd/consumption";
import { CoreId } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { SettingDTO } from "../../../types";
import { LocalSettingIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { SettingMapper } from "./SettingMapper";

export interface GetSettingRequest {
    id: LocalSettingIdString;
}

class Validator extends SchemaValidator<GetSettingRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetSettingRequest"));
    }
}

export class GetSettingUseCase extends UseCase<GetSettingRequest, SettingDTO> {
    public constructor(
        @Inject private readonly settingController: SettingsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetSettingRequest): Promise<Result<SettingDTO>> {
        const setting = await this.settingController.getSetting(CoreId.from(request.id));
        if (!setting) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Setting));
        }

        return Result.ok(SettingMapper.toSettingDTO(setting));
    }
}
