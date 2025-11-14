import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import {
    AttributeSucceededEvent,
    ConsumptionController,
    LocalNotification,
    LocalNotificationSource,
    LocalNotificationStatus,
    PeerAttributeSucceededNotificationItemProcessor
} from "@nmshd/consumption";
import { IdentityAttribute, Notification, PeerAttributeSucceededNotificationItem, RelationshipAttribute, RelationshipAttributeConfidentiality } from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import { TestUtil } from "../../../../core/TestUtil.js";
import { MockEventBus } from "../../../MockEventBus.js";

const mockEventBus = new MockEventBus();

describe("PeerAttributeSucceededNotificationItemProcessor", function () {
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

    test("runs all processor methods for a PeerIdentityAttribute", async function () {
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

        const notificationItem = PeerAttributeSucceededNotificationItem.from({
            predecessorId: peerIdentityAttribute.id,
            successorId: CoreId.from("newAttributeId"),
            successorContent: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "anotherBirthName"
                },
                owner: CoreAddress.from("peer")
            })
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
        const processor = new PeerAttributeSucceededNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(AttributeSucceededEvent);
        const { predecessor, successor } = event.data;
        expect(notificationItem.successorId.equals(successor.id)).toBe(true);
        expect(notificationItem.predecessorId.equals(predecessor.id)).toBe(true);
        expect(predecessor.succeededBy?.equals(successor.id)).toBe(true);
        expect(successor.succeeds?.equals(predecessor.id)).toBe(true);
        expect(peerIdentityAttribute.id.equals(predecessor.id)).toBe(true);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const successorAfterRollback = await consumptionController.attributes.getLocalAttribute(notificationItem.successorId);
        expect(successorAfterRollback).toBeUndefined();
        const predecessorAfterRollback = await consumptionController.attributes.getLocalAttribute(notificationItem.predecessorId);
        expect(predecessorAfterRollback).toBeDefined();
        expect(predecessorAfterRollback!.succeededBy).toBeUndefined();
    });

    test("runs all processor methods for a PeerRelationshipAttribute", async function () {
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

        const notificationItem = PeerAttributeSucceededNotificationItem.from({
            predecessorId: peerRelationshipAttribute.id,
            successorId: CoreId.from("newAttributeId"),
            successorContent: RelationshipAttribute.from({
                key: "aKey",
                value: {
                    "@type": "ProprietaryString",
                    value: "anotherValue",
                    title: "aTitle"
                },
                owner: CoreAddress.from("peer"),
                confidentiality: RelationshipAttributeConfidentiality.Public
            })
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
        const processor = new PeerAttributeSucceededNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(AttributeSucceededEvent);
        const { predecessor, successor } = event.data;
        expect(notificationItem.successorId.equals(successor.id)).toBe(true);
        expect(notificationItem.predecessorId.equals(predecessor.id)).toBe(true);
        expect(predecessor.succeededBy?.equals(successor.id)).toBe(true);
        expect(successor.succeeds?.equals(predecessor.id)).toBe(true);
        expect(peerRelationshipAttribute.id.equals(predecessor.id)).toBe(true);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const successorAfterRollback = await consumptionController.attributes.getLocalAttribute(notificationItem.successorId);
        expect(successorAfterRollback).toBeUndefined();
        const predecessorAfterRollback = await consumptionController.attributes.getLocalAttribute(notificationItem.predecessorId);
        expect(predecessorAfterRollback).toBeDefined();
        expect(predecessorAfterRollback!.succeededBy).toBeUndefined();
    });

    test("should throw if Attribute type is wrong", async function () {
        const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
            content: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "aBirthName"
                },
                owner: testAccount.identity.address
            })
        });

        const notificationItem = PeerAttributeSucceededNotificationItem.from({
            predecessorId: ownIdentityAttribute.id,
            successorId: CoreId.from("newAttributeId"),
            successorContent: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "anotherBirthName"
                },
                owner: CoreAddress.from("peer")
            })
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
        const processor = new PeerAttributeSucceededNotificationItemProcessor(consumptionController);

        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult).errorValidationResult({
            code: "error.consumption.attributes.wrongTypeOfAttribute",
            message: `The Attribute ${notificationItem.predecessorId} is not a PeerIdentityAttribute or a PeerRelationshipAttribute.`
        });
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

        const notificationItem = PeerAttributeSucceededNotificationItem.from({
            predecessorId: peerIdentityAttribute.id,
            successorId: CoreId.from("newAttributeId"),
            successorContent: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "anotherBirthName"
                },
                owner: CoreAddress.from("otherPeer")
            })
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
        const processor = new PeerAttributeSucceededNotificationItemProcessor(consumptionController);

        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult).errorValidationResult({
            code: "error.consumption.attributes.successionPeerIsNotOwner",
            message: "The peer of the succeeded Attribute is not its owner. This may be an attempt of spoofing."
        });
    });
});
