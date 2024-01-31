import { IdentityAttributeJSON, RelationshipAttributeConfidentiality, RelationshipAttributeJSON, ShareAttributeRequestItemJSON } from "@nmshd/content";
import { AttributeListenerCreatedEvent, OutgoingRequestCreatedEvent } from "../../src";
import { ensureActiveRelationship, exchangeAndAcceptRequestByMessage, RuntimeServiceProvider, TestRuntimeServices } from "../lib";

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
                            key: "aKey",
                            owner: thirdParty.address,
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
        expectShareAttributeRequestItemWith(attributeContent);
    });

    test("creates an outgoing Request for an AttributeListener with a ThirdPartyRelationshipAttributeQuery when a RelationshipAttribute is created in the Relationship to a third party", async () => {
        const attributeContent: RelationshipAttributeJSON = {
            "@type": "RelationshipAttribute",
            owner: thirdParty.address,
            key: "aKey",
            confidentiality: RelationshipAttributeConfidentiality.Public,
            isTechnical: false,
            value: {
                "@type": "ProprietaryString",
                title: "aTitle",
                value: "aProprietaryStringValue"
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
        expectShareAttributeRequestItemWith(attributeContent);
    });
});

function expectShareAttributeRequestItemWith(attribute: IdentityAttributeJSON | RelationshipAttributeJSON) {
    const event = recipient.eventBus.publishedEvents.find((e) => e instanceof OutgoingRequestCreatedEvent) as OutgoingRequestCreatedEvent | undefined;
    expect(event).toBeDefined();

    const request = event!.data;
    expect(request.content.items).toHaveLength(1);
    expect(request.content.items[0]["@type"]).toBe("ShareAttributeRequestItem");

    const requestItem = request.content.items[0] as ShareAttributeRequestItemJSON;
    expect(requestItem.attribute).toStrictEqual(attribute);
}
