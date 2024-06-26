import { IdentityAttribute, RelationshipAttribute, RelationshipAttributeConfidentiality, RelationshipTemplateContentJSON } from "@nmshd/content";
import { CoreAddress } from "@nmshd/transport";
import { ConsumptionServices, RelationshipChangedEvent, RelationshipStatus, RelationshipTemplateDTO, TransportServices } from "../../src";
import { exchangeTemplate, MockEventBus, RuntimeServiceProvider, syncUntilHasRelationships, TestRuntimeServices } from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();
let sRuntimeServices: TestRuntimeServices;
let sTransportServices: TransportServices;
let sConsumptionServices: ConsumptionServices;
let sEventBus: MockEventBus;

let rRuntimeServices: TestRuntimeServices;
let rTransportServices: TransportServices;
let rConsumptionServices: ConsumptionServices;
let rEventBus: MockEventBus;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(2, { enableRequestModule: true });

    sRuntimeServices = runtimeServices[0];
    sTransportServices = sRuntimeServices.transport;
    sConsumptionServices = sRuntimeServices.consumption;
    sEventBus = sRuntimeServices.eventBus;

    rRuntimeServices = runtimeServices[1];
    rTransportServices = rRuntimeServices.transport;
    rConsumptionServices = rRuntimeServices.consumption;
    rEventBus = rRuntimeServices.eventBus;
}, 30000);

afterEach(() => {
    sEventBus.reset();
    rEventBus.reset();
});

afterAll(async () => await runtimeServiceProvider.stop());

describe("Reject Relationship", () => {
    async function ensurePendingRelationshipWithTemplate() {
        const templateContent: RelationshipTemplateContentJSON = {
            "@type": "RelationshipTemplateContent",
            onNewRelationship: {
                "@type": "Request",
                items: [
                    {
                        "@type": "CreateAttributeRequestItem",
                        mustBeAccepted: true,
                        attribute: IdentityAttribute.from({
                            value: {
                                "@type": "GivenName",
                                value: "AGivenName"
                            },
                            owner: (await rTransportServices.account.getIdentityInfo()).value.address
                        }).toJSON()
                    },
                    {
                        "@type": "CreateAttributeRequestItem",
                        mustBeAccepted: true,
                        attribute: RelationshipAttribute.from({
                            key: "AKey",
                            value: {
                                "@type": "ProprietaryString",
                                value: "AStringValue",
                                title: "ATitle"
                            },
                            owner: CoreAddress.from((await sTransportServices.account.getIdentityInfo()).value.address),
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }).toJSON()
                    }
                ]
            }
        };

        const template: RelationshipTemplateDTO = await exchangeTemplate(sTransportServices, rTransportServices, templateContent);

        if ((await sTransportServices.relationships.getRelationships({})).value.length === 0) {
            await rTransportServices.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.truncatedReference });
            const requestId = (await rConsumptionServices.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value[0].id;
            await rConsumptionServices.incomingRequests.accept({ requestId, items: [{ accept: true }, { accept: true }] });
        }
    }

    test("delete shared Attributes of both Identities involved for rejected Relationship", async () => {
        await ensurePendingRelationshipWithTemplate();
        const sRelationship = (await syncUntilHasRelationships(sTransportServices, 1))[0];
        expect(sRelationship.status).toStrictEqual(RelationshipStatus.Pending);

        expect((await sConsumptionServices.attributes.getAttributes({})).value).toHaveLength(2);
        sEventBus.reset();
        await sTransportServices.relationships.rejectRelationshipChange({
            relationshipId: sRelationship.id,
            changeId: sRelationship.changes[0].id,
            content: {}
        });
        expect((await sTransportServices.relationships.getRelationships({})).value[0].status).toBe(RelationshipStatus.Rejected);
        await expect(sEventBus).toHavePublished(RelationshipChangedEvent);
        await sEventBus.waitForRunningEventHandlers();
        expect((await sConsumptionServices.attributes.getAttributes({})).value).toHaveLength(0);

        expect((await rConsumptionServices.attributes.getAttributes({})).value).toHaveLength(3);
        rEventBus.reset();
        const rRelationship = (await syncUntilHasRelationships(rTransportServices, 1))[0];
        expect(rRelationship.status).toStrictEqual(RelationshipStatus.Rejected);
        await expect(rEventBus).toHavePublished(RelationshipChangedEvent);
        await rEventBus.waitForRunningEventHandlers();
        expect((await rConsumptionServices.attributes.getAttributes({})).value).toHaveLength(1);
    });
});
