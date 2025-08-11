import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { IdentityAttribute, Notification, OwnAttributeDeletedByOwnerNotificationItem, RelationshipAttribute, RelationshipAttributeConfidentiality } from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import {
    ConsumptionController,
    LocalNotification,
    LocalNotificationSource,
    LocalNotificationStatus,
    OwnAttributeDeletedByOwnerEvent,
    OwnAttributeDeletedByOwnerNotificationItemProcessor,
    PeerIdentityAttribute,
    PeerRelationshipAttribute,
    ReceivedAttributeDeletionInfo,
    ReceivedAttributeDeletionStatus,
    ThirdPartyRelationshipAttribute,
    ThirdPartyRelationshipAttributeDeletionStatus
} from "../../../../../src";
import { TestUtil } from "../../../../core/TestUtil";
import { MockEventBus } from "../../../MockEventBus";

const mockEventBus = new MockEventBus();

describe("OwnAttributeDeletedByPeerNotificationItemProcessor", function () {
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
        TestUtil.cleanupAttributes(consumptionController);
        mockEventBus.clearPublishedEvents();
    });

    afterEach(async function () {
        const attributes = await consumptionController.attributes.getLocalAttributes();

        for (const attribute of attributes) {
            await consumptionController.attributes.deleteAttribute(attribute);
        }
    });

    test("runs all processor methods for a peer IdentityAttribute", async function () {
        const peerIdentityAttribute = await consumptionController.attributes.createPeerIdentityAttribute({
            content: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "aBirthName"
                },
                owner: CoreAddress.from("peer")
            }),
            peer: CoreAddress.from("peer"),
            sourceReference: CoreId.from("reqRef"),
            id: CoreId.from("attributeId")
        });

        const notificationItem = OwnAttributeDeletedByOwnerNotificationItem.from({
            attributeId: peerIdentityAttribute.id
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
        const processor = new OwnAttributeDeletedByOwnerNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(OwnAttributeDeletedByOwnerEvent);
        const updatedAttribute = (event as OwnAttributeDeletedByOwnerEvent).data as PeerIdentityAttribute;
        expect(notificationItem.attributeId.equals(updatedAttribute.id)).toBe(true);
        expect(updatedAttribute.peerSharingInfo.deletionInfo!.deletionStatus).toStrictEqual(ReceivedAttributeDeletionStatus.DeletedByOwner);

        const databaseAttribute = (await consumptionController.attributes.getLocalAttribute(updatedAttribute.id)) as PeerIdentityAttribute;
        expect(databaseAttribute.peerSharingInfo.deletionInfo!.deletionStatus).toStrictEqual(ReceivedAttributeDeletionStatus.DeletedByOwner);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const attributeAfterRollback = (await consumptionController.attributes.getLocalAttribute(notificationItem.attributeId)) as PeerIdentityAttribute;
        expect(attributeAfterRollback.peerSharingInfo.deletionInfo).toBeUndefined();
    });

    test("runs all processor methods for a peer RelationshipAttribute", async function () {
        const peerRelationshipAttribute = await consumptionController.attributes.createPeerRelationshipAttribute({
            content: RelationshipAttribute.from({
                key: "aKey",
                value: {
                    "@type": "ProprietaryString",
                    value: "aValue",
                    title: "aTitle"
                },
                owner: CoreAddress.from("peer"),
                confidentiality: RelationshipAttributeConfidentiality.Public
            }),
            peer: CoreAddress.from("peer"),
            sourceReference: CoreId.from("reqRef")
        });

        const notificationItem = OwnAttributeDeletedByOwnerNotificationItem.from({
            attributeId: peerRelationshipAttribute.id
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
        const processor = new OwnAttributeDeletedByOwnerNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(OwnAttributeDeletedByOwnerEvent);
        const updatedAttribute = (event as OwnAttributeDeletedByOwnerEvent).data as PeerRelationshipAttribute;
        expect(notificationItem.attributeId.equals(updatedAttribute.id)).toBe(true);
        expect(updatedAttribute.peerSharingInfo.deletionInfo!.deletionStatus).toStrictEqual(ReceivedAttributeDeletionStatus.DeletedByOwner);

        const databaseAttribute = (await consumptionController.attributes.getLocalAttribute(updatedAttribute.id)) as PeerRelationshipAttribute;
        expect(databaseAttribute.peerSharingInfo.deletionInfo!.deletionStatus).toStrictEqual(ReceivedAttributeDeletionStatus.DeletedByOwner);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const attributeAfterRollback = (await consumptionController.attributes.getLocalAttribute(notificationItem.attributeId)) as PeerRelationshipAttribute;
        expect(attributeAfterRollback.peerSharingInfo.deletionInfo).toBeUndefined();
    });

    test("runs all processor methods for a ThirdPartyRelationshipAttribute", async function () {
        const thirdPartyRelationshipAttribute = await consumptionController.attributes.createThirdPartyRelationshipAttribute({
            content: RelationshipAttribute.from({
                key: "aKey",
                value: {
                    "@type": "ProprietaryString",
                    value: "aValue",
                    title: "aTitle"
                },
                owner: CoreAddress.from("peer"),
                confidentiality: RelationshipAttributeConfidentiality.Public
            }),
            peer: CoreAddress.from("peer"),
            sourceReference: CoreId.from("reqRef"),
            initialAttributePeer: CoreAddress.from("initialAttributePeer"),
            id: CoreId.from("attributeId")
        });

        const notificationItem = OwnAttributeDeletedByOwnerNotificationItem.from({
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
        const processor = new OwnAttributeDeletedByOwnerNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(OwnAttributeDeletedByOwnerEvent);
        const updatedAttribute = (event as OwnAttributeDeletedByOwnerEvent).data as ThirdPartyRelationshipAttribute;
        expect(notificationItem.attributeId.equals(updatedAttribute.id)).toBe(true);
        expect(updatedAttribute.peerSharingInfo.deletionInfo!.deletionStatus).toStrictEqual(ThirdPartyRelationshipAttributeDeletionStatus.DeletedByOwner);

        const databaseAttribute = (await consumptionController.attributes.getLocalAttribute(updatedAttribute.id)) as ThirdPartyRelationshipAttribute;
        expect(databaseAttribute.peerSharingInfo.deletionInfo!.deletionStatus).toStrictEqual(ThirdPartyRelationshipAttributeDeletionStatus.DeletedByOwner);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const attributeAfterRollback = (await consumptionController.attributes.getLocalAttribute(notificationItem.attributeId)) as ThirdPartyRelationshipAttribute;
        expect(attributeAfterRollback.peerSharingInfo.deletionInfo).toBeUndefined();
    });

    test("runs all processor methods for an attribute that is to be deleted", async function () {
        const peerIdentityAttribute = await consumptionController.attributes.createPeerIdentityAttribute({
            content: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "aBirthName"
                },
                owner: CoreAddress.from("peer")
            }),
            peer: CoreAddress.from("peer"),
            sourceReference: CoreId.from("reqRef"),
            id: CoreId.from("attributeId")
        });

        await consumptionController.attributes.setPeerDeletionInfoOfPeerAttribute(
            [peerIdentityAttribute],
            ReceivedAttributeDeletionInfo.from({
                deletionStatus: ReceivedAttributeDeletionStatus.ToBeDeleted,
                deletionDate: CoreDate.utc().subtract({ days: 1 })
            })
        );

        const notificationItem = OwnAttributeDeletedByOwnerNotificationItem.from({
            attributeId: peerIdentityAttribute.id
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
        const processor = new OwnAttributeDeletedByOwnerNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(OwnAttributeDeletedByOwnerEvent);
        const updatedAttribute = (event as OwnAttributeDeletedByOwnerEvent).data as PeerIdentityAttribute;
        expect(notificationItem.attributeId.equals(updatedAttribute.id)).toBe(true);
        expect(updatedAttribute.peerSharingInfo.deletionInfo!.deletionStatus).toStrictEqual(ReceivedAttributeDeletionStatus.ToBeDeleted);

        const databaseAttribute = (await consumptionController.attributes.getLocalAttribute(updatedAttribute.id)) as PeerIdentityAttribute;
        expect(databaseAttribute.peerSharingInfo.deletionInfo!.deletionStatus).toStrictEqual(ReceivedAttributeDeletionStatus.ToBeDeleted);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const attributeAfterRollback = (await consumptionController.attributes.getLocalAttribute(notificationItem.attributeId)) as PeerIdentityAttribute;
        expect(attributeAfterRollback.peerSharingInfo.deletionInfo).toBeUndefined();
    });

    test("runs all processor methods for a succeeded attribute", async function () {
        const predecessorPeerIdentityAttribute = await consumptionController.attributes.createPeerIdentityAttribute({
            content: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "aBirthName"
                },
                owner: CoreAddress.from("peer")
            }),
            peer: CoreAddress.from("peer"),
            sourceReference: CoreId.from("requestId"),
            id: CoreId.from("attributeId")
        });

        const { successor: successorPeerSharedIdentityAttribute } = await consumptionController.attributes.succeedPeerIdentityAttribute(predecessorPeerIdentityAttribute, {
            content: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "anotherBirthName"
                },
                owner: CoreAddress.from("peer")
            }),
            peerSharingInfo: {
                peer: CoreAddress.from("peer"),
                sourceReference: CoreId.from("notRef")
            },
            id: CoreId.from("succeededAttributeId")
        });

        const notificationItem = OwnAttributeDeletedByOwnerNotificationItem.from({
            attributeId: successorPeerSharedIdentityAttribute.id
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
        const processor = new OwnAttributeDeletedByOwnerNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(OwnAttributeDeletedByOwnerEvent);

        const updatedPredecessor = (await consumptionController.attributes.getLocalAttribute(predecessorPeerIdentityAttribute.id)) as PeerIdentityAttribute;
        expect(updatedPredecessor.peerSharingInfo.deletionInfo!.deletionStatus).toStrictEqual(ReceivedAttributeDeletionStatus.DeletedByOwner);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const predecessorAfterRollback = (await consumptionController.attributes.getLocalAttribute(predecessorPeerIdentityAttribute.id)) as PeerIdentityAttribute;
        expect(predecessorAfterRollback.peerSharingInfo.deletionInfo).toBeUndefined();
    });

    test("runs all processor methods for an unknown attribute", async function () {
        const unknownAttributeId = CoreId.from("ATT");

        const notificationItem = OwnAttributeDeletedByOwnerNotificationItem.from({
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
        const processor = new OwnAttributeDeletedByOwnerNotificationItemProcessor(consumptionController);

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

    test("should throw if sender is not peer of Attribute", async function () {
        const peerIdentityAttribute = await consumptionController.attributes.createPeerIdentityAttribute({
            content: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "aBirthName"
                },
                owner: CoreAddress.from("otherPeer")
            }),
            peer: CoreAddress.from("otherPeer"),
            sourceReference: CoreId.from("reqRef"),
            id: CoreId.from("attributeId")
        });

        const notificationItem = OwnAttributeDeletedByOwnerNotificationItem.from({
            attributeId: peerIdentityAttribute.id
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
        const processor = new OwnAttributeDeletedByOwnerNotificationItemProcessor(consumptionController);

        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult).errorValidationResult({
            code: "error.consumption.attributes.senderIsNotPeerOfSharedAttribute"
        });
    });
});
