import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { IdentityAttribute, Notification, PeerSharedAttributeSucceededNotificationItem, RelationshipAttribute, RelationshipAttributeConfidentiality } from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import {
    ConsumptionController,
    LocalNotification,
    LocalNotificationSource,
    LocalNotificationStatus,
    PeerSharedAttributeSucceededEvent,
    PeerSharedAttributeSucceededNotificationItemProcessor
} from "../../../../../src";
import { TestUtil } from "../../../../core/TestUtil";
import { MockEventBus } from "../../../MockEventBus";

const mockEventBus = new MockEventBus();

describe("PeerSharedAttributeSucceededNotificationItemProcessor", function () {
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

    test("runs all processor methods for a peer shared identity attribute", async function () {
        const peerSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
            content: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "Schenkel"
                },
                owner: CoreAddress.from("peer")
            }),
            shareInfo: {
                peer: CoreAddress.from("peer"),
                sourceReference: CoreId.from("reqRef")
            }
        });

        const notificationItem = PeerSharedAttributeSucceededNotificationItem.from({
            predecessorId: peerSharedIdentityAttribute.id,
            successorId: CoreId.from("newAttributeId"),
            successorContent: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "Wade"
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
        const processor = new PeerSharedAttributeSucceededNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(PeerSharedAttributeSucceededEvent);
        const { predecessor, successor } = event.data;
        expect(notificationItem.successorId.equals(successor.id)).toBe(true);
        expect(notificationItem.predecessorId.equals(predecessor.id)).toBe(true);
        expect(predecessor.succeededBy?.equals(successor.id)).toBe(true);
        expect(successor.succeeds?.equals(predecessor.id)).toBe(true);
        expect(peerSharedIdentityAttribute.id.equals(predecessor.id)).toBe(true);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const successorAfterRollback = await consumptionController.attributes.getLocalAttribute(notificationItem.successorId);
        expect(successorAfterRollback).toBeUndefined();
        const predecessorAfterRollback = await consumptionController.attributes.getLocalAttribute(notificationItem.predecessorId);
        expect(predecessorAfterRollback).toBeDefined();
        expect(predecessorAfterRollback!.succeededBy).toBeUndefined();
    });

    test("runs all processor methods for a peer shared relationship attribute", async function () {
        const peerSharedRelationshipAttribute = await consumptionController.attributes.createAttributeUnsafe({
            content: RelationshipAttribute.from({
                key: "customerId",
                value: {
                    "@type": "ProprietaryString",
                    value: "0815",
                    title: "Customer ID"
                },
                owner: CoreAddress.from("peer"),
                confidentiality: RelationshipAttributeConfidentiality.Public
            }),
            shareInfo: {
                peer: CoreAddress.from("peer"),
                sourceReference: CoreId.from("reqRef")
            }
        });

        const notificationItem = PeerSharedAttributeSucceededNotificationItem.from({
            predecessorId: peerSharedRelationshipAttribute.id,
            successorId: CoreId.from("newAttributeId"),
            successorContent: RelationshipAttribute.from({
                key: "customerId",
                value: {
                    "@type": "ProprietaryString",
                    value: "1337",
                    title: "Customer ID"
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
        const processor = new PeerSharedAttributeSucceededNotificationItemProcessor(consumptionController);

        /* Run and check validation. */
        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult.isError()).toBe(false);

        /* Run process() and validate its results. */
        const event = await processor.process(notificationItem, notification);
        expect(event).toBeInstanceOf(PeerSharedAttributeSucceededEvent);
        const { predecessor, successor } = event.data;
        expect(notificationItem.successorId.equals(successor.id)).toBe(true);
        expect(notificationItem.predecessorId.equals(predecessor.id)).toBe(true);
        expect(predecessor.succeededBy?.equals(successor.id)).toBe(true);
        expect(successor.succeeds?.equals(predecessor.id)).toBe(true);
        expect(peerSharedRelationshipAttribute.id.equals(predecessor.id)).toBe(true);

        /* Manually trigger and verify rollback. */
        await processor.rollback(notificationItem, notification);
        const successorAfterRollback = await consumptionController.attributes.getLocalAttribute(notificationItem.successorId);
        expect(successorAfterRollback).toBeUndefined();
        const predecessorAfterRollback = await consumptionController.attributes.getLocalAttribute(notificationItem.predecessorId);
        expect(predecessorAfterRollback).toBeDefined();
        expect(predecessorAfterRollback!.succeededBy).toBeUndefined();
    });

    test("detects spoofing attempts", async function () {
        /* A naughty peer is trying to succeed attributes owned
         * not by himself, but by another peer. This must be
         * caught by the validation. */
        const peerSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
            content: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "Schenkel"
                },
                owner: CoreAddress.from("otherPeer")
            }),
            shareInfo: {
                peer: CoreAddress.from("otherPeer"),
                sourceReference: CoreId.from("reqRef")
            }
        });

        const notificationItem = PeerSharedAttributeSucceededNotificationItem.from({
            predecessorId: peerSharedIdentityAttribute.id,
            successorId: CoreId.from("newAttributeId"),
            successorContent: IdentityAttribute.from({
                value: {
                    "@type": "BirthName",
                    value: "Wade"
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
        const processor = new PeerSharedAttributeSucceededNotificationItemProcessor(consumptionController);

        const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(notificationItem, notification);
        expect(checkResult).errorValidationResult({
            code: "error.consumption.attributes.successionPeerIsNotOwner",
            message: "The peer of the succeeded Attribute is not its owner. This may be an attempt of spoofing."
        });
    });
});
