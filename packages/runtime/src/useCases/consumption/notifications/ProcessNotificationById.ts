import { ApplicationError, Result } from "@js-soft/ts-utils";
import { NotificationsController } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { LocalNotificationDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { NotificationIdString, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { NotificationMapper } from "./NotificationMapper";

export interface ProcessNotificationByIdRequest {
    notificationId: NotificationIdString;
}

class Validator extends SchemaValidator<ProcessNotificationByIdRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("ProcessNotificationByIdRequest"));
    }
}

export class ProcessNotificationByIdUseCase extends UseCase<ProcessNotificationByIdRequest, LocalNotificationDTO> {
    public constructor(
        @Inject private readonly notificationsController: NotificationsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: ProcessNotificationByIdRequest): Promise<Result<LocalNotificationDTO, ApplicationError>> {
        const processedNotification = await this.notificationsController.processNotificationById(CoreId.from(request.notificationId));

        const dto = NotificationMapper.toNotificationDTO(processedNotification);
        return Result.ok(dto);
    }
}
