import { Result } from "@js-soft/ts-utils";
import { NotificationsController } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { LocalNotificationDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { NotificationIdString, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { NotificationMapper } from "./NotificationMapper";

export interface GetNotificationRequest {
    id: NotificationIdString;
}

class Validator extends SchemaValidator<GetNotificationRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetNotificationRequest"));
    }
}

export class GetNotificationUseCase extends UseCase<GetNotificationRequest, LocalNotificationDTO> {
    public constructor(
        @Inject private readonly notificationsController: NotificationsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetNotificationRequest): Promise<Result<LocalNotificationDTO>> {
        const notification = await this.notificationsController.getNotification(CoreId.from(request.id));
        return Result.ok(NotificationMapper.toNotificationDTO(notification));
    }
}
