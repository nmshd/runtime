import { AcceptProposeAttributeRequestItemParametersJSON, DecideRequestItemGroupParametersJSON, LocalRequestStatus } from "@nmshd/consumption";
import { GivenName, IdentityAttribute, IdentityAttributeQuery, ProposeAttributeRequestItem, RelationshipAttributeConfidentiality, Surname } from "@nmshd/content";
import { CoreAddress } from "@nmshd/transport";
import {
    DecidableProposeAttributeRequestItemDVO,
    IncomingRequestStatusChangedEvent,
    OutgoingRequestFromRelationshipCreationChangeCreatedAndCompletedEvent,
    PeerRelationshipTemplateDVO,
    RelationshipTemplateDTO,
    RequestItemGroupDVO
} from "../../src";
import { RuntimeServiceProvider, TestRuntimeServices, createTemplate, syncUntilHasRelationships } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let templator: TestRuntimeServices;
let requestor: TestRuntimeServices;
let templatorTemplate: RelationshipTemplateDTO;
let requestorTemplate: RelationshipTemplateDTO;

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
        await templator.consumption.attributes.createIdentityAttribute({
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Hugo"
                }
            }
        });
        await templator.consumption.attributes.createIdentityAttribute({
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Egon"
                }
            }
        });
        await templator.consumption.attributes.createIdentityAttribute({
            content: {
                value: {
                    "@type": "Surname",
                    value: "Becker"
                }
            }
        });

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
        templatorTemplate = await createTemplate(templator.transport, templateContent);
        const templateResult = await requestor.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: templatorTemplate.truncatedReference });
        requestorTemplate = templateResult.value;
        await requestor.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
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

    test("RequestDVO for requestor and accept", async () => {
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

        const proposeItemGroup = dvo.content.items[1] as RequestItemGroupDVO;

        const firstProposeItem = proposeItemGroup.items[0] as DecidableProposeAttributeRequestItemDVO;
        const secondProposeItem = proposeItemGroup.items[1] as DecidableProposeAttributeRequestItemDVO;

        const acceptResult = await requestor.consumption.incomingRequests.accept({
            requestId: dto.id,
            items: [
                { items: [{ accept: true }, { accept: true }] } as DecideRequestItemGroupParametersJSON,
                {
                    items: [
                        { accept: true, attribute: firstProposeItem.attribute.content } as AcceptProposeAttributeRequestItemParametersJSON,
                        { accept: true, attribute: secondProposeItem.attribute.content } as AcceptProposeAttributeRequestItemParametersJSON
                    ]
                } as DecideRequestItemGroupParametersJSON
            ]
        });
        expect(acceptResult).toBeSuccessful();
    });

    test("Test the accepted request for requestor", async () => {
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
        expect(dvo.status).toBe("Decided");
        expect(dvo.statusText).toBe("i18n://dvo.localRequest.status.Decided");
        expect(dvo.type).toBe("LocalRequestDVO");
        expect(dvo.content.type).toBe("RequestDVO");
        expect(dvo.content.items).toHaveLength(2);
        expect(dvo.isDecidable).toBe(false);
    });

    test("Test the accepted template for requestor", async () => {
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
    });

    test("test the attributes on requestor side", async () => {
        const attributeResult = await requestor.consumption.attributes.getAttributes({
            query: {
                "shareInfo.peer": templator.address
            }
        });
        expect(attributeResult).toBeSuccessful();
        expect(attributeResult.value).toHaveLength(4);
    });

    test("Test the request for templator", async () => {
        await syncUntilHasRelationships(templator.transport);
        await templator.eventBus.waitForEvent(OutgoingRequestFromRelationshipCreationChangeCreatedAndCompletedEvent);
        const requestResult = await templator.consumption.outgoingRequests.getRequests({
            query: {
                "source.reference": requestorTemplate.id
            }
        });
        expect(requestResult).toBeSuccessful();
        expect(requestResult.value).toHaveLength(1);

        const dto = requestResult.value[0];
        const dvo = await requestor.expander.expandLocalRequestDTO(dto);
        expect(dvo).toBeDefined();
        expect(dvo.isOwn).toBe(true);
        expect(dvo.status).toBe("Completed");
        expect(dvo.statusText).toBe("i18n://dvo.localRequest.status.Completed");
        expect(dvo.type).toBe("LocalRequestDVO");
        expect(dvo.content.type).toBe("RequestDVO");
        expect(dvo.content.items).toHaveLength(2);
        expect(dvo.isDecidable).toBe(false);
    });

    test("check the attributes on templator side", async () => {
        const attributeResult = await templator.consumption.attributes.getAttributes({
            query: {
                "shareInfo.peer": requestor.address
            }
        });
        expect(attributeResult).toBeSuccessful();
        expect(attributeResult.value).toHaveLength(4);
    });
});
