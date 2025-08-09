import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import {
    IdentityAttribute,
    Notification,
    PeerRelationshipAttributeDeletedByPeerNotificationItem,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality
} from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import {
    ConsumptionController,
    LocalNotification,
    LocalNotificationSource,
    LocalNotificationStatus,
    PeerRelationshipAttributeDeletedByPeerEvent,
    PeerRelationshipAttributeDeletedByPeerNotificationItemProcessor
} from "../../../../../src";
import { TestUtil } from "../../../../core/TestUtil";
import { MockEventBus } from "../../../MockEventBus";

const mockEventBus = new MockEventBus();

describe("PeerRelationshipAttributeDeletedByPeerNotificationItemProcessor", function () {
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
                sourceReference: CoreId.from("reqRef"),
                sourceAttribute: CoreId.from("repositoryAttribute")
            }
        });

        const notificationItem = PeerRelationshipAttributeDeletedByPeerNotificationItem.from({
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
        const processor = new PeerRelationshipAttributeDeletedByPeerNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(PeerRelationshipAttributeDeletedByPeerEvent);
        const updatedAttribute = (event as PeerRelationshipAttributeDeletedByPeerEvent).data;
        expect(notificationItem.attributeId.equals(updatedAttribute.id)).toBe(true);
        expect(updatedAttribute.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);

        const databaseAttribute = await consumptionController.attributes.getLocalAttribute(updatedAttribute.id);
        expect(databaseAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const attributeAfterRollback = await consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        expect(attributeAfterRollback!.deletionInfo).toBeUndefined();
    });

    test("runs all processor methods for an own shared relationship attribute", async function () {
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
                sourceReference: CoreId.from("reqRef")
            }
        });

        const notificationItem = PeerRelationshipAttributeDeletedByPeerNotificationItem.from({
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
        const processor = new PeerRelationshipAttributeDeletedByPeerNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(PeerRelationshipAttributeDeletedByPeerEvent);
        const updatedAttribute = (event as PeerRelationshipAttributeDeletedByPeerEvent).data;
        expect(notificationItem.attributeId.equals(updatedAttribute.id)).toBe(true);
        expect(updatedAttribute.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);

        const databaseAttribute = await consumptionController.attributes.getLocalAttribute(updatedAttribute.id);
        expect(databaseAttribute!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const attributeAfterRollback = await consumptionController.attributes.getLocalAttribute(notificationItem.attributeId);
        expect(attributeAfterRollback!.deletionInfo).toBeUndefined();
    });

    test("runs all processor methods for a succeeded attribute", async function () {
        const predecessorOwnSharedRelationshipAttribute = await consumptionController.attributes.createAttributeUnsafe({
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
                sourceReference: CoreId.from("reqRef")
            }
        });

        const successorParams: IAttributeSuccessorParams = {
            content: RelationshipAttribute.from({
                key: "customerId",
                value: {
                    "@type": "ProprietaryString",
                    value: "1337",
                    title: "Customer ID"
                },
                owner: testAccount.identity.address,
                confidentiality: RelationshipAttributeConfidentiality.Public
            }),
            shareInfo: {
                peer: CoreAddress.from("peer"),
                sourceReference: CoreId.from("reqRefB")
            }
        };

        const { successor: successorOwnSharedRelationshipAttribute } = await consumptionController.attributes.succeedOwnSharedRelationshipAttribute(
            predecessorOwnSharedRelationshipAttribute.id,
            successorParams
        );

        const notificationItem = PeerRelationshipAttributeDeletedByPeerNotificationItem.from({
            attributeId: successorOwnSharedRelationshipAttribute.id
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
        const processor = new PeerRelationshipAttributeDeletedByPeerNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(PeerRelationshipAttributeDeletedByPeerEvent);

        const updatedPredecessor = await consumptionController.attributes.getLocalAttribute(predecessorOwnSharedRelationshipAttribute.id);
        expect(updatedPredecessor!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const predecessorAfterRollback = await consumptionController.attributes.getLocalAttribute(predecessorOwnSharedRelationshipAttribute.id);
        expect(predecessorAfterRollback!.deletionInfo).toBeUndefined();
    });

    test("runs all processor methods for an unknown attribute", async function () {
        const unknownAttributeId = CoreId.from("ATT");

        const notificationItem = PeerRelationshipAttributeDeletedByPeerNotificationItem.from({
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
        const processor = new PeerRelationshipAttributeDeletedByPeerNotificationItemProcessor(consumptionController);

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
                sourceReference: CoreId.from("reqRef"),
                sourceAttribute: CoreId.from("repositoryAttribute")
            }
        });

        const notificationItem = PeerRelationshipAttributeDeletedByPeerNotificationItem.from({
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
        const processor = new PeerRelationshipAttributeDeletedByPeerNotificationItemProcessor(consumptionController);

        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult).errorValidationResult({
            code: "error.consumption.attributes.senderIsNotPeerOfSharedAttribute"
        });
    });
});
