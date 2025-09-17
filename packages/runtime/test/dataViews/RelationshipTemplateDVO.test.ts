import { AcceptProposeAttributeRequestItemParametersJSON, DecideRequestItemGroupParametersJSON } from "@nmshd/consumption";
import {
    GivenName,
    IdentityAttribute,
    IdentityAttributeJSON,
    IdentityAttributeQuery,
    ProposeAttributeRequestItem,
    ProposeAttributeRequestItemJSON,
    RelationshipAttributeConfidentiality,
    RelationshipAttributeJSON,
    RelationshipTemplateContent,
    RelationshipTemplateContentJSON,
    RequestItemGroupJSON,
    Surname
} from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { DateTime } from "luxon";
import {
    IncomingRequestStatusChangedEvent,
    LocalRequestStatus,
    OutgoingRequestFromRelationshipCreationCreatedAndCompletedEvent,
    PeerRelationshipTemplateDVO,
    RelationshipTemplateDTO,
    RequestItemGroupDVO
} from "../../src";
import { RuntimeServiceProvider, TestRuntimeServices, syncUntilHasRelationships } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let templator: TestRuntimeServices;
let requestor: TestRuntimeServices;
let templatorTemplate: RelationshipTemplateDTO & { content: RelationshipTemplateContentJSON };
let templateId: string;
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
        const relationshipAttributeContent1: RelationshipAttributeJSON = {
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
        const relationshipAttributeContent2: RelationshipAttributeJSON = {
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
        const templateContent = RelationshipTemplateContent.from({
            onNewRelationship: {
                "@type": "Request",
                items: [
                    {
                        "@type": "RequestItemGroup",
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
                        title: "Proposed Attributes",
                        items: [
                            ProposeAttributeRequestItem.from({
                                mustBeAccepted: true,
                                query: IdentityAttributeQuery.from({
                                    valueType: "GivenName"
                                }),
                                attribute: IdentityAttribute.from({
                                    owner: CoreAddress.from(""),
                                    value: GivenName.from("aGivenName")
                                })
                            }).toJSON(),
                            ProposeAttributeRequestItem.from({
                                mustBeAccepted: true,
                                query: IdentityAttributeQuery.from({
                                    valueType: "Surname"
                                }),
                                attribute: IdentityAttribute.from({
                                    owner: CoreAddress.from(""),
                                    value: Surname.from("Templator")
                                })
                            }).toJSON()
                        ]
                    }
                ]
            }
        }).toJSON();
        const newIdentityAttribute1 = IdentityAttribute.from(
            ((templateContent.onNewRelationship.items[1] as RequestItemGroupJSON).items[0] as ProposeAttributeRequestItemJSON).attribute as IdentityAttributeJSON
        ).toJSON();
        const newIdentityAttribute2 = IdentityAttribute.from(
            ((templateContent.onNewRelationship.items[1] as RequestItemGroupJSON).items[1] as ProposeAttributeRequestItemJSON).attribute as IdentityAttributeJSON
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
        templatorTemplate = (
            await templator.transport.relationshipTemplates.createOwnRelationshipTemplate({
                maxNumberOfAllocations: 1,
                expiresAt: DateTime.utc().plus({ minutes: 10 }).toString(),
                content: templateContent,
                forIdentity: requestor.address,
                passwordProtection: {
                    password: "password"
                }
            })
        ).value as RelationshipTemplateDTO & { content: RelationshipTemplateContentJSON };
        templateId = templatorTemplate.id;
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
        expect(dvo.name).toStrictEqual(dto.content.title ?? "i18n://dvo.template.outgoing.name");
        expect(dvo.isOwn).toBe(true);
        expect(dvo.maxNumberOfAllocations).toBe(1);
        expect(dvo.forIdentity).toBe(requestor.address);
        expect(dvo.passwordProtection!.password).toBe("password");
        expect(dvo.passwordProtection!.passwordIsPin).toBeUndefined();

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
        const requestorTemplate = (
            await requestor.transport.relationshipTemplates.loadPeerRelationshipTemplate({
                reference: templatorTemplate.reference.truncated,
                password: "password"
            })
        ).value as RelationshipTemplateDTO & { content: RelationshipTemplateContentJSON };

        await requestor.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);

        const dto = requestorTemplate;
        const dvo = (await requestor.expander.expandRelationshipTemplateDTO(dto)) as PeerRelationshipTemplateDVO;
        expect(dvo).toBeDefined();
        expect(dvo.id).toBe(dto.id);
        expect(dvo.type).toBe("PeerRelationshipTemplateDVO");

        expect(dvo.date).toStrictEqual(dto.createdAt);
        expect(dvo.expiresAt).toStrictEqual(dto.expiresAt);
        expect(dvo.createdBy.id).toStrictEqual(dto.createdBy);
        expect(dvo.name).toStrictEqual(dto.content.title ?? "i18n://dvo.template.incoming.name");
        expect(dvo.isOwn).toBe(false);
        expect(dvo.maxNumberOfAllocations).toBe(1);
        expect(dvo.forIdentity).toBe(requestor.address);
        expect(dvo.passwordProtection!.password).toBe("password");
        expect(dvo.passwordProtection!.passwordIsPin).toBeUndefined();

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
        let requestResult;
        requestResult = await requestor.consumption.incomingRequests.getRequests({
            query: {
                "source.reference": templateId
            }
        });
        await requestor.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: templatorTemplate.reference.truncated });
        if (requestResult.value.length === 0) {
            await requestor.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
            requestResult = await requestor.consumption.incomingRequests.getRequests({
                query: {
                    "source.reference": templateId
                }
            });
        }
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
        requestResult = await requestor.consumption.incomingRequests.getRequests({
            query: {
                "source.reference": templateId
            }
        });
        const requestorTemplate = (
            await requestor.transport.relationshipTemplates.loadPeerRelationshipTemplate({
                reference: templatorTemplate.reference.truncated,
                password: "password"
            })
        ).value as RelationshipTemplateDTO & { content: RelationshipTemplateContentJSON };
        if (requestResult.value.length === 0) {
            await requestor.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
            requestResult = await requestor.consumption.incomingRequests.getRequests({
                query: {
                    "source.reference": templateId
                }
            });
        }
        const acceptResult = await requestor.consumption.incomingRequests.accept({
            requestId: requestResult.value[0].id,
            items: responseItems
        });

        const requestResultAfterAcceptance = await requestor.consumption.incomingRequests.getRequests({
            query: {
                "source.reference": templateId
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
        expect(dvo.name).toStrictEqual(dto.content.title ?? "i18n://dvo.template.incoming.name");
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

        const attributesWithPeerSharingDetails = await requestor.consumption.attributes.getAttributes({
            query: {
                "peerSharingDetails.peer": templator.address
            }
        });
        expect(attributesWithPeerSharingDetails).toBeSuccessful();
        expect(attributesWithPeerSharingDetails.value).toHaveLength(2);

        const attributesWithForwardedSharingDetails = await requestor.consumption.attributes.getAttributes({
            query: {
                "forwardedSharingDetails.peer": templator.address
            }
        });
        expect(attributesWithForwardedSharingDetails).toBeSuccessful();
        expect(attributesWithForwardedSharingDetails.value).toHaveLength(2);

        await syncUntilHasRelationships(templator.transport);
        await templator.eventBus.waitForEvent(OutgoingRequestFromRelationshipCreationCreatedAndCompletedEvent);
        const requestResultTemplator = await templator.consumption.outgoingRequests.getRequests({
            query: {
                "source.reference": templateId
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

        const attributesWithPeerSharingDetailsOfTemplator = await templator.consumption.attributes.getAttributes({
            query: {
                "peerSharingDetails.peer": requestor.address
            }
        });
        expect(attributesWithPeerSharingDetailsOfTemplator).toBeSuccessful();
        expect(attributesWithPeerSharingDetailsOfTemplator.value).toHaveLength(4);
    });
});
