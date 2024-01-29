import { serialize, type, validate } from "@js-soft/ts-serval";
import { ApplicationError } from "@js-soft/ts-utils";
import { AbstractNotificationItemProcessor, ValidationResult } from "@nmshd/consumption";
import { INotificationItem, NotificationItem } from "@nmshd/content";

export interface ITestNotificationItem extends INotificationItem {
    identifier?: string;
    failCheckPrerequisites?: boolean;
    failProcess?: boolean;
}

@type("TestNotificationItem")
export class TestNotificationItem extends NotificationItem implements INotificationItem {
    @serialize()
    @validate({ nullable: true })
    public identifier?: string;

    @serialize()
    @validate({ nullable: true })
    public failCheckPrerequisites?: boolean;

    @serialize()
    @validate({ nullable: true })
    public failProcess?: boolean;

    public static from(value: ITestNotificationItem): TestNotificationItem {
        return super.fromAny(value) as TestNotificationItem;
    }
}

export class TestNotificationItemProcessor extends AbstractNotificationItemProcessor<TestNotificationItem> {
    static #processedItems: TestNotificationItem[] = [];
    public static get processedItems(): TestNotificationItem[] {
        return TestNotificationItemProcessor.#processedItems;
    }

    static #rollbackedItems: TestNotificationItem[] = [];
    public static get rollbackedItems(): TestNotificationItem[] {
        return TestNotificationItemProcessor.#rollbackedItems;
    }

    public static reset(): void {
        this.#processedItems = [];
        this.#rollbackedItems = [];
    }

    public checkPrerequisitesOfIncomingNotificationItem(notificationItem: TestNotificationItem): ValidationResult | Promise<ValidationResult> {
        if (notificationItem.failCheckPrerequisites) {
            return ValidationResult.error(
                new ApplicationError(
                    "error.test.notificationItem.checkPrerequisitesFailed",
                    "The TestNotificationItem.failCheckPrerequisites property is set which shouldn't happen within Tests."
                )
            );
        }
        return ValidationResult.success();
    }

    public process(notificationItem: TestNotificationItem): void {
        if (notificationItem.failProcess) throw new Error("Failed to process Notification item.");

        TestNotificationItemProcessor.#processedItems.push(notificationItem);
    }

    public rollback(notificationItem: TestNotificationItem): void {
        TestNotificationItemProcessor.#rollbackedItems.push(notificationItem);
    }
}
