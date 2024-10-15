import { QueryTranslator } from "@js-soft/docdb-querytranslator";
import { Result } from "@js-soft/ts-utils";
import { SettingsController } from "@nmshd/consumption";
import { Inject } from "@nmshd/typescript-ioc";
import { nameof } from "ts-simple-nameof";
import { SettingDTO } from "../../../types";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { SettingMapper } from "./SettingMapper";

export interface GetSettingsQuery {
    key?: string | string[];
    scope?: string | string[];
    reference?: string | string[];
    createdAt?: string | string[];
    succeedsItem?: string | string[];
    succeedsAt?: string | string[];
}

export interface GetSettingsRequest {
    query?: GetSettingsQuery;
}

class Validator extends SchemaValidator<GetSettingsRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetSettingsRequest"));
    }
}

export class GetSettingsUseCase extends UseCase<GetSettingsRequest, SettingDTO[]> {
    private static readonly queryTranslator = new QueryTranslator({
        whitelist: {
            [nameof<SettingDTO>((c) => c.key)]: true,
            [nameof<SettingDTO>((c) => c.scope)]: true,
            [nameof<SettingDTO>((c) => c.reference)]: true,
            [nameof<SettingDTO>((c) => c.createdAt)]: true,
            [nameof<SettingDTO>((c) => c.succeedsItem)]: true,
            [nameof<SettingDTO>((c) => c.succeedsAt)]: true
        }
    });

    public constructor(
        @Inject private readonly settingController: SettingsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetSettingsRequest): Promise<Result<SettingDTO[]>> {
        const query = GetSettingsUseCase.queryTranslator.parse(request.query);
        const settings = await this.settingController.getSettings(query);

        return Result.ok(SettingMapper.toSettingDTOList(settings));
    }
}
