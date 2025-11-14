import { Event } from "@js-soft/ts-utils";
import { NotificationItem } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { AccountController } from "@nmshd/transport";
import { ConsumptionController } from "../../../consumption/ConsumptionController.js";
import { ValidationResult } from "../../common/index.js";
import { LocalNotification } from "../local/LocalNotification.js";

export interface INotificationItemProcessor<TNotificationItem extends NotificationItem = NotificationItem> {
    checkPrerequisitesOfIncomingNotificationItem(notificationItem: TNotificationItem, notification: LocalNotification): ValidationResult | Promise<ValidationResult>;

    process(notificationItem: TNotificationItem, notification: LocalNotification): Event | void | Promise<Event | void>;

    rollback(notificationItem: TNotificationItem, notification: LocalNotification): void | Promise<void>;
}

export abstract class AbstractNotificationItemProcessor<TNotificationItem extends NotificationItem = NotificationItem> implements INotificationItemProcessor<TNotificationItem> {
    protected accountController: AccountController;
    protected currentIdentityAddress: CoreAddress;

    public constructor(protected readonly consumptionController: ConsumptionController) {
        this.accountController = this.consumptionController.accountController;
        this.currentIdentityAddress = this.accountController.identity.address;
    }

    public abstract checkPrerequisitesOfIncomingNotificationItem(
        notificationItem: TNotificationItem,
        notification: LocalNotification
    ): ValidationResult | Promise<ValidationResult>;
    /**
     * Processor of notification item run after successful validation.
     *
     * NOTE: process() is responsible for its own cleanup. If during its
     *       execution an irrecoverable error is encountered, any work done up
     *       to this point has to be reverted in-place, before raising an
     *       exception.
     */
    public abstract process(notificationItem: TNotificationItem, notification: LocalNotification): Event | void | Promise<Event | void>;

    /**
     * Rollback function triggered in case of an error of any subsequent
     * notification item within the notification. rollback() has to revert all
     * changes performed by a successful execution of process().
     */
    public abstract rollback(notificationItem: TNotificationItem, notification: LocalNotification): void | Promise<void>;
}
