import { Serializable } from "@js-soft/ts-serval";
import { ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem } from "../../src";

describe("ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem", () => {
    test("can create a ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem with @type ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem", () => {
        const notificationItem = Serializable.fromUnknown({ "@type": "ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem", attributeId: "anAttributeId" });
        expect(notificationItem instanceof ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem).toBe(true);
    });
});
