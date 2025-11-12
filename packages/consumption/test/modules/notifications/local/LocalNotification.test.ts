import { LocalNotification, LocalNotificationSource, LocalNotificationStatus } from "@nmshd/consumption";
import { Notification } from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { TestNotificationItem } from "../testHelpers/TestNotificationItem.js";

describe("LocalNotification", function () {
    test("creates objects of all nested classes", function () {
        const localNotification = LocalNotification.from({
            id: CoreId.from("anId"),
            content: Notification.from({ id: CoreId.from("anId"), items: [TestNotificationItem.from({})] }),
            isOwn: true,
            peer: CoreAddress.from("anAddress"),
            createdAt: CoreDate.utc(),
            status: LocalNotificationStatus.Open,
            source: LocalNotificationSource.message(CoreId.from("anId"))
        });

        expect(localNotification).toBeInstanceOf(LocalNotification);
        expect(localNotification.content.items[0]).toBeInstanceOf(TestNotificationItem);
        expect(localNotification.source).toBeInstanceOf(LocalNotificationSource);
    });

    test("throws when receivedByDevice is defined for an own message", function () {
        expect(() =>
            LocalNotification.from({
                id: CoreId.from("anId"),
                content: Notification.from({ id: CoreId.from("anId"), items: [TestNotificationItem.from({})] }),
                peer: CoreAddress.from("anAddress"),
                createdAt: CoreDate.utc(),
                status: LocalNotificationStatus.Open,
                source: LocalNotificationSource.message(CoreId.from("anId")),

                // not allowed
                isOwn: true,
                receivedByDevice: CoreId.from("aDeviceId")
            })
        ).toThrow("You cannot define receivedByDevice for an own message.");
    });

    test("throws when receivedByDevice is not defined for a peer message", function () {
        expect(() =>
            LocalNotification.from({
                id: CoreId.from("anId"),
                content: Notification.from({ id: CoreId.from("anId"), items: [TestNotificationItem.from({})] }),
                peer: CoreAddress.from("anAddress"),
                createdAt: CoreDate.utc(),
                status: LocalNotificationStatus.Open,
                source: LocalNotificationSource.message(CoreId.from("anId")),

                // not allowed
                isOwn: false,
                receivedByDevice: undefined
            })
        ).toThrow("You must define receivedByDevice for a peer message.");
    });
});
