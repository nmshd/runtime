import { ApplicationError, Result } from "@js-soft/ts-utils";
import { Inject } from "@nmshd/typescript-ioc";
import { DeviceDTO } from "../../../types";
import {
    CheckIdentityDeletionForUsernameRequest,
    CheckIdentityDeletionForUsernameResponse,
    CheckIdentityDeletionForUsernameUseCase,
    DisableAutoSyncUseCase,
    EnableAutoSyncUseCase,
    GetDeviceInfoUseCase,
    GetIdentityInfoResponse,
    GetIdentityInfoUseCase,
    GetSyncInfoUseCase,
    LoadItemFromTruncatedReferenceRequest,
    LoadItemFromTruncatedReferenceResponse,
    LoadItemFromTruncatedReferenceUseCase,
    RegisterPushNotificationTokenRequest,
    RegisterPushNotificationTokenResponse,
    RegisterPushNotificationTokenUseCase,
    SyncDatawalletUseCase,
    SyncEverythingResponse,
    SyncEverythingUseCase,
    SyncInfo,
    UnregisterPushNotificationTokenUseCase
} from "../../../useCases";

export class AccountFacade {
    public constructor(
        @Inject private readonly getIdentityInfoUseCase: GetIdentityInfoUseCase,
        @Inject private readonly getDeviceInfoUseCase: GetDeviceInfoUseCase,
        @Inject private readonly registerPushNotificationTokenUseCase: RegisterPushNotificationTokenUseCase,
        @Inject private readonly unregisterPushNotificationTokenUseCase: UnregisterPushNotificationTokenUseCase,
        @Inject private readonly syncDatawalletUseCase: SyncDatawalletUseCase,
        @Inject private readonly syncEverythingUseCase: SyncEverythingUseCase,
        @Inject private readonly getSyncInfoUseCase: GetSyncInfoUseCase,
        @Inject private readonly disableAutoSyncUseCase: DisableAutoSyncUseCase,
        @Inject private readonly enableAutoSyncUseCase: EnableAutoSyncUseCase,
        @Inject private readonly loadItemFromTruncatedReferenceUseCase: LoadItemFromTruncatedReferenceUseCase,
        @Inject private readonly checkIdentityDeletionForUsernameUseCase: CheckIdentityDeletionForUsernameUseCase
    ) {}

    public async getIdentityInfo(): Promise<Result<GetIdentityInfoResponse, ApplicationError>> {
        return await this.getIdentityInfoUseCase.execute();
    }

    public async getDeviceInfo(): Promise<Result<DeviceDTO, ApplicationError>> {
        return await this.getDeviceInfoUseCase.execute();
    }

    public async registerPushNotificationToken(request: RegisterPushNotificationTokenRequest): Promise<Result<RegisterPushNotificationTokenResponse, ApplicationError>> {
        return await this.registerPushNotificationTokenUseCase.execute(request);
    }

    public async unregisterPushNotificationToken(): Promise<Result<void, ApplicationError>> {
        return await this.unregisterPushNotificationTokenUseCase.execute();
    }

    public async syncDatawallet(): Promise<Result<void, ApplicationError>> {
        return await this.syncDatawalletUseCase.execute();
    }

    public async syncEverything(): Promise<Result<SyncEverythingResponse, ApplicationError>> {
        return await this.syncEverythingUseCase.execute();
    }

    public async getSyncInfo(): Promise<Result<SyncInfo, ApplicationError>> {
        return await this.getSyncInfoUseCase.execute();
    }

    public async enableAutoSync(): Promise<Result<void, ApplicationError>> {
        return await this.enableAutoSyncUseCase.execute();
    }

    public async disableAutoSync(): Promise<Result<void, ApplicationError>> {
        return await this.disableAutoSyncUseCase.execute();
    }

    public async loadItemFromTruncatedReference(request: LoadItemFromTruncatedReferenceRequest): Promise<Result<LoadItemFromTruncatedReferenceResponse, ApplicationError>> {
        return await this.loadItemFromTruncatedReferenceUseCase.execute(request);
    }

    public async checkIdentityDeletionForUsername(request: CheckIdentityDeletionForUsernameRequest): Promise<Result<CheckIdentityDeletionForUsernameResponse, ApplicationError>> {
        return await this.checkIdentityDeletionForUsernameUseCase.execute(request);
    }
}
