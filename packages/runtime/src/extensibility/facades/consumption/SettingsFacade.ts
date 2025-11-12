import { ApplicationError, Result } from "@js-soft/ts-utils";
import { SettingDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import {
    CreateSettingRequest,
    CreateSettingUseCase,
    DeleteSettingRequest,
    DeleteSettingUseCase,
    GetSettingByKeyRequest,
    GetSettingByKeyUseCase,
    GetSettingRequest,
    GetSettingUseCase,
    GetSettingsRequest,
    GetSettingsUseCase,
    UpdateSettingRequest,
    UpdateSettingUseCase,
    UpsertSettingByKeyRequest,
    UpsertSettingByKeyUseCase
} from "../../../useCases/index.js";

export class SettingsFacade {
    public constructor(
        @Inject private readonly createSettingUseCase: CreateSettingUseCase,
        @Inject private readonly updateSettingUseCase: UpdateSettingUseCase,
        @Inject private readonly upsertSettingByKeyUseCase: UpsertSettingByKeyUseCase,
        @Inject private readonly deleteSettingUseCase: DeleteSettingUseCase,
        @Inject private readonly getSettingsUseCase: GetSettingsUseCase,
        @Inject private readonly getSettingUseCase: GetSettingUseCase,
        @Inject private readonly getSettingByKeyUseCase: GetSettingByKeyUseCase
    ) {}

    public async createSetting(request: CreateSettingRequest): Promise<Result<SettingDTO, ApplicationError>> {
        return await this.createSettingUseCase.execute(request);
    }

    public async getSetting(request: GetSettingRequest): Promise<Result<SettingDTO, ApplicationError>> {
        return await this.getSettingUseCase.execute(request);
    }

    public async getSettingByKey(request: GetSettingByKeyRequest): Promise<Result<SettingDTO, ApplicationError>> {
        return await this.getSettingByKeyUseCase.execute(request);
    }

    public async getSettings(request: GetSettingsRequest): Promise<Result<SettingDTO[], ApplicationError>> {
        return await this.getSettingsUseCase.execute(request);
    }

    public async deleteSetting(request: DeleteSettingRequest): Promise<Result<void, ApplicationError>> {
        return await this.deleteSettingUseCase.execute(request);
    }

    public async updateSetting(request: UpdateSettingRequest): Promise<Result<SettingDTO, ApplicationError>> {
        return await this.updateSettingUseCase.execute(request);
    }

    public async upsertSettingByKey(request: UpsertSettingByKeyRequest): Promise<Result<SettingDTO, ApplicationError>> {
        return await this.upsertSettingByKeyUseCase.execute(request);
    }
}
