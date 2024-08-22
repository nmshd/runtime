import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { Notification, RelationshipAttribute, RelationshipAttributeConfidentiality, ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem } from "@nmshd/content";
import { AccountController, CoreAddress, CoreDate, CoreId, Transport } from "@nmshd/transport";
import {
    ConsumptionController,
    DeletionStatus,
    LocalNotification,
    LocalNotificationSource,
    LocalNotificationStatus,
    ThirdPartyOwnedRelationshipAttributeDeletedByPeerEvent,
    ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItemProcessor
} from "../../../../../src";
import { TestUtil } from "../../../../core/TestUtil";
import { MockEventBus } from "../../../MockEventBus";

const mockEventBus = new MockEventBus();

describe("ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItemProcessor", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let consumptionController: ConsumptionController;
    let testAccount: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport(connection, mockEventBus);
        await transport.init();

        const account = (await TestUtil.provideAccounts(transport, 1))[0];
        ({ accountController: testAccount, consumptionController } = account);
    });

    afterAll(async function () {
        await testAccount.close();
        await connection.close();
    });

    beforeEach(async function () {
        const attributes = await consumptionController.attributes.getLocalAttributes();
        for (const attribute of attributes) {
            await consumptionController.attributes.deleteAttributeUnsafe(attribute.id);
        }
        mockEventBus.clearPublishedEvents();
    });

    afterEach(async function () {
        const attributes = await consumptionController.attributes.getLocalAttributes();

        for (const attribute of attributes) {
            await consumptionController.attributes.deleteAttribute(attribute);
        }
    });

    test("runs all processor methods for a third party owned relationship attribute", async function () {
        const thirdPartyOwnedRelationshipAttribute = await consumptionController.attributes.createAttributeUnsafe({
            content: RelationshipAttribute.from({
                key: "customerId",
                value: {
                    "@type": "ProprietaryString",
                    value: "0815",
                    title: "Customer ID"
                },
                owner: CoreAddress.from("thirdParty"),
                confidentiality: RelationshipAttributeConfidentiality.Public
            }),
            shareInfo: {
                peer: CoreAddress.from("peer"),
                requestReference: CoreId.from("reqRef")
            }
        });

        const notificationItem = ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem.from({
            attributeId: thirdPartyOwnedRelationshipAttribute.id
        });
        const notification = LocalNotification.from({
            id: CoreId.from("notificationRef"),
            source: LocalNotificationSource.from({
                type: "Message",
                reference: CoreId.from("messageRef")
            }),
            status: LocalNotificationStatus.Open,
            isOwn: false,
            peer: CoreAddress.from("peer"),
            createdAt: CoreDate.utc(),
            content: Notification.from({
                id: CoreId.from("notificationRef"),
                items: [notificationItem]
            }),
            receivedByDevice: CoreId.from("deviceId")
        });
        const processor = new ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(ThirdPartyOwnedRelationshipAttributeDeletedByPeerEvent);
        const updatedAttribute = (event as ThirdPartyOwnedRelationshipAttributeDeletedByPeerEvent).data;
        expect(notificationItem.attributeId.equals(updatedAttribute.id)).toBe(true);
        expect(updatedAttribute.deletionInfo!.deletionStatus).toStrictEqual(DeletionStatus.DeletedByPeer);

        const databaseAttribute = await consumptionController.attributes.getLocalAttribute(updatedAttribute.id);
        expect(databaseAttribute!.deletionInfo!.deletionStatus).toStrictEqual(DeletionStatus.DeletedByPeer);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const attributeAfterRollback = await consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        expect(attributeAfterRollback!.deletionInfo).toBeUndefined();
    });

    test("runs all processor methods for an unknown attribute", async function () {
        const unknownAttributeId = CoreId.from("ATT");

        const notificationItem = ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem.from({
            attributeId: unknownAttributeId
        });
        const notification = LocalNotification.from({
            id: CoreId.from("notificationRef"),
            source: LocalNotificationSource.from({
                type: "Message",
                reference: CoreId.from("messageRef")
            }),
            status: LocalNotificationStatus.Open,
            isOwn: false,
            peer: CoreAddress.from("peer"),
            createdAt: CoreDate.utc(),
            content: Notification.from({
                id: CoreId.from("notificationRef"),
                items: [notificationItem]
            }),
            receivedByDevice: CoreId.from("deviceId")
        });
        const processor = new ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const processResult = await processor.process(notificationItem, notification);
        expect(processResult).toBeUndefined();

        /* Manually trigger and verify rollback. */
        const rollbackResult = await processor.rollback(notificationItem, notification);
        expect(rollbackResult).toBeUndefined();
    });

    test("detects spoofing attempts", async function () {
        /* A naughty peer is trying to delete attributes shared
         * not with them, but with another peer. This must be
         * caught by the validation. */
        const thirdPartyOwnedRelationshipAttributeSharedWithOtherPeer = await consumptionController.attributes.createAttributeUnsafe({
            content: RelationshipAttribute.from({
                key: "customerId",
                value: {
                    "@type": "ProprietaryString",
                    value: "0815",
                    title: "Customer ID"
                },
                owner: CoreAddress.from("thirdParty"),
                confidentiality: RelationshipAttributeConfidentiality.Public
            }),
            shareInfo: {
                peer: CoreAddress.from("otherPeer"),
                requestReference: CoreId.from("reqRef")
            }
        });

        const notificationItem = ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItem.from({
            attributeId: thirdPartyOwnedRelationshipAttributeSharedWithOtherPeer.id
        });

        const notification = LocalNotification.from({
            id: CoreId.from("notificationRef"),
            source: LocalNotificationSource.from({
                type: "Message",
                reference: CoreId.from("messageRef")
            }),
            status: LocalNotificationStatus.Open,
            isOwn: false,
            peer: CoreAddress.from("naughtyPeer"),
            createdAt: CoreDate.utc(),
            content: Notification.from({
                id: CoreId.from("notificationRef"),
                items: [notificationItem]
            }),
            receivedByDevice: CoreId.from("deviceId")
        });
        const processor = new ThirdPartyOwnedRelationshipAttributeDeletedByPeerNotificationItemProcessor(consumptionController);

        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult).errorValidationResult({
            code: "error.consumption.attributes.senderIsNotPeerOfSharedAttribute"
        });
    });
});
