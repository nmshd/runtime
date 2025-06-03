import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { Notification, RelationshipAttribute, RelationshipAttributeConfidentiality, ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem } from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import {
    ConsumptionController,
    LocalAttributeDeletionStatus,
    LocalNotification,
    LocalNotificationSource,
    LocalNotificationStatus,
    ThirdPartyRelationshipAttributeDeletedByPeerEvent,
    ThirdPartyRelationshipAttributeDeletedByPeerNotificationItemProcessor
} from "../../../../../src";
import { TestUtil } from "../../../../core/TestUtil";
import { MockEventBus } from "../../../MockEventBus";

const mockEventBus = new MockEventBus();

describe("ThirdPartyRelationshipAttributeDeletedByPeerNotificationItemProcessor", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let consumptionController: ConsumptionController;
    let testAccount: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport(mockEventBus);
        await transport.init();

        const account = (await TestUtil.provideAccounts(transport, connection, 1))[0];
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

    test("runs all processor methods for a ThirdPartyRelationshipAttribute", async function () {
        const thirdPartyRelationshipAttribute = await consumptionController.attributes.createAttributeUnsafe({
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
                requestReference: CoreId.from("reqRef"),
                thirdPartyAddress: CoreAddress.from("thirdPartyAddress")
            }
        });

        const notificationItem = ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem.from({
            attributeId: thirdPartyRelationshipAttribute.id
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
        const processor = new ThirdPartyRelationshipAttributeDeletedByPeerNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(ThirdPartyRelationshipAttributeDeletedByPeerEvent);
        const updatedAttribute = (event as ThirdPartyRelationshipAttributeDeletedByPeerEvent).data;
        expect(notificationItem.attributeId.equals(updatedAttribute.id)).toBe(true);
        expect(updatedAttribute.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);

        const databaseAttribute = await consumptionController.attributes.getLocalAttribute(updatedAttribute.id);
        expect(databaseAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const attributeAfterRollback = await consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        expect(attributeAfterRollback!.deletionInfo).toBeUndefined();
    });

    test("runs all processor methods for an unknown attribute", async function () {
        const unknownAttributeId = CoreId.from("ATT");

        const notificationItem = ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem.from({
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
        const processor = new ThirdPartyRelationshipAttributeDeletedByPeerNotificationItemProcessor(consumptionController);

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
        const thirdPartyRelationshipAttributeSharedWithOtherPeer = await consumptionController.attributes.createAttributeUnsafe({
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
                requestReference: CoreId.from("reqRef"),
                thirdPartyAddress: CoreAddress.from("thirdPartyAddress")
            }
        });

        const notificationItem = ThirdPartyRelationshipAttributeDeletedByPeerNotificationItem.from({
            attributeId: thirdPartyRelationshipAttributeSharedWithOtherPeer.id
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
        const processor = new ThirdPartyRelationshipAttributeDeletedByPeerNotificationItemProcessor(consumptionController);

        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult).errorValidationResult({
            code: "error.consumption.attributes.senderIsNotPeerOfSharedAttribute"
        });
    });
});
