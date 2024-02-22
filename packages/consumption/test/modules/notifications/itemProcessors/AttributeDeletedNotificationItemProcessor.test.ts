import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AttributeDeletedNotificationItem, IdentityAttribute, Notification, RelationshipAttribute, RelationshipAttributeConfidentiality } from "@nmshd/content";
import { AccountController, CoreAddress, CoreDate, CoreId, Transport } from "@nmshd/transport";
import {
    AttributeDeletedByPeerEvent,
    AttributeDeletedNotificationItemProcessor,
    ConsumptionController,
    LocalNotification,
    LocalNotificationSource,
    LocalNotificationStatus
} from "../../../../src";
import { TestUtil } from "../../../core/TestUtil";
import { MockEventBus } from "../../MockEventBus";

const mockEventBus = new MockEventBus();

describe("AttributeDeletedNotificationItemProcessor", function () {
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

    test("runs all processor methods for an own shared identity attribute", async function () {
        const ownSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
            content: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "Schenkel"
                },
                owner: testAccount.identity.address
            }),
            shareInfo: {
                peer: CoreAddress.from("peer"),
                requestReference: CoreId.from("reqRef"),
                sourceAttribute: CoreId.from("repositoryAttribute")
            }
        });

        const notificationItem = AttributeDeletedNotificationItem.from({
            attributeId: ownSharedIdentityAttribute.id
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
        const processor = new AttributeDeletedNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(AttributeDeletedByPeerEvent);
        const updatedAttribute = event.data;
        expect(notificationItem.attributeId.equals(updatedAttribute.id)).toBe(true);
        expect(updatedAttribute.deletionStatus?.deletedByPeer).toBeDefined();

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const attributeAfterRollback = await consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        expect(attributeAfterRollback?.deletionStatus?.deletedByPeer).toBeUndefined();
    });

    test("runs all processor methods for a peer shared relationship attribute", async function () {
        const ownSharedRelationshipAttribute = await consumptionController.attributes.createAttributeUnsafe({
            content: RelationshipAttribute.from({
                key: "customerId",
                value: {
                    "@type": "ProprietaryString",
                    value: "0815",
                    title: "Customer ID"
                },
                owner: testAccount.identity.address,
                confidentiality: RelationshipAttributeConfidentiality.Public
            }),
            shareInfo: {
                peer: CoreAddress.from("peer"),
                requestReference: CoreId.from("reqRef")
            }
        });

        const notificationItem = AttributeDeletedNotificationItem.from({
            attributeId: ownSharedRelationshipAttribute.id
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
        const processor = new AttributeDeletedNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(AttributeDeletedByPeerEvent);
        const updatedAttribute = event.data;
        expect(notificationItem.attributeId.equals(updatedAttribute.id)).toBe(true);
        expect(updatedAttribute.deletionStatus?.deletedByPeer).toBeDefined();

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const attributeAfterRollback = await consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        expect(attributeAfterRollback?.deletionStatus?.deletedByPeer).toBeUndefined();
    });

    test("detects spoofing attempts", async function () {
        /* A naughty peer is trying to delete attributes shared
         * not with him, but with another peer. This must be
         * caught by the validation. */
        const ownSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
            content: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "Schenkel"
                },
                owner: testAccount.identity.address
            }),
            shareInfo: {
                peer: CoreAddress.from("otherPeer"),
                requestReference: CoreId.from("reqRef"),
                sourceAttribute: CoreId.from("repositoryAttribute")
            }
        });

        const notificationItem = AttributeDeletedNotificationItem.from({
            attributeId: ownSharedIdentityAttribute.id
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
        const processor = new AttributeDeletedNotificationItemProcessor(consumptionController);

        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult).errorValidationResult({
            code: "error.consumption.attributes.senderIsNotPeerOfSharedAttribute"
        });
    });
});
