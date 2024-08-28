import { IdentityAttributeJSON, RelationshipAttribute, RelationshipAttributeConfidentiality, RelationshipAttributeJSON, ShareAttributeRequestItemJSON } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { RelationshipStatus } from "@nmshd/transport";
import { AttributeListenerCreatedEvent, OutgoingRequestCreatedEvent } from "../../src";
import {
    ensureActiveRelationship,
    establishPendingRelationshipWithRequestFlow,
    exchangeAndAcceptRequestByMessage,
    mutualDecomposeIfActiveRelationshipExists,
    RuntimeServiceProvider,
    syncUntilHasRelationships,
    TestRuntimeServices
} from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();
let sender: TestRuntimeServices;
let recipient: TestRuntimeServices;
let thirdParty: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(3, { enableAttributeListenerModule: true, enableRequestModule: true });

    sender = runtimeServices[0];
    recipient = runtimeServices[1];
    thirdParty = runtimeServices[2];

    await ensureActiveRelationship(sender.transport, recipient.transport);
    await ensureActiveRelationship(thirdParty.transport, recipient.transport);

    await exchangeAndAcceptRequestByMessage(
        sender,
        recipient,
        {
            peer: recipient.address,
            content: {
                items: [
                    {
                        "@type": "RegisterAttributeListenerRequestItem",
                        query: {
                            "@type": "IdentityAttributeQuery",
                            valueType: "GivenName"
                        },
                        mustBeAccepted: true
                    },
                    {
                        "@type": "RegisterAttributeListenerRequestItem",
                        query: {
                            "@type": "ThirdPartyRelationshipAttributeQuery",
                            key: "AKey",
                            owner: "thirdParty",
                            thirdParty: [thirdParty.address]
                        },
                        mustBeAccepted: true
                    }
                ]
            }
        },
        [{ accept: true }, { accept: true }]
    );

    await recipient.eventBus.waitForEvent(AttributeListenerCreatedEvent);
}, 30000);

beforeEach(() => runtimeServiceProvider.resetEventBusses());

afterAll(async () => await runtimeServiceProvider.stop());

describe("AttributeListenerModule", () => {
    test("creates an outgoing Request for an AttributeListener with an IdentityAttributeQuery when an IdentityAttribute is created", async () => {
        const attributeContent: IdentityAttributeJSON = {
            "@type": "IdentityAttribute",
            owner: recipient.address,
            value: { "@type": "GivenName", value: "John" }
        };

        await recipient.consumption.attributes.createRepositoryAttribute({ content: { value: attributeContent.value } });

        await expect(recipient.eventBus).toHavePublished(OutgoingRequestCreatedEvent);
        expectShareAttributeRequestItemWith(recipient, attributeContent);
    });

    test("creates an outgoing Request for an AttributeListener with a ThirdPartyRelationshipAttributeQuery when a RelationshipAttribute is created in the Relationship to a third party", async () => {
        const attributeContent: RelationshipAttributeJSON = {
            "@type": "RelationshipAttribute",
            owner: thirdParty.address,
            key: "AKey",
            confidentiality: RelationshipAttributeConfidentiality.Public,
            isTechnical: false,
            value: {
                "@type": "ProprietaryString",
                title: "ATitle",
                value: "AProprietaryStringValue"
            }
        };

        await exchangeAndAcceptRequestByMessage(
            thirdParty,
            recipient,
            {
                peer: recipient.address,
                content: {
                    items: [
                        {
                            "@type": "CreateAttributeRequestItem",
                            attribute: attributeContent,
                            mustBeAccepted: true
                        }
                    ]
                }
            },
            [{ accept: true }]
        );

        await expect(recipient.eventBus).toHavePublished(OutgoingRequestCreatedEvent);
        expectShareAttributeRequestItemWith(recipient, attributeContent);
    });
});

describe("Handling of delayed sharing of RelationshipAttributes during the ongoing process of establishing a Relationship and existing AttributeListener by the AttributeListenerModule", () => {
    const runtimeServiceProvider = new RuntimeServiceProvider();
    let sender: TestRuntimeServices;
    let recipient: TestRuntimeServices;
    let thirdParty: TestRuntimeServices;
    let inputForCreatingRelationshipAttribute: RelationshipAttributeJSON;

    beforeAll(async () => {
        const runtimeServices = await runtimeServiceProvider.launch(3, { enableAttributeListenerModule: true, enableRequestModule: true });

        sender = runtimeServices[0];
        recipient = runtimeServices[1];
        thirdParty = runtimeServices[2];
        inputForCreatingRelationshipAttribute = RelationshipAttribute.from({
            key: "AKey",
            value: {
                "@type": "ProprietaryString",
                value: "AStringValue",
                title: "ATitle"
            },
            owner: CoreAddress.from(""),
            confidentiality: RelationshipAttributeConfidentiality.Public
        }).toJSON();

        await ensureActiveRelationship(thirdParty.transport, recipient.transport);
        await exchangeAndAcceptRequestByMessage(
            thirdParty,
            recipient,
            {
                peer: recipient.address,
                content: {
                    items: [
                        {
                            "@type": "RegisterAttributeListenerRequestItem",
                            query: {
                                "@type": "ThirdPartyRelationshipAttributeQuery",
                                key: "AKey",
                                owner: "",
                                thirdParty: [sender.address]
                            },
                            mustBeAccepted: true
                        }
                    ]
                }
            },
            [{ accept: true }]
        );

        await recipient.eventBus.waitForEvent(AttributeListenerCreatedEvent);
    }, 30000);

    afterEach(async () => {
        sender.eventBus.reset();
        recipient.eventBus.reset();
        thirdParty.eventBus.reset();

        await mutualDecomposeIfActiveRelationshipExists(sender.transport, recipient.transport);
    });

    afterAll(async () => await runtimeServiceProvider.stop());

    test("prevent automatic sharing of a RelationshipAttribute with an existing AttributeListener as long as the Relationship is still pending and catch up on its sharing when the pending Relationship is activated", async () => {
        const sRelationship = await establishPendingRelationshipWithRequestFlow(
            sender,
            recipient,
            [
                {
                    "@type": "CreateAttributeRequestItem",
                    mustBeAccepted: true,
                    attribute: inputForCreatingRelationshipAttribute
                }
            ],
            [{ accept: true }]
        );

        expect((await sender.consumption.attributes.getAttributes({})).value).toHaveLength(1);
        expect((await recipient.consumption.attributes.getAttributes({})).value).toHaveLength(1);

        await recipient.eventBus.waitForRunningEventHandlers();
        await expect(recipient.eventBus).not.toHavePublished(OutgoingRequestCreatedEvent);

        await sender.transport.relationships.acceptRelationship({
            relationshipId: sRelationship.id
        });

        await syncUntilHasRelationships(recipient.transport, 1);

        await recipient.eventBus.waitForRunningEventHandlers();
        await expect(recipient.eventBus).toHavePublished(OutgoingRequestCreatedEvent);
        expectShareAttributeRequestItemWith(
            recipient,
            (
                await recipient.consumption.attributes.getAttributes({
                    query: { "content.@type": "RelationshipAttribute", "content.key": "AKey", "content.owner": recipient.address, "shareInfo.peer": sender.address }
                })
            ).value[0].content
        );
    });

    test("do not catch up on the sharing of a RelationshipAttribute triggered by an existing AttributeListener when a pending Relationship is rejected", async () => {
        const sRelationship = await establishPendingRelationshipWithRequestFlow(
            sender,
            recipient,
            [
                {
                    "@type": "CreateAttributeRequestItem",
                    mustBeAccepted: true,
                    attribute: inputForCreatingRelationshipAttribute
                }
            ],
            [{ accept: true }]
        );

        expect((await sender.consumption.attributes.getAttributes({})).value).toHaveLength(1);
        expect((await recipient.consumption.attributes.getAttributes({})).value).toHaveLength(1);

        await recipient.eventBus.waitForRunningEventHandlers();
        await expect(recipient.eventBus).not.toHavePublished(OutgoingRequestCreatedEvent);

        await sender.transport.relationships.rejectRelationship({
            relationshipId: sRelationship.id
        });

        await syncUntilHasRelationships(recipient.transport, 1);

        await recipient.eventBus.waitForRunningEventHandlers();
        await expect(recipient.eventBus).not.toHavePublished(OutgoingRequestCreatedEvent);
    });

    test("do not catch up on the sharing of a RelationshipAttribute triggered by an existing AttributeListener when a pending Relationship is revoked", async () => {
        const sRelationship = await establishPendingRelationshipWithRequestFlow(
            sender,
            recipient,
            [
                {
                    "@type": "CreateAttributeRequestItem",
                    mustBeAccepted: true,
                    attribute: inputForCreatingRelationshipAttribute
                }
            ],
            [{ accept: true }]
        );

        expect((await sender.consumption.attributes.getAttributes({})).value).toHaveLength(1);
        expect((await recipient.consumption.attributes.getAttributes({})).value).toHaveLength(1);

        await recipient.eventBus.waitForRunningEventHandlers();
        await expect(recipient.eventBus).not.toHavePublished(OutgoingRequestCreatedEvent);

        await recipient.transport.relationships.revokeRelationship({
            relationshipId: sRelationship.id
        });

        await syncUntilHasRelationships(sender.transport, 1);

        await recipient.eventBus.waitForRunningEventHandlers();
        await expect(recipient.eventBus).not.toHavePublished(OutgoingRequestCreatedEvent);
    });

    test("do not share a RelationshipAttribute again with an existing AttributeListener when a terminated Relationship is reactivated", async () => {
        const sRelationship = await establishPendingRelationshipWithRequestFlow(
            sender,
            recipient,
            [
                {
                    "@type": "CreateAttributeRequestItem",
                    mustBeAccepted: true,
                    attribute: inputForCreatingRelationshipAttribute
                }
            ],
            [{ accept: true }]
        );

        expect((await sender.consumption.attributes.getAttributes({})).value).toHaveLength(1);
        expect((await recipient.consumption.attributes.getAttributes({})).value).toHaveLength(1);

        await recipient.eventBus.waitForRunningEventHandlers();
        await expect(recipient.eventBus).not.toHavePublished(OutgoingRequestCreatedEvent);

        await sender.transport.relationships.acceptRelationship({
            relationshipId: sRelationship.id
        });

        await syncUntilHasRelationships(recipient.transport, 1);

        await recipient.eventBus.waitForRunningEventHandlers();
        await expect(recipient.eventBus).toHavePublished(OutgoingRequestCreatedEvent);
        expectShareAttributeRequestItemWith(
            recipient,
            (
                await recipient.consumption.attributes.getAttributes({
                    query: { "content.@type": "RelationshipAttribute", "content.key": "AKey", "content.owner": recipient.address, "shareInfo.peer": sender.address }
                })
            ).value[0].content
        );

        recipient.eventBus.reset();

        const relationshipToPeer = (await recipient.transport.relationships.getRelationships({ query: { peer: sender.address, status: RelationshipStatus.Active } })).value[0];
        await recipient.transport.relationships.terminateRelationship({ relationshipId: relationshipToPeer.id });
        expect((await recipient.transport.relationships.getRelationship({ id: relationshipToPeer.id })).value.status).toBe(RelationshipStatus.Terminated);
        await syncUntilHasRelationships(sender.transport, 1);
        await sender.transport.relationships.requestRelationshipReactivation({ relationshipId: relationshipToPeer.id });
        await syncUntilHasRelationships(recipient.transport, 1);
        await recipient.transport.relationships.acceptRelationshipReactivation({ relationshipId: relationshipToPeer.id });
        expect((await recipient.transport.relationships.getRelationship({ id: relationshipToPeer.id })).value.status).toBe(RelationshipStatus.Active);
        await syncUntilHasRelationships(sender.transport, 1);

        await recipient.eventBus.waitForRunningEventHandlers();
        await expect(recipient.eventBus).not.toHavePublished(OutgoingRequestCreatedEvent);
    });
});

function expectShareAttributeRequestItemWith(recipient: TestRuntimeServices, attribute: IdentityAttributeJSON | RelationshipAttributeJSON) {
    const event = recipient.eventBus.publishedEvents.find((e) => e instanceof OutgoingRequestCreatedEvent);
    expect(event).toBeDefined();

    const request = event!.data;
    expect(request.content.items).toHaveLength(1);
    expect(request.content.items[0]["@type"]).toBe("ShareAttributeRequestItem");

    const requestItem = request.content.items[0] as ShareAttributeRequestItemJSON;
    expect(requestItem.attribute).toStrictEqual(attribute);
}
