import { Result } from "@js-soft/ts-utils";
import { SettingsController, SettingScope } from "@nmshd/consumption";
import { AccountController, CoreDate, CoreId } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { SettingDTO } from "../../../types";
import { GenericIdString, ISO8601DateTimeString, LocalSettingIdString, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { SettingMapper } from "./SettingMapper";

export interface CreateSettingRequest {
    key: string;
    value: any;

    reference?: GenericIdString;
    scope?: "Identity" | "Device" | "Relationship";
    succeedsAt?: ISO8601DateTimeString;
    succeedsItem?: LocalSettingIdString;
}

class Validator extends SchemaValidator<CreateSettingRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateSettingRequest"));
    }
}

export class CreateSettingUseCase extends UseCase<CreateSettingRequest, SettingDTO> {
    public constructor(
        @Inject private readonly settingController: SettingsController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateSettingRequest): Promise<Result<SettingDTO>> {
        const setting = await this.settingController.createSetting({
            key: request.key,
            value: request.value,
            reference: request.reference ? CoreId.from(request.reference) : undefined,
            scope: request.scope as SettingScope | undefined,
            succeedsAt: request.succeedsAt ? CoreDate.from(request.succeedsAt) : undefined,
            succeedsItem: request.succeedsItem ? CoreId.from(request.succeedsItem) : undefined
        });
        await this.accountController.syncDatawallet();

        return Result.ok(SettingMapper.toSettingDTO(setting));
    }
}
