import { Serializable } from "@js-soft/ts-serval";
import { Result } from "@js-soft/ts-utils";
import { Setting, SettingsController } from "@nmshd/consumption";
import { AccountController, CoreId } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { SettingDTO } from "../../../types";
import { LocalSettingIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { SettingMapper } from "./SettingMapper";

export interface UpdateSettingRequest {
    id: LocalSettingIdString;
    value: any;
}

class Validator extends SchemaValidator<UpdateSettingRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("UpdateSettingRequest"));
    }
}

export class UpdateSettingUseCase extends UseCase<UpdateSettingRequest, SettingDTO> {
    public constructor(
        @Inject private readonly settingController: SettingsController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: UpdateSettingRequest): Promise<Result<SettingDTO>> {
        const setting = await this.settingController.getSetting(CoreId.from(request.id));
        if (!setting) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Setting));
        }

        setting.value = Serializable.fromUnknown(request.value);
        await this.settingController.updateSetting(setting);
        await this.accountController.syncDatawallet();

        return Result.ok(SettingMapper.toSettingDTO(setting));
    }
}
