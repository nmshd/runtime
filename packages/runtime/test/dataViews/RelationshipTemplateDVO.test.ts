import { AcceptProposeAttributeRequestItemParametersJSON, DecideRequestItemGroupParametersJSON, LocalRequestStatus } from "@nmshd/consumption";
import {
    GivenName,
    IdentityAttribute,
    IdentityAttributeJSON,
    IdentityAttributeQuery,
    ProposeAttributeRequestItem,
    ProposeAttributeRequestItemJSON,
    RelationshipAttributeConfidentiality,
    Surname
} from "@nmshd/content";
import { CoreAddress } from "@nmshd/transport";
import {
    IncomingRequestStatusChangedEvent,
    OutgoingRequestFromRelationshipCreationChangeCreatedAndCompletedEvent,
    PeerRelationshipTemplateDVO,
    PeerRelationshipTemplateLoadedEvent,
    RelationshipTemplateDTO,
    RequestItemGroupDVO
} from "../../src";
import { createTemplate, RuntimeServiceProvider, syncUntilHasRelationships, TestRuntimeServices } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let templator: TestRuntimeServices;
let requestor: TestRuntimeServices;
let templatorTemplate: RelationshipTemplateDTO;
let responseItems: DecideRequestItemGroupParametersJSON[];

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2, { enableRequestModule: true });
    templator = runtimeServices[0];
    requestor = runtimeServices[1];
}, 30000);

afterAll(() => serviceProvider.stop());

beforeEach(function () {
    requestor.eventBus.reset();
    templator.eventBus.reset();
});

describe("RelationshipTemplateDVO", () => {
    beforeAll(async () => {
        const relationshipAttributeContent1 = {
            "@type": "RelationshipAttribute",
            owner: templator.address,
            value: {
                "@type": "ProprietaryString",
                title: "aTitle",
                value: "aProprietaryStringValue"
            },
            key: "givenName",
            confidentiality: "protected" as RelationshipAttributeConfidentiality
        };
        const relationshipAttributeContent2 = {
            "@type": "RelationshipAttribute",
            owner: templator.address,
            value: {
                "@type": "ProprietaryString",
                title: "aTitle",
                value: "aProprietaryStringValue"
            },
            key: "surname",
            confidentiality: "protected" as RelationshipAttributeConfidentiality
        };
        const templateContent = {
            "@type": "RelationshipTemplateContent",
            onNewRelationship: {
                "@type": "Request",
                items: [
                    {
                        "@type": "RequestItemGroup",
                        mustBeAccepted: true,
                        title: "Templator Attributes",
                        items: [
                            {
                                "@type": "CreateAttributeRequestItem",
                                mustBeAccepted: true,
                                attribute: relationshipAttributeContent1
                            },
                            {
                                "@type": "CreateAttributeRequestItem",
                                mustBeAccepted: true,
                                attribute: relationshipAttributeContent2
                            }
                        ]
                    },
                    {
                        "@type": "RequestItemGroup",
                        mustBeAccepted: true,
                        title: "Proposed Attributes",
                        items: [
                            ProposeAttributeRequestItem.from({
                                mustBeAccepted: true,
                                query: IdentityAttributeQuery.from({
                                    valueType: "GivenName"
                                }),
                                attribute: IdentityAttribute.from({
                                    owner: CoreAddress.from(""),
                                    value: GivenName.from("Theo")
                                })
                            }),
                            ProposeAttributeRequestItem.from({
                                mustBeAccepted: true,
                                query: IdentityAttributeQuery.from({
                                    valueType: "Surname"
                                }),
                                attribute: IdentityAttribute.from({
                                    owner: CoreAddress.from(""),
                                    value: Surname.from("Templator")
                                })
                            })
                        ]
                    }
                ]
            }
        };
        const newIdentityAttribute1 = IdentityAttribute.from(
            (templateContent.onNewRelationship.items[1].items[0] as ProposeAttributeRequestItemJSON).attribute as IdentityAttributeJSON
        ).toJSON();
        const newIdentityAttribute2 = IdentityAttribute.from(
            (templateContent.onNewRelationship.items[1].items[1] as ProposeAttributeRequestItemJSON).attribute as IdentityAttributeJSON
        ).toJSON();
        responseItems = [
            { items: [{ accept: true }, { accept: true }] },
            {
                items: [
                    {
                        accept: true,
                        attribute: Object.assign(newIdentityAttribute1, {
                            owner: CoreAddress.from(requestor.address)
                        })
                    } as AcceptProposeAttributeRequestItemParametersJSON,
                    {
                        accept: true,
                        attribute: Object.assign(newIdentityAttribute2, {
                            owner: CoreAddress.from(requestor.address)
                        })
                    } as AcceptProposeAttributeRequestItemParametersJSON
                ]
            }
        ];
        templatorTemplate = await createTemplate(templator.transport, templateContent);
    });

    test("TemplateDVO for templator", async () => {
        const dto = templatorTemplate;
        const dvo = await templator.expander.expandRelationshipTemplateDTO(dto);
        expect(dvo).toBeDefined();
        expect(dvo.id).toBe(dto.id);
        expect(dvo.type).toBe("RelationshipTemplateDVO");

        expect(dvo.date).toStrictEqual(dto.createdAt);
        expect(dvo.expiresAt).toStrictEqual(dto.expiresAt);
        expect(dvo.createdBy.id).toStrictEqual(dto.createdBy);
        expect(dvo.name).toStrictEqual(dto.content.title ? dto.content.title : "i18n://dvo.template.outgoing.name");
        expect(dvo.isOwn).toBe(true);
        expect(dvo.maxNumberOfAllocations).toBe(1);

        expect(dvo.onNewRelationship!.type).toBe("RequestDVO");
        expect(dvo.onNewRelationship!.items).toHaveLength(2);

        let item = dvo.onNewRelationship!.items[0] as RequestItemGroupDVO;
        expect(item.type).toBe("RequestItemGroupDVO");
        expect(item.items).toHaveLength(2);
        expect(item.items[0].type).toBe("CreateAttributeRequestItemDVO");
        expect(item.items[1].type).toBe("CreateAttributeRequestItemDVO");

        item = dvo.onNewRelationship!.items[1] as RequestItemGroupDVO;
        expect(item.type).toBe("RequestItemGroupDVO");
        expect(item.items).toHaveLength(2);
        expect(item.items[0].type).toBe("ProposeAttributeRequestItemDVO");
        expect(item.items[1].type).toBe("ProposeAttributeRequestItemDVO");
    });

    test("TemplateDVO for requestor", async () => {
        const requestorTemplate = (await requestor.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: templatorTemplate.truncatedReference })).value;

        const dto = requestorTemplate;
        const dvo = (await requestor.expander.expandRelationshipTemplateDTO(dto)) as PeerRelationshipTemplateDVO;
        expect(dvo).toBeDefined();
        expect(dvo.id).toBe(dto.id);
        expect(dvo.type).toBe("PeerRelationshipTemplateDVO");

        expect(dvo.date).toStrictEqual(dto.createdAt);
        expect(dvo.expiresAt).toStrictEqual(dto.expiresAt);
        expect(dvo.createdBy.id).toStrictEqual(dto.createdBy);
        expect(dvo.name).toStrictEqual(dto.content.title ? dto.content.title : "i18n://dvo.template.incoming.name");
        expect(dvo.isOwn).toBe(false);
        expect(dvo.maxNumberOfAllocations).toBe(1);

        expect(dvo.onNewRelationship!.type).toBe("RequestDVO");
        expect(dvo.onNewRelationship!.items).toHaveLength(2);

        let item = dvo.onNewRelationship!.items[0] as RequestItemGroupDVO;
        expect(item.type).toBe("RequestItemGroupDVO");
        expect(item.items).toHaveLength(2);
        expect(item.items[0].type).toBe("CreateAttributeRequestItemDVO");
        expect(item.items[1].type).toBe("CreateAttributeRequestItemDVO");

        item = dvo.onNewRelationship!.items[1] as RequestItemGroupDVO;
        expect(item.type).toBe("RequestItemGroupDVO");
        expect(item.items).toHaveLength(2);
        expect(item.items[0].type).toBe("ProposeAttributeRequestItemDVO");
        expect(item.items[1].type).toBe("ProposeAttributeRequestItemDVO");
    });

    test("RequestDVO for requestor", async () => {
        const requestorTemplate = (await requestor.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: templatorTemplate.truncatedReference })).value;
        await requestor.eventBus.waitForEvent(PeerRelationshipTemplateLoadedEvent);
        const requestResult = await requestor.consumption.incomingRequests.getRequests({
            query: {
                "source.reference": requestorTemplate.id
            }
        });
        expect(requestResult).toBeSuccessful();
        expect(requestResult.value).toHaveLength(1);

        const dto = requestResult.value[0];
        const dvo = await requestor.expander.expandLocalRequestDTO(dto);
        expect(dvo).toBeDefined();
        expect(dvo.isOwn).toBe(false);
        expect(dvo.status).toBe("DecisionRequired");
        expect(dvo.statusText).toBe("i18n://dvo.localRequest.status.DecisionRequired");
        expect(dvo.type).toBe("LocalRequestDVO");
        expect(dvo.content.type).toBe("RequestDVO");
        expect(dvo.content.items).toHaveLength(2);
        expect(dvo.isDecidable).toBe(true);
    });

    test("Accept the request and follow-up tests", async () => {
        let dto;
        let dvo;
        let requestResult;
        const requestorTemplate = (await requestor.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: templatorTemplate.truncatedReference })).value;
        requestResult = await requestor.consumption.incomingRequests.getRequests({
            query: {
                "source.reference": requestorTemplate.id
            }
        });
        if (requestResult.value.length === 0) {
            await requestor.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
            requestResult = await requestor.consumption.incomingRequests.getRequests({
                query: {
                    "source.reference": requestorTemplate.id
                }
            });
        }
        const acceptResult = await requestor.consumption.incomingRequests.accept({
            requestId: requestResult.value[0].id,
            items: responseItems
        });

        const requestResultAfterAcceptance = await requestor.consumption.incomingRequests.getRequests({
            query: {
                "source.reference": requestorTemplate.id
            }
        });
        expect(acceptResult).toBeSuccessful();
        expect(requestResultAfterAcceptance).toBeSuccessful();
        expect(requestResultAfterAcceptance.value).toHaveLength(1);

        dto = requestResultAfterAcceptance.value[0];
        dvo = await requestor.expander.expandLocalRequestDTO(dto);
        expect(dvo).toBeDefined();
        expect(dvo.isOwn).toBe(false);
        expect(dvo.status).toBe("Decided");
        expect(dvo.statusText).toBe("i18n://dvo.localRequest.status.Decided");
        expect(dvo.type).toBe("LocalRequestDVO");
        expect(dvo.content.type).toBe("RequestDVO");
        expect(dvo.content.items).toHaveLength(2);
        expect(dvo.isDecidable).toBe(false);

        dto = requestorTemplate;
        dvo = (await requestor.expander.expandRelationshipTemplateDTO(dto)) as PeerRelationshipTemplateDVO;
        expect(dvo).toBeDefined();
        expect(dvo.id).toBe(dto.id);
        expect(dvo.type).toBe("PeerRelationshipTemplateDVO");

        expect(dvo.date).toStrictEqual(dto.createdAt);
        expect(dvo.expiresAt).toStrictEqual(dto.expiresAt);
        expect(dvo.createdBy.id).toStrictEqual(dto.createdBy);
        expect(dvo.name).toStrictEqual(dto.content.title ? dto.content.title : "i18n://dvo.template.incoming.name");
        expect(dvo.isOwn).toBe(false);
        expect(dvo.maxNumberOfAllocations).toBe(1);

        expect(dvo.onNewRelationship!.type).toBe("RequestDVO");
        expect(dvo.onNewRelationship!.items).toHaveLength(2);

        let item = dvo.onNewRelationship!.items[0] as RequestItemGroupDVO;
        expect(item.type).toBe("RequestItemGroupDVO");
        expect(item.items).toHaveLength(2);
        expect(item.items[0].type).toBe("CreateAttributeRequestItemDVO");
        expect(item.items[1].type).toBe("CreateAttributeRequestItemDVO");

        item = dvo.onNewRelationship!.items[1] as RequestItemGroupDVO;
        expect(item.type).toBe("RequestItemGroupDVO");
        expect(item.items).toHaveLength(2);
        expect(item.items[0].type).toBe("ProposeAttributeRequestItemDVO");
        expect(item.items[1].type).toBe("ProposeAttributeRequestItemDVO");

        expect(dvo.request!.type).toBe("LocalRequestDVO");
        expect(dvo.request!.items).toHaveLength(2);

        item = dvo.request!.items[0] as RequestItemGroupDVO;
        expect(item.type).toBe("RequestItemGroupDVO");
        expect(item.items).toHaveLength(2);
        expect(item.items[0].type).toBe("CreateAttributeRequestItemDVO");
        expect(item.items[1].type).toBe("CreateAttributeRequestItemDVO");

        item = dvo.request!.items[1] as RequestItemGroupDVO;
        expect(item.type).toBe("RequestItemGroupDVO");
        expect(item.items).toHaveLength(2);
        expect(item.items[0].type).toBe("ProposeAttributeRequestItemDVO");
        expect(item.items[1].type).toBe("ProposeAttributeRequestItemDVO");

        const attributeResult = await requestor.consumption.attributes.getAttributes({
            query: {
                "shareInfo.peer": templator.address
            }
        });
        expect(attributeResult).toBeSuccessful();
        expect(attributeResult.value).toHaveLength(4);

        await syncUntilHasRelationships(templator.transport);
        await templator.eventBus.waitForEvent(OutgoingRequestFromRelationshipCreationChangeCreatedAndCompletedEvent);
        const requestResultTemplator = await templator.consumption.outgoingRequests.getRequests({
            query: {
                "source.reference": requestorTemplate.id
            }
        });
        expect(requestResultTemplator).toBeSuccessful();
        expect(requestResultTemplator.value).toHaveLength(1);

        dto = requestResultTemplator.value[0];
        dvo = await requestor.expander.expandLocalRequestDTO(dto);
        expect(dvo).toBeDefined();
        expect(dvo.isOwn).toBe(true);
        expect(dvo.status).toBe("Completed");
        expect(dvo.statusText).toBe("i18n://dvo.localRequest.status.Completed");
        expect(dvo.type).toBe("LocalRequestDVO");
        expect(dvo.content.type).toBe("RequestDVO");
        expect(dvo.content.items).toHaveLength(2);
        expect(dvo.isDecidable).toBe(false);

        const attributeResultTemplator = await templator.consumption.attributes.getAttributes({
            query: {
                "shareInfo.peer": requestor.address
            }
        });
        expect(attributeResultTemplator).toBeSuccessful();
        expect(attributeResultTemplator.value).toHaveLength(4);
    });
});
