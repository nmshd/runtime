import { Serializable } from "@js-soft/ts-serval";
import { Result } from "@js-soft/ts-utils";
import { SettingsController } from "@nmshd/consumption";
import { AccountController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { SettingDTO } from "../../../types";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { SettingMapper } from "./SettingMapper";

export interface UpsertSettingByKeyRequest {
    key: string;
    value: any;
}

class Validator extends SchemaValidator<UpsertSettingByKeyRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("UpsertSettingByKeyRequest"));
    }
}

export class UpsertSettingByKeyUseCase extends UseCase<UpsertSettingByKeyRequest, SettingDTO> {
    public constructor(
        @Inject private readonly settingController: SettingsController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: UpsertSettingByKeyRequest): Promise<Result<SettingDTO>> {
        const settings = await this.settingController.getSettings({ key: request.key });

        const newValue = Serializable.fromUnknown(request.value);

        if (settings.length === 0) {
            const setting = await this.settingController.createSetting({ key: request.key, value: newValue });
            await this.accountController.syncDatawallet();
            return Result.ok(SettingMapper.toSettingDTO(setting));
        }

        const latestSetting = settings.reduce((prev, current) => (prev.createdAt > current.createdAt ? prev : current));

        latestSetting.value = newValue;
        await this.settingController.updateSetting(latestSetting);
        await this.accountController.syncDatawallet();

        return Result.ok(SettingMapper.toSettingDTO(latestSetting));
    }
}
