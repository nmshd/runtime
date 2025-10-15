import { ILogger } from "@js-soft/logging-abstractions";
import { CreateAttributeWithKeyBindingNotificationItem } from "@nmshd/content";
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
        const repositoryAttribute = await this.consumptionController.attributes.createRepositoryAttribute({
            content: {
                owner: this.accountController.identity.address,
                value: notificationItem.attribute
            },
            id: notificationItem.sharedAttributeId
        });
        await this.consumptionController.attributes.createSharedLocalAttributeCopy({
            peer: notification.peer,
            requestReference: notificationItem.requestId,
            sourceAttributeId: repositoryAttribute.id,
            attributeId: notificationItem.sharedAttributeId
        });
    }

    public override rollback(_notificationItem: CreateAttributeWithKeyBindingNotificationItem, _notification: LocalNotification): void | Promise<void> {
        // do nothing
    }
}
