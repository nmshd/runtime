import { ApplicationError, Result } from "@js-soft/ts-utils";
import { NotificationsController } from "@nmshd/consumption";
import { Notification } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { LocalNotificationDTO } from "@nmshd/runtime-types";
import { Message, MessageController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { MessageIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { NotificationMapper } from "./NotificationMapper";

export interface ReceivedNotificationRequest {
    messageId: MessageIdString;
}

class Validator extends SchemaValidator<ReceivedNotificationRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("ReceivedNotificationRequest"));
    }
}

export class ReceivedNotificationUseCase extends UseCase<ReceivedNotificationRequest, LocalNotificationDTO> {
    public constructor(
        @Inject private readonly notificationsController: NotificationsController,
        @Inject private readonly messageController: MessageController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: ReceivedNotificationRequest): Promise<Result<LocalNotificationDTO, ApplicationError>> {
        const message = await this.messageController.getMessage(CoreId.from(request.messageId));
        if (!message) return Result.fail(RuntimeErrors.general.recordNotFound(Message));

        if (!(message.cache!.content instanceof Notification)) return Result.fail(RuntimeErrors.notifications.messageDoesNotContainNotification(message.id));
        if (message.isOwn) return Result.fail(RuntimeErrors.notifications.cannotReceiveNotificationFromOwnMessage());

        const notification = await this.notificationsController.received(message);
        const dto = NotificationMapper.toNotificationDTO(notification);

        return Result.ok(dto);
    }
}
