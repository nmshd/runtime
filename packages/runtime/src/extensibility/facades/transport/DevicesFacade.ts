import { ApplicationError, Result } from "@js-soft/ts-utils";
import { DeviceDTO, DeviceOnboardingInfoDTO, TokenDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import {
    CreateDeviceOnboardingTokenRequest,
    CreateDeviceOnboardingTokenUseCase,
    CreateDeviceRequest,
    CreateDeviceUseCase,
    DeleteDeviceRequest,
    DeleteDeviceUseCase,
    GetDeviceOnboardingInfoRequest,
    GetDeviceOnboardingInfoUseCase,
    GetDeviceRequest,
    GetDevicesUseCase,
    GetDeviceUseCase,
    SetCommunicationLanguageRequest,
    SetCommunicationLanguageUseCase,
    UpdateDeviceRequest,
    UpdateDeviceUseCase
} from "../../../useCases";

export class DevicesFacade {
    public constructor(
        @Inject private readonly getDeviceUseCase: GetDeviceUseCase,
        @Inject private readonly getDevicesUseCase: GetDevicesUseCase,
        @Inject private readonly createDeviceUseCase: CreateDeviceUseCase,
        @Inject private readonly updateDeviceUseCase: UpdateDeviceUseCase,
        @Inject private readonly deleteDeviceUseCase: DeleteDeviceUseCase,
        @Inject private readonly getDeviceOnboardingInfoUseCase: GetDeviceOnboardingInfoUseCase,
        @Inject private readonly createDeviceOnboardingTokenUseCase: CreateDeviceOnboardingTokenUseCase,
        @Inject private readonly setCommunicationLanguageUseCase: SetCommunicationLanguageUseCase
    ) {}

    public async getDevice(request: GetDeviceRequest): Promise<Result<DeviceDTO, ApplicationError>> {
        return await this.getDeviceUseCase.execute(request);
    }

    public async getDevices(): Promise<Result<DeviceDTO[], ApplicationError>> {
        return await this.getDevicesUseCase.execute();
    }

    public async createDevice(request: CreateDeviceRequest): Promise<Result<DeviceDTO, ApplicationError>> {
        return await this.createDeviceUseCase.execute(request);
    }

    public async getDeviceOnboardingInfo(request: GetDeviceOnboardingInfoRequest): Promise<Result<DeviceOnboardingInfoDTO, ApplicationError>> {
        return await this.getDeviceOnboardingInfoUseCase.execute(request);
    }

    public async createDeviceOnboardingToken(request: CreateDeviceOnboardingTokenRequest): Promise<Result<TokenDTO, ApplicationError>> {
        return await this.createDeviceOnboardingTokenUseCase.execute(request);
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
