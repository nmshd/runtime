import { Result } from "@js-soft/ts-utils";
import { Setting, SettingsController } from "@nmshd/consumption";
import { AccountController, CoreId } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalSettingIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DeleteSettingRequest {
    id: LocalSettingIdString;
}

class Validator extends SchemaValidator<DeleteSettingRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeleteSettingRequest"));
    }
}

export class DeleteSettingUseCase extends UseCase<DeleteSettingRequest, void> {
    public constructor(
        @Inject private readonly settingController: SettingsController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DeleteSettingRequest): Promise<Result<void>> {
        const setting = await this.settingController.getSetting(CoreId.from(request.id));
        if (!setting) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Setting));
        }

        await this.settingController.deleteSetting(setting);
        await this.accountController.syncDatawallet();

        return Result.ok(undefined);
    }
}
