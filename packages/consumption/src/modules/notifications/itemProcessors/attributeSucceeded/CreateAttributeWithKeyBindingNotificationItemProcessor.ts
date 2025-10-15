import { ILogger } from "@js-soft/logging-abstractions";
import { CreateAttributeWithKeyBindingAcceptResponseItem, CreateAttributeWithKeyBindingNotificationItem, ResponseItemGroup } from "@nmshd/content";
import { TransportLoggerFactory } from "@nmshd/transport";
import { ConsumptionController } from "../../../../consumption/ConsumptionController";
import { ValidationResult } from "../../../common";
import { LocalNotification } from "../../local/LocalNotification";
import { AbstractNotificationItemProcessor } from "../AbstractNotificationItemProcessor";

export class CreateAttributeWithKeyBindingNotificationItemProcessor extends AbstractNotificationItemProcessor<CreateAttributeWithKeyBindingNotificationItem> {
    private readonly _logger: ILogger;

    public constructor(consumptionController: ConsumptionController) {
        super(consumptionController);
        this._logger = TransportLoggerFactory.getLogger(CreateAttributeWithKeyBindingNotificationItemProcessor);
    }

    public override checkPrerequisitesOfIncomingNotificationItem(
        _notificationItem: CreateAttributeWithKeyBindingNotificationItem,
        _notification: LocalNotification
    ): ValidationResult | Promise<ValidationResult> {
        // const sourceRequest = await this.consumptionController.incomingRequests.getIncomingRequest(notificationItem.requestId);
        // if (!sourceRequest) return ValidationResult.error(ConsumptionCoreErrors.requests.invalidRequestItem("Request ID doesn't belong to an existing request."));

        // const sourceRequestItem = (
        //     notificationItem.requestItemIdentifier[1]
        //         ? (sourceRequest.content.items[notificationItem.requestItemIdentifier[0]!] as RequestItemGroup).items[notificationItem.requestItemIdentifier[1]]
        //         : sourceRequest.content.items[notificationItem.requestItemIdentifier[0]!]
        // ) as CreateAttributeWithKeyBindingRequestItem;
        // const preliminaryCredential = sourceRequestItem.attribute.value.value;

        // const newCredential = notificationItem.attribute.value.value;

        return ValidationResult.success();
    }

    public override async process(notificationItem: CreateAttributeWithKeyBindingNotificationItem, notification: LocalNotification): Promise<void> {
        const sourceRequest = await this.consumptionController.incomingRequests.getIncomingRequest(notificationItem.requestId);
        if (!sourceRequest) throw new Error("Request ID doesn't belong to an existing request.");

        const sourceResponseItem = (
            notificationItem.requestItemIdentifier[1]
                ? (sourceRequest.response!.content.items[notificationItem.requestItemIdentifier[0]!] as ResponseItemGroup).items[notificationItem.requestItemIdentifier[1]]
                : sourceRequest.response!.content.items[notificationItem.requestItemIdentifier[0]!]
        ) as CreateAttributeWithKeyBindingAcceptResponseItem;

        const sharedAttributeId = sourceResponseItem.sharedAttributeId;
        const repositoryAttribute = await this.consumptionController.attributes.createRepositoryAttribute({
            content: notificationItem.attribute
        });
        await this.consumptionController.attributes.createSharedLocalAttributeCopy({
            peer: notification.peer,
            requestReference: notificationItem.requestId,
            sourceAttributeId: repositoryAttribute.id,
            attributeId: sharedAttributeId
        });
    }

    public override rollback(_notificationItem: CreateAttributeWithKeyBindingNotificationItem, _notification: LocalNotification): void | Promise<void> {
        // do nothing
    }
}
