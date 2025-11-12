import { QueryTranslator } from "@js-soft/docdb-querytranslator";
import { Result } from "@js-soft/ts-utils";
import { NotificationsController } from "@nmshd/consumption";
import { LocalNotificationDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { UseCase } from "../../common/index.js";
import { NotificationMapper } from "./NotificationMapper.js";

export interface GetNotificationsRequest {
    query?: GetNotificationsRequestQuery;
}

export type GetNotificationsRequestQuery = Record<string, string | string[]>;

export class GetNotificationsUseCase extends UseCase<GetNotificationsRequest, LocalNotificationDTO[]> {
    public static readonly queryTranslator = new QueryTranslator({});

    public constructor(@Inject private readonly notificationsController: NotificationsController) {
        super();
    }

    protected async executeInternal(request: GetNotificationsRequest): Promise<Result<LocalNotificationDTO[]>> {
        const dbQuery = GetNotificationsUseCase.queryTranslator.parse(request.query);

        const notifications = await this.notificationsController.getNotifications(dbQuery);
        return Result.ok(NotificationMapper.toNotificationDTOList(notifications));
    }
}
