import { Serializable } from "@js-soft/ts-serval";
import { ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem } from "../../src";

test("ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem", () => {
    const thirdPartyRelationshipAttributeDeletedByPeerNotificationItem = ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem.from({ attributeId: "anAttributeId" });
    expect(thirdPartyRelationshipAttributeDeletedByPeerNotificationItem.attributeId.toString()).toBe("anAttributeId");

    const actualNotificationItem = Serializable.fromUnknown({ "@type": "ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem", attributeId: "anAttributeId" });
    expect(actualNotificationItem instanceof ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem).toBe(true);

    const deprecatedNotificationItem = Serializable.fromUnknown({ "@type": "ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem", attributeId: "anAttributeId" });
    expect(deprecatedNotificationItem instanceof ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem).toBe(true);
});
