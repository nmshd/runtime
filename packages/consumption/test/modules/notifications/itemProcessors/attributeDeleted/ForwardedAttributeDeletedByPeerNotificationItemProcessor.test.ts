import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { ForwardedAttributeDeletedByPeerNotificationItem, IdentityAttribute, Notification, RelationshipAttribute, RelationshipAttributeConfidentiality } from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import {
    ConsumptionController,
    EmittedAttributeDeletionInfo,
    EmittedAttributeDeletionStatus,
    ForwardedAttributeDeletedByPeerEvent,
    ForwardedAttributeDeletedByPeerNotificationItemProcessor,
    LocalNotification,
    LocalNotificationSource,
    LocalNotificationStatus,
    OwnIdentityAttribute,
    OwnRelationshipAttribute,
    PeerRelationshipAttribute
} from "../../../../../src";
import { TestUtil } from "../../../../core/TestUtil";
import { MockEventBus } from "../../../MockEventBus";

const mockEventBus = new MockEventBus();

describe("ForwardedAttributeDeletedByPeerNotificationItemProcessor", function () {
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

    test("runs all processor methods for an own IdentityAttribute", async function () {
        const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
            content: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "aBirthName"
                },
                owner: testAccount.identity.address
            })
        });
        await consumptionController.attributes.addForwardedSharingInfoToAttribute(ownIdentityAttribute, CoreAddress.from("peer"), CoreId.from("reqRef"));

        const notificationItem = ForwardedAttributeDeletedByPeerNotificationItem.from({ attributeId: ownIdentityAttribute.id });
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
        const processor = new ForwardedAttributeDeletedByPeerNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(ForwardedAttributeDeletedByPeerEvent);
        const updatedAttribute = (event as ForwardedAttributeDeletedByPeerEvent).data as OwnIdentityAttribute;
        expect(notificationItem.attributeId.equals(updatedAttribute.id)).toBe(true);
        expect(updatedAttribute.forwardedSharingInfos![0].deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.DeletedByPeer);

        const databaseAttribute = (await consumptionController.attributes.getLocalAttribute(updatedAttribute.id)) as OwnIdentityAttribute;
        expect(databaseAttribute.forwardedSharingInfos![0].deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.DeletedByPeer);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const attributeAfterRollback = (await consumptionController.attributes.getLocalAttribute(notificationItem.attributeId)) as OwnIdentityAttribute;
        expect(attributeAfterRollback.forwardedSharingInfos![0].deletionInfo).toBeUndefined();
    });

    test("runs all processor methods for an own RelationshipAttribute", async function () {
        const peerRelationshipAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
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
            peer: CoreAddress.from("initialPeer"),
            sourceReference: CoreId.from("reqRef")
        });
        await consumptionController.attributes.addForwardedSharingInfoToAttribute(peerRelationshipAttribute, CoreAddress.from("thirdParty"), CoreId.from("reRef2"));

        const notificationItem = ForwardedAttributeDeletedByPeerNotificationItem.from({ attributeId: peerRelationshipAttribute.id });
        const notification = LocalNotification.from({
            id: CoreId.from("notificationRef"),
            source: LocalNotificationSource.from({ type: "Message", reference: CoreId.from("messageRef") }),
            status: LocalNotificationStatus.Open,
            isOwn: false,
            peer: CoreAddress.from("thirdParty"),
            createdAt: CoreDate.utc(),
            content: Notification.from({ id: CoreId.from("notificationRef"), items: [notificationItem] }),
            receivedByDevice: CoreId.from("deviceId")
        });
        const processor = new ForwardedAttributeDeletedByPeerNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(ForwardedAttributeDeletedByPeerEvent);
        const updatedAttribute = (event as ForwardedAttributeDeletedByPeerEvent).data as OwnRelationshipAttribute;
        expect(notificationItem.attributeId.equals(updatedAttribute.id)).toBe(true);
        expect(updatedAttribute.forwardedSharingInfos![0].deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.DeletedByPeer);

        const databaseAttribute = (await consumptionController.attributes.getLocalAttribute(updatedAttribute.id)) as OwnRelationshipAttribute;
        expect(databaseAttribute.forwardedSharingInfos![0].deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.DeletedByPeer);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const attributeAfterRollback = (await consumptionController.attributes.getLocalAttribute(notificationItem.attributeId)) as OwnRelationshipAttribute;
        expect(attributeAfterRollback.forwardedSharingInfos![0].deletionInfo).toBeUndefined();
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
                owner: CoreAddress.from("initialPeer"),
                confidentiality: RelationshipAttributeConfidentiality.Public
            }),
            peer: CoreAddress.from("initialPeer"),
            sourceReference: CoreId.from("reqRef")
        });
        await consumptionController.attributes.addForwardedSharingInfoToAttribute(peerRelationshipAttribute, CoreAddress.from("thirdParty"), CoreId.from("reRef2"));

        const notificationItem = ForwardedAttributeDeletedByPeerNotificationItem.from({ attributeId: peerRelationshipAttribute.id });
        const notification = LocalNotification.from({
            id: CoreId.from("notificationRef"),
            source: LocalNotificationSource.from({ type: "Message", reference: CoreId.from("messageRef") }),
            status: LocalNotificationStatus.Open,
            isOwn: false,
            peer: CoreAddress.from("thirdParty"),
            createdAt: CoreDate.utc(),
            content: Notification.from({ id: CoreId.from("notificationRef"), items: [notificationItem] }),
            receivedByDevice: CoreId.from("deviceId")
        });
        const processor = new ForwardedAttributeDeletedByPeerNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(ForwardedAttributeDeletedByPeerEvent);
        const updatedAttribute = (event as ForwardedAttributeDeletedByPeerEvent).data as PeerRelationshipAttribute;
        expect(notificationItem.attributeId.equals(updatedAttribute.id)).toBe(true);
        expect(updatedAttribute.forwardedSharingInfos![0].deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.DeletedByPeer);

        const databaseAttribute = (await consumptionController.attributes.getLocalAttribute(updatedAttribute.id)) as PeerRelationshipAttribute;
        expect(databaseAttribute.forwardedSharingInfos![0].deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.DeletedByPeer);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const attributeAfterRollback = (await consumptionController.attributes.getLocalAttribute(notificationItem.attributeId)) as PeerRelationshipAttribute;
        expect(attributeAfterRollback.forwardedSharingInfos![0].deletionInfo).toBeUndefined();
    });

    test("runs all processor methods for an attribute that is to be deleted by peer", async function () {
        const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
            content: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "aBirthName"
                },
                owner: testAccount.identity.address
            })
        });
        await consumptionController.attributes.addForwardedSharingInfoToAttribute(ownIdentityAttribute, CoreAddress.from("peer"), CoreId.from("reqRef"));

        await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(
            ownIdentityAttribute,
            EmittedAttributeDeletionInfo.from({ deletionStatus: EmittedAttributeDeletionStatus.ToBeDeletedByPeer, deletionDate: CoreDate.utc().add({ days: 1 }) }),
            CoreAddress.from("peer")
        );

        const notificationItem = ForwardedAttributeDeletedByPeerNotificationItem.from({ attributeId: ownIdentityAttribute.id });
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
        const processor = new ForwardedAttributeDeletedByPeerNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(ForwardedAttributeDeletedByPeerEvent);
        const updatedAttribute = (event as ForwardedAttributeDeletedByPeerEvent).data as OwnIdentityAttribute;
        expect(notificationItem.attributeId.equals(updatedAttribute.id)).toBe(true);
        expect(updatedAttribute.forwardedSharingInfos![0].deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.DeletedByPeer);

        const databaseAttribute = (await consumptionController.attributes.getLocalAttribute(updatedAttribute.id)) as OwnIdentityAttribute;
        expect(databaseAttribute.forwardedSharingInfos![0].deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.DeletedByPeer);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const attributeAfterRollback = (await consumptionController.attributes.getLocalAttribute(notificationItem.attributeId)) as OwnIdentityAttribute;
        expect(attributeAfterRollback.forwardedSharingInfos![0].deletionInfo).toBeUndefined();
    });

    test("runs all processor methods for a succeeded attribute", async function () {
        const predecessorOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
            content: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "aBirthName"
                },
                owner: testAccount.identity.address
            })
        });
        await consumptionController.attributes.addForwardedSharingInfoToAttribute(predecessorOwnIdentityAttribute, CoreAddress.from("peer"), CoreId.from("reqRef"));

        const { successor: successorOwnIdentityAttribute } = await consumptionController.attributes.succeedOwnIdentityAttribute(predecessorOwnIdentityAttribute, {
            content: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "anotherBirthName"
                },
                owner: testAccount.identity.address
            })
        });
        await consumptionController.attributes.addForwardedSharingInfoToAttribute(successorOwnIdentityAttribute, CoreAddress.from("peer"), CoreId.from("notRef"));

        const notificationItem = ForwardedAttributeDeletedByPeerNotificationItem.from({ attributeId: successorOwnIdentityAttribute.id });
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
        const processor = new ForwardedAttributeDeletedByPeerNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(ForwardedAttributeDeletedByPeerEvent);

        const updatedPredecessor = (await consumptionController.attributes.getLocalAttribute(predecessorOwnIdentityAttribute.id)) as OwnIdentityAttribute;
        expect(updatedPredecessor.forwardedSharingInfos![0].deletionInfo!.deletionStatus).toStrictEqual(EmittedAttributeDeletionStatus.DeletedByPeer);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const predecessorAfterRollback = (await consumptionController.attributes.getLocalAttribute(predecessorOwnIdentityAttribute.id)) as OwnIdentityAttribute;
        expect(predecessorAfterRollback.forwardedSharingInfos![0].deletionInfo).toBeUndefined();
    });

    test("runs all processor methods for an unknown attribute", async function () {
        const unknownAttributeId = CoreId.from("ATT");

        const notificationItem = ForwardedAttributeDeletedByPeerNotificationItem.from({ attributeId: unknownAttributeId });
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
        const processor = new ForwardedAttributeDeletedByPeerNotificationItemProcessor(consumptionController);

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
            id: CoreId.from("anId")
        });

        const notificationItem = ForwardedAttributeDeletedByPeerNotificationItem.from({ attributeId: peerIdentityAttribute.id });

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
        const processor = new ForwardedAttributeDeletedByPeerNotificationItemProcessor(consumptionController);

        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult).errorValidationResult({ code: "error.consumption.attributes.wrongTypeOfAttribute" });
    });

    test("should throw if sender is not peer of Attribute", async function () {
        const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
            content: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "aBirthName"
                },
                owner: testAccount.identity.address
            })
        });
        await consumptionController.attributes.addForwardedSharingInfoToAttribute(ownIdentityAttribute, CoreAddress.from("otherPeer"), CoreId.from("reqRef"));

        const notificationItem = ForwardedAttributeDeletedByPeerNotificationItem.from({ attributeId: ownIdentityAttribute.id });

        const notification = LocalNotification.from({
            id: CoreId.from("notificationRef"),
            source: LocalNotificationSource.from({ type: "Message", reference: CoreId.from("messageRef") }),
            status: LocalNotificationStatus.Open,
            isOwn: false,
            peer: CoreAddress.from("naughtyPeer"),
            createdAt: CoreDate.utc(),
            content: Notification.from({ id: CoreId.from("notificationRef"), items: [notificationItem] }),
            receivedByDevice: CoreId.from("deviceId")
        });
        const processor = new ForwardedAttributeDeletedByPeerNotificationItemProcessor(consumptionController);

        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult).errorValidationResult({ code: "error.consumption.attributes.senderIsNotPeerOfSharedAttribute" });
    });
});
