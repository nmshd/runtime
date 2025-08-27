import { Serializable } from "@js-soft/ts-serval";
import { CoreAddress, CoreId } from "@nmshd/core-types";
import { IdentityAttribute, Notification, PeerAttributeSucceededNotificationItem, Surname } from "../../src";

describe("Notification", function () {
    test("should create a Notification from JSON", function () {
        const notification = Serializable.fromUnknown({
            "@type": "Notification",
            id: "aNotificationId",
            items: [
                PeerAttributeSucceededNotificationItem.from({
                    predecessorId: CoreId.from("anAttributeId"),
                    successorId: CoreId.from("anotherAttributeId"),
                    successorContent: IdentityAttribute.from({
                        owner: CoreAddress.from("anAddress"),
                        value: Surname.from("aSurname")
                    })
                }).toJSON()
            ]
        });

        expect(notification).toBeInstanceOf(Notification);
    });

    test("should throw an Error if items is empty", function () {
        let error: any;

        try {
            Serializable.fromUnknown({
                "@type": "Notification",
                id: "aNotificationId",
                items: []
            });
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
        expect(error.message).toBe("Notification.items:Array :: may not be empty");
    });
});
