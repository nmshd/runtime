import { IdentityAttribute, RelationshipAttribute, RelationshipAttributeConfidentiality, RelationshipTemplateContentJSON } from "@nmshd/content";
import { CoreAddress } from "@nmshd/transport";
import { ConsumptionServices, LocalAttributeDTO, RelationshipChangedEvent, RelationshipStatus, RelationshipTemplateDTO, TransportServices } from "../../src";
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

let tRuntimeServices: TestRuntimeServices;
let tTransportServices: TransportServices;
let tConsumptionServices: ConsumptionServices;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(3, { enableRequestModule: true });

    sRuntimeServices = runtimeServices[0];
    sTransportServices = sRuntimeServices.transport;
    sConsumptionServices = sRuntimeServices.consumption;
    sEventBus = sRuntimeServices.eventBus;

    rRuntimeServices = runtimeServices[1];
    rTransportServices = rRuntimeServices.transport;
    rConsumptionServices = rRuntimeServices.consumption;
    rEventBus = rRuntimeServices.eventBus;

    tRuntimeServices = runtimeServices[2];
    tTransportServices = tRuntimeServices.transport;
    tConsumptionServices = tRuntimeServices.consumption;
}, 30000);

afterEach(() => {
    sEventBus.reset();
    rEventBus.reset();
});

afterAll(async () => await runtimeServiceProvider.stop());

describe("Event handling when rejecting a Relationship", () => {
    async function ensurePendingRelationshipWithTemplate() {
        const createdRelationshipAttributeForFurtherSharing = await createRelationshipAttributeForFurtherSharing();
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
                    },
                    {
                        "@type": "ShareAttributeRequestItem",
                        mustBeAccepted: true,
                        sourceAttributeId: createdRelationshipAttributeForFurtherSharing.id,
                        attribute: createdRelationshipAttributeForFurtherSharing.content
                    }
                ]
            }
        };

        const template: RelationshipTemplateDTO = await exchangeTemplate(sTransportServices, rTransportServices, templateContent);

        if ((await sTransportServices.relationships.getRelationships({ query: { peer: (await sTransportServices.account.getIdentityInfo()).value.address } })).value.length === 0) {
            await rTransportServices.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.truncatedReference });
            const requestId = (await rConsumptionServices.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value[0].id;
            await rConsumptionServices.incomingRequests.accept({ requestId, items: [{ accept: true }, { accept: true }, { accept: true }] });
        }
    }

    async function createRelationshipAttributeForFurtherSharing(): Promise<LocalAttributeDTO> {
        const templateContent: RelationshipTemplateContentJSON = {
            "@type": "RelationshipTemplateContent",
            onNewRelationship: {
                "@type": "Request",
                items: [
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
                            owner: CoreAddress.from((await tTransportServices.account.getIdentityInfo()).value.address),
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }).toJSON()
                    }
                ]
            }
        };

        const template: RelationshipTemplateDTO = await exchangeTemplate(sTransportServices, tTransportServices, templateContent);

        if ((await sTransportServices.relationships.getRelationships({ query: { peer: (await tTransportServices.account.getIdentityInfo()).value.address } })).value.length === 0) {
            await tTransportServices.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.truncatedReference });
            const requestId = (await tConsumptionServices.incomingRequests.getRequests({ query: { "source.reference": template.id } })).value[0].id;
            await tConsumptionServices.incomingRequests.accept({ requestId, items: [{ accept: true }] });
        }
        const sRelationship = (await syncUntilHasRelationships(sTransportServices, 1))[0];
        await sTransportServices.relationships.acceptRelationshipChange({
            relationshipId: sRelationship.id,
            changeId: sRelationship.changes[0].id,
            content: {}
        });

        const createdRelationshipAttributeForFurtherSharing = (await sConsumptionServices.attributes.getAttributes({})).value[0];
        return createdRelationshipAttributeForFurtherSharing;
    }

    test("deletion of the Attributes shared between both Identities involved in the rejected Relationship and keeping the remaining Attributes", async () => {
        await ensurePendingRelationshipWithTemplate();

        const sRelationship = (await syncUntilHasRelationships(sTransportServices, 1))[0];
        expect(sRelationship.status).toStrictEqual(RelationshipStatus.Pending);
        expect((await sConsumptionServices.attributes.getAttributes({})).value).toHaveLength(4);
        sEventBus.reset();
        await sTransportServices.relationships.rejectRelationshipChange({
            relationshipId: sRelationship.id,
            changeId: sRelationship.changes[0].id,
            content: {}
        });
        expect((await sTransportServices.relationships.getRelationships({})).value[1].status).toBe(RelationshipStatus.Rejected);
        await expect(sEventBus).toHavePublished(RelationshipChangedEvent);
        await sEventBus.waitForRunningEventHandlers();
        expect((await sConsumptionServices.attributes.getAttributes({})).value).toHaveLength(1);

        expect((await rConsumptionServices.attributes.getAttributes({})).value).toHaveLength(4);
        rEventBus.reset();
        const rRelationship = (await syncUntilHasRelationships(rTransportServices, 1))[0];
        expect(rRelationship.status).toStrictEqual(RelationshipStatus.Rejected);
        await expect(rEventBus).toHavePublished(RelationshipChangedEvent);
        await rEventBus.waitForRunningEventHandlers();
        expect((await rConsumptionServices.attributes.getAttributes({})).value).toHaveLength(1);
    });
});
