import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { Notification, PeerRelationshipAttributeDeletedByPeerNotificationItem, RelationshipAttribute, RelationshipAttributeConfidentiality } from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import {
    ConsumptionController,
    EmittedAttributeDeletionInfo,
    EmittedAttributeDeletionStatus,
    LocalNotification,
    LocalNotificationSource,
    LocalNotificationStatus,
    OwnRelationshipAttribute,
    PeerRelationshipAttributeDeletedByPeerEvent,
    PeerRelationshipAttributeDeletedByPeerNotificationItemProcessor,
    ReceivedAttributeDeletionStatus,
    ThirdPartyRelationshipAttribute
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
        await TestUtil.cleanupAttributes(consumptionController);
        mockEventBus.clearPublishedEvents();
    });

    test("runs all processor methods for an OwnRelationshipAttribute", async function () {
        const ownRelationshipAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
            content: RelationshipAttribute.from({
                key: "aKey",
                value: {
                    "@type": "ProprietaryString",
                    value: "aValue",
                    title: "aTitle"
                },
                owner: testAccount.identity.address,
                confidentiality: RelationshipAttributeConfidentiality.Public
            }),
            peer: CoreAddress.from("peer"),
            sourceReference: CoreId.from("reqRef")
        });

        const notificationItem = PeerRelationshipAttributeDeletedByPeerNotificationItem.from({
            attributeId: ownRelationshipAttribute.id
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
        const updatedAttribute = (event as PeerRelationshipAttributeDeletedByPeerEvent).data as OwnRelationshipAttribute;
        expect(notificationItem.attributeId.equals(updatedAttribute.id)).toBe(true);
        expect(updatedAttribute.peerSharingDetails.deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.DeletedByRecipient);

        const databaseAttribute = (await consumptionController.attributes.getLocalAttribute(updatedAttribute.id)) as OwnRelationshipAttribute;
        expect(databaseAttribute.peerSharingDetails.deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.DeletedByRecipient);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const attributeAfterRollback = (await consumptionController.attributes.getLocalAttribute(notificationItem.attributeId)) as OwnRelationshipAttribute;
        expect(attributeAfterRollback.peerSharingDetails.deletionInfo).toBeUndefined();
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
                owner: CoreAddress.from("initialAttributePeer"),
                confidentiality: RelationshipAttributeConfidentiality.Public
            }),
            peer: CoreAddress.from("peer"),
            sourceReference: CoreId.from("reqRef"),
            initialAttributePeer: CoreAddress.from("initialAttributePeer"),
            id: CoreId.from("attributeId")
        });

        const notificationItem = PeerRelationshipAttributeDeletedByPeerNotificationItem.from({
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
        const processor = new PeerRelationshipAttributeDeletedByPeerNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(PeerRelationshipAttributeDeletedByPeerEvent);
        const updatedAttribute = (event as PeerRelationshipAttributeDeletedByPeerEvent).data as ThirdPartyRelationshipAttribute;
        expect(notificationItem.attributeId.equals(updatedAttribute.id)).toBe(true);
        expect(updatedAttribute.peerSharingDetails.deletionInfo!.deletionStatus).toStrictEqual(ReceivedAttributeDeletionStatus.DeletedByEmitter);

        const databaseAttribute = (await consumptionController.attributes.getLocalAttribute(updatedAttribute.id)) as ThirdPartyRelationshipAttribute;
        expect(databaseAttribute.peerSharingDetails.deletionInfo!.deletionStatus).toStrictEqual(ReceivedAttributeDeletionStatus.DeletedByEmitter);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const attributeAfterRollback = (await consumptionController.attributes.getLocalAttribute(notificationItem.attributeId)) as ThirdPartyRelationshipAttribute;
        expect(attributeAfterRollback.peerSharingDetails.deletionInfo).toBeUndefined();
    });

    test("runs all processor methods for an attribute that is to be deleted by peer", async function () {
        const ownRelationshipAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
            content: RelationshipAttribute.from({
                key: "aKey",
                value: {
                    "@type": "ProprietaryString",
                    value: "aValue",
                    title: "aTitle"
                },
                owner: testAccount.identity.address,
                confidentiality: RelationshipAttributeConfidentiality.Public
            }),
            peer: CoreAddress.from("peer"),
            sourceReference: CoreId.from("reqRef")
        });

        await consumptionController.attributes.setPeerDeletionInfoOfOwnRelationshipAttribute(
            ownRelationshipAttribute,
            EmittedAttributeDeletionInfo.from({ deletionStatus: EmittedAttributeDeletionStatus.ToBeDeletedByRecipient, deletionDate: CoreDate.utc().add({ days: 1 }) })
        );

        const notificationItem = PeerRelationshipAttributeDeletedByPeerNotificationItem.from({
            attributeId: ownRelationshipAttribute.id
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
        const updatedAttribute = (event as PeerRelationshipAttributeDeletedByPeerEvent).data as OwnRelationshipAttribute;
        expect(notificationItem.attributeId.equals(updatedAttribute.id)).toBe(true);
        expect(updatedAttribute.peerSharingDetails.deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.DeletedByRecipient);

        const databaseAttribute = (await consumptionController.attributes.getLocalAttribute(updatedAttribute.id)) as OwnRelationshipAttribute;
        expect(databaseAttribute.peerSharingDetails.deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.DeletedByRecipient);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const attributeAfterRollback = (await consumptionController.attributes.getLocalAttribute(notificationItem.attributeId)) as OwnRelationshipAttribute;
        expect(attributeAfterRollback.peerSharingDetails.deletionInfo).toBeUndefined();
    });

    test("runs all processor methods for a succeeded attribute", async function () {
        const predecessorOwnRelationshipAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
            content: RelationshipAttribute.from({
                key: "aKey",
                value: {
                    "@type": "ProprietaryString",
                    value: "aValue",
                    title: "aTitle"
                },
                owner: testAccount.identity.address,
                confidentiality: RelationshipAttributeConfidentiality.Public
            }),
            peer: CoreAddress.from("peer"),
            sourceReference: CoreId.from("reqRef")
        });

        const { successor: successorOwnRelationshipAttribute } = await consumptionController.attributes.succeedOwnRelationshipAttribute(predecessorOwnRelationshipAttribute, {
            content: RelationshipAttribute.from({
                key: "aKey",
                value: {
                    "@type": "ProprietaryString",
                    value: "anotherValue",
                    title: "aTitle"
                },
                owner: testAccount.identity.address,
                confidentiality: RelationshipAttributeConfidentiality.Public
            }),
            sourceReference: CoreId.from("reqRefB")
        });

        const notificationItem = PeerRelationshipAttributeDeletedByPeerNotificationItem.from({
            attributeId: successorOwnRelationshipAttribute.id
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

        const updatedPredecessor = (await consumptionController.attributes.getLocalAttribute(predecessorOwnRelationshipAttribute.id)) as OwnRelationshipAttribute;
        expect(updatedPredecessor.peerSharingDetails.deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.DeletedByRecipient);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const predecessorAfterRollback = (await consumptionController.attributes.getLocalAttribute(predecessorOwnRelationshipAttribute.id)) as OwnRelationshipAttribute;
        expect(predecessorAfterRollback.peerSharingDetails.deletionInfo).toBeUndefined();
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

    test("should throw if Attribute type is wrong", async function () {
        const peerRelationshipAttribute = await consumptionController.attributes.createPeerRelationshipAttribute({
            content: RelationshipAttribute.from({
                key: "aKey",
                value: {
                    "@type": "ProprietaryString",
                    value: "aValue",
                    title: "aTitle"
                },
                owner: CoreAddress.from("otherPeer"),
                confidentiality: RelationshipAttributeConfidentiality.Public
            }),
            peer: CoreAddress.from("otherPeer"),
            sourceReference: CoreId.from("reqRef")
        });

        const notificationItem = PeerRelationshipAttributeDeletedByPeerNotificationItem.from({ attributeId: peerRelationshipAttribute.id });

        const notification = LocalNotification.from({
            id: CoreId.from("notificationRef"),
            source: LocalNotificationSource.from({ type: "Message", reference: CoreId.from("messageRef") }),
            status: LocalNotificationStatus.Open,
            isOwn: false,
            peer: CoreAddress.from("peer"),
            createdAt: CoreDate.utc(),
            content: Notification.from({ id: CoreId.from("notificationRef"), items: [notificationItem] }),
            receivedByDevice: CoreId.from("deviceId")
        });
        const processor = new PeerRelationshipAttributeDeletedByPeerNotificationItemProcessor(consumptionController);

        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult).errorValidationResult({ code: "error.consumption.attributes.wrongTypeOfAttribute" });
    });

    test("should throw if sender is not peer of Attribute", async function () {
        const ownRelationshipAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
            content: RelationshipAttribute.from({
                key: "aKey",
                value: {
                    "@type": "ProprietaryString",
                    value: "aValue",
                    title: "aTitle"
                },
                owner: testAccount.identity.address,
                confidentiality: RelationshipAttributeConfidentiality.Public
            }),
            peer: CoreAddress.from("otherPeer"),
            sourceReference: CoreId.from("reqRef")
        });

        const notificationItem = PeerRelationshipAttributeDeletedByPeerNotificationItem.from({
            attributeId: ownRelationshipAttribute.id
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
