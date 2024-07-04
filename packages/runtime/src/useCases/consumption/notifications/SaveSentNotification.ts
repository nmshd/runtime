import { ApplicationError, Result } from "@js-soft/ts-utils";
import { NotificationsController } from "@nmshd/consumption";
import { Notification } from "@nmshd/content";
import { CoreId, Message, MessageController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalNotificationDTO } from "../../../types";
import { MessageIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { NotificationMapper } from "./NotificationMapper";

export interface SaveSentNotificationRequest {
    messageId: MessageIdString;
}

class Validator extends SchemaValidator<SaveSentNotificationRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("SaveSentNotificationRequest"));
    }
}

export class SaveSentNotificationUseCase extends UseCase<SaveSentNotificationRequest, LocalNotificationDTO> {
    public constructor(
        @Inject private readonly notificationsController: NotificationsController,
        @Inject private readonly messageController: MessageController,

        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: SaveSentNotificationRequest): Promise<Result<LocalNotificationDTO, ApplicationError>> {
        const message = await this.messageController.getMessage(CoreId.from(request.messageId));
        if (!message) return Result.fail(RuntimeErrors.general.recordNotFound(Message));

        if (!(message.cache!.content instanceof Notification)) return Result.fail(RuntimeErrors.notifications.messageDoesNotContainNotification(message.id));
        if (!message.isOwn) return Result.fail(RuntimeErrors.notifications.cannotSaveSentNotificationFromPeerMessage(message.id));

        const notification = await this.notificationsController.saveSent(message);
        const dto = NotificationMapper.toNotificationDTO(notification);

        return Result.ok(dto);
    }
}
