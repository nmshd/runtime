import { Result } from "@js-soft/ts-utils";
import { Inject } from "typescript-ioc";
import { LocalNotificationDTO } from "../../../types";
import {
    GetNotificationRequest,
    GetNotificationsRequest,
    GetNotificationsUseCase,
    GetNotificationUseCase,
    ProcessNotificationByIdRequest,
    ProcessNotificationByIdUseCase,
    ProcessOpenNotifactionsReceivedByCurrentDeviceUseCase,
    ReceivedNotificationRequest,
    ReceivedNotificationUseCase,
    SentNotificationRequest,
    SentNotificationUseCase
} from "../../../useCases";

export class NotificationsFacade {
    public constructor(
        @Inject private readonly getUseCase: GetNotificationUseCase,
        @Inject private readonly queryUseCase: GetNotificationsUseCase,
        @Inject private readonly sentNotificationUseCase: SentNotificationUseCase,
        @Inject private readonly receivedNotificationUseCase: ReceivedNotificationUseCase,
        @Inject private readonly processOpenNotifactionsReceivedByCurrentDeviceUseCase: ProcessOpenNotifactionsReceivedByCurrentDeviceUseCase,
        @Inject private readonly processNotificationByIdUseCase: ProcessNotificationByIdUseCase
    ) {}

    public async getNotification(request: GetNotificationRequest): Promise<Result<LocalNotificationDTO>> {
        return await this.getUseCase.execute(request);
    }

    public async getNotifications(request: GetNotificationsRequest): Promise<Result<LocalNotificationDTO[]>> {
        return await this.queryUseCase.execute(request);
    }

    public async sentNotification(request: SentNotificationRequest): Promise<Result<LocalNotificationDTO>> {
        return await this.sentNotificationUseCase.execute(request);
    }

    public async receivedNotification(request: ReceivedNotificationRequest): Promise<Result<LocalNotificationDTO>> {
        return await this.receivedNotificationUseCase.execute(request);
    }

    public async processOpenNotifactionsReceivedByCurrentDevice(): Promise<Result<void>> {
        return await this.processOpenNotifactionsReceivedByCurrentDeviceUseCase.execute();
    }

    public async processNotificationById(request: ProcessNotificationByIdRequest): Promise<Result<LocalNotificationDTO>> {
        return await this.processNotificationByIdUseCase.execute(request);
    }
}
