import { type } from "@js-soft/ts-serval";
import { AbstractNotificationItemProcessor, ValidationResult } from "@nmshd/consumption";
import { INotificationItem, NotificationItem } from "@nmshd/content";

@type("TestNotificationItem")
export class TestNotificationItem extends NotificationItem {
    public static from(value: INotificationItem): TestNotificationItem {
        return super.fromAny(value);
    }
}

export class TestNotificationItemProcessor extends AbstractNotificationItemProcessor<TestNotificationItem> {
    public static readonly processedItems: TestNotificationItem[] = [];

    public static reset(): void {
        TestNotificationItemProcessor.processedItems.splice(0, TestNotificationItemProcessor.processedItems.length);
    }

    public override checkPrerequisitesOfIncomingNotificationItem(_notificationItem: TestNotificationItem): ValidationResult {
        return ValidationResult.success();
    }

    public override process(_notificationItem: TestNotificationItem): void {
        TestNotificationItemProcessor.processedItems.push(_notificationItem);
    }

    public override rollback(_notificationItem: TestNotificationItem): void {
        // noop
    }
}
