import { ApplicationError, Result } from "@js-soft/ts-utils";
import { DeviceDTO, TokenDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import {
    DeleteDeviceRequest,
    DeleteDeviceUseCase,
    FillDeviceOnboardingTokenWithNewDeviceRequest,
    FillDeviceOnboardingTokenWithNewDeviceUseCase,
    GetDeviceRequest,
    GetDevicesUseCase,
    GetDeviceUseCase,
    SetCommunicationLanguageRequest,
    SetCommunicationLanguageUseCase,
    UpdateCurrentDeviceRequest,
    UpdateCurrentDeviceUseCase,
    UpdateDeviceRequest,
    UpdateDeviceUseCase
} from "../../../useCases/index.js";

export class DevicesFacade {
    public constructor(
        @Inject private readonly getDeviceUseCase: GetDeviceUseCase,
        @Inject private readonly getDevicesUseCase: GetDevicesUseCase,
        @Inject private readonly updateCurrentDeviceUseCase: UpdateCurrentDeviceUseCase,
        @Inject private readonly updateDeviceUseCase: UpdateDeviceUseCase,
        @Inject private readonly deleteDeviceUseCase: DeleteDeviceUseCase,
        @Inject private readonly fillDeviceOnboardingTokenWithNewDeviceUseCase: FillDeviceOnboardingTokenWithNewDeviceUseCase,
        @Inject private readonly setCommunicationLanguageUseCase: SetCommunicationLanguageUseCase
    ) {}

    public async getDevice(request: GetDeviceRequest): Promise<Result<DeviceDTO, ApplicationError>> {
        return await this.getDeviceUseCase.execute(request);
    }

    public async getDevices(): Promise<Result<DeviceDTO[], ApplicationError>> {
        return await this.getDevicesUseCase.execute();
    }

    public async fillDeviceOnboardingTokenWithNewDevice(request: FillDeviceOnboardingTokenWithNewDeviceRequest): Promise<Result<TokenDTO, ApplicationError>> {
        return await this.fillDeviceOnboardingTokenWithNewDeviceUseCase.execute(request);
    }

    public async updateCurrentDevice(request: UpdateCurrentDeviceRequest): Promise<Result<DeviceDTO, ApplicationError>> {
        return await this.updateCurrentDeviceUseCase.execute(request);
    }

    public async updateDevice(request: UpdateDeviceRequest): Promise<Result<DeviceDTO, ApplicationError>> {
        return await this.updateDeviceUseCase.execute(request);
    }

    public async deleteDevice(request: DeleteDeviceRequest): Promise<Result<void, ApplicationError>> {
        return await this.deleteDeviceUseCase.execute(request);
    }

    public async setCommunicationLanguage(request: SetCommunicationLanguageRequest): Promise<Result<void, ApplicationError>> {
        return await this.setCommunicationLanguageUseCase.execute(request);
    }
}
