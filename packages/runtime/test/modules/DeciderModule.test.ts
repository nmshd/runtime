import { NodeLoggerFactory } from "@js-soft/node-logger";
import {
    AuthenticationRequestItemJSON,
    ConsentRequestItemJSON,
    CreateAttributeRequestItemJSON,
    RelationshipAttributeConfidentiality,
    RelationshipTemplateContent,
    Request,
    ShareAttributeAcceptResponseItemJSON
} from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { ConsentRequestItemConfig, CreateAttributeRequestItemConfig, GeneralRequestConfig, RequestItemConfig } from "src/modules/decide";
import {
    DeciderModule,
    DeciderModuleConfigurationOverwrite,
    IncomingRequestStatusChangedEvent,
    LocalRequestDTO,
    LocalRequestStatus,
    MessageProcessedEvent,
    MessageProcessedResult,
    RelationshipTemplateProcessedEvent,
    RelationshipTemplateProcessedResult
} from "../../src";
import { RuntimeServiceProvider, TestRequestItem, TestRuntimeServices, establishRelationship, exchangeMessage } from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();

let sender: TestRuntimeServices;
let recipient: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(2, { enableDeciderModule: true });

    sender = runtimeServices[0];
    recipient = runtimeServices[1];

    await establishRelationship(sender.transport, recipient.transport);
}, 30000);

beforeEach(function () {
    recipient.eventBus.reset();
});

afterAll(async () => await runtimeServiceProvider.stop());

describe("DeciderModule", () => {
    describe("Unit tests", () => {
        const runtime = runtimeServiceProvider["runtimes"][0];

        const deciderConfig = {
            enabled: false,
            displayName: "Decider Module",
            name: "DeciderModule",
            location: "@nmshd/runtime:DeciderModule"
        };

        const loggerFactory = new NodeLoggerFactory({
            appenders: {
                consoleAppender: {
                    type: "stdout",
                    layout: { type: "pattern", pattern: "%[[%d] [%p] %c - %m%]" }
                },
                console: {
                    type: "logLevelFilter",
                    level: "ERROR",
                    appender: "consoleAppender"
                }
            },

            categories: {
                default: {
                    appenders: ["console"],
                    level: "TRACE"
                }
            }
        });
        const testLogger = loggerFactory.getLogger("DeciderModule.test");

        const deciderModule = new DeciderModule(runtime, deciderConfig, testLogger);
        describe("checkGeneralRequestCompatibility", () => {
            let incomingLocalRequest: LocalRequestDTO;

            beforeAll(() => {
                incomingLocalRequest = {
                    id: "requestId",
                    isOwn: false,
                    status: LocalRequestStatus.DecisionRequired,
                    peer: "peerAddress",
                    createdAt: "creationDate",
                    source: {
                        type: "Message",
                        reference: "messageId"
                    },
                    content: {
                        "@type": "Request",
                        id: "requestId",
                        expiresAt: "expirationDate",
                        title: "requestTitle",
                        description: "requestDescription",
                        metadata: { aKey: "aValue" },
                        items: [
                            {
                                "@type": "AuthenticationRequestItem",
                                mustBeAccepted: true
                            }
                        ]
                    }
                };
            });

            test("should return true if all properties of GeneralRequestConfig are set with strings", () => {
                const generalRequestConfigElement: GeneralRequestConfig = {
                    peer: "peerAddress",
                    createdAt: "creationDate",
                    "source.type": "Message",
                    "content.expiresAt": "expirationDate",
                    "content.title": "requestTitle",
                    "content.description": "requestDescription",
                    "content.metadata": { aKey: "aValue" }
                };

                const compatibility = deciderModule.checkGeneralRequestCompatibility(generalRequestConfigElement, incomingLocalRequest);
                expect(compatibility).toBe(true);
            });

            test("should return true if all properties of GeneralRequestConfig are set with string arrays", () => {
                const generalRequestConfigElement: GeneralRequestConfig = {
                    peer: ["peerAddress", "otherAddress"],
                    createdAt: ["creationDate", "otherDate"],
                    "source.type": "Message",
                    "content.expiresAt": ["expirationDate", "otherDate"],
                    "content.title": ["requestTitle", "otherRequestTitle"],
                    "content.description": ["requestDescription", "otherRequestDescription"],
                    "content.metadata": [{ aKey: "aValue" }, { anotherKey: "anotherValue" }]
                };

                const compatibility = deciderModule.checkGeneralRequestCompatibility(generalRequestConfigElement, incomingLocalRequest);
                expect(compatibility).toBe(true);
            });

            test("should return true if some properties of GeneralRequestConfig are not set", () => {
                const generalRequestConfigElement: GeneralRequestConfig = {
                    peer: "peerAddress"
                };

                const compatibility = deciderModule.checkGeneralRequestCompatibility(generalRequestConfigElement, incomingLocalRequest);
                expect(compatibility).toBe(true);
            });

            test("should return false if a property of GeneralRequestConfig doesn't match the Request", () => {
                const generalRequestConfigElement: GeneralRequestConfig = {
                    peer: "anotherAddress"
                };

                const compatibility = deciderModule.checkGeneralRequestCompatibility(generalRequestConfigElement, incomingLocalRequest);
                expect(compatibility).toBe(false);
            });

            test("should return false if a property of GeneralRequestConfig is set but is undefined in the Request", () => {
                const generalRequestConfigElement: GeneralRequestConfig = {
                    "content.title": "requestTitle"
                };

                const incomingLocalRequestWithoutTitle = {
                    ...incomingLocalRequest,
                    content: {
                        ...incomingLocalRequest.content,
                        title: undefined
                    }
                };

                const compatibility = deciderModule.checkGeneralRequestCompatibility(generalRequestConfigElement, incomingLocalRequestWithoutTitle);
                expect(compatibility).toBe(false);
            });
        });

        describe("checkRequestItemCompatibility", () => {
            describe("AuthenticationRequestItemConfig", () => {
                let authenticationRequestItem: AuthenticationRequestItemJSON;

                beforeAll(() => {
                    authenticationRequestItem = {
                        "@type": "AuthenticationRequestItem",
                        mustBeAccepted: true,
                        requireManualDecision: false,
                        title: "requestItemTitle",
                        description: "requestItemDescription",
                        metadata: { aKey: "aValue" }
                    };
                });

                test("should return true if all properties of RequestItemConfig are set with strings", () => {
                    const requestItemConfigElement: RequestItemConfig = {
                        "content.item.@type": "AuthenticationRequestItem",
                        "content.item.mustBeAccepted": true,
                        "content.item.title": "requestItemTitle",
                        "content.item.description": "requestItemDescription",
                        "content.item.metadata": { aKey: "aValue" }
                    };

                    const compatibility = deciderModule.checkRequestItemCompatibility(requestItemConfigElement, authenticationRequestItem);
                    expect(compatibility).toBe(true);
                });

                test("should return true if all properties of RequestItemConfig are set with string arrays", () => {
                    const requestItemConfigElement: RequestItemConfig = {
                        "content.item.@type": ["AuthenticationRequestItem", "ConsentRequestItem"],
                        "content.item.mustBeAccepted": true,
                        "content.item.title": ["requestItemTitle", "anotherRequestItemTitle"],
                        "content.item.description": ["requestItemDescription", "anotherRequestItemDescription"],
                        "content.item.metadata": [{ aKey: "aValue" }, { anotherKey: "anotherValue" }]
                    };

                    const compatibility = deciderModule.checkRequestItemCompatibility(requestItemConfigElement, authenticationRequestItem);
                    expect(compatibility).toBe(true);
                });

                test("should return true if some properties of RequestItemConfig are not set", () => {
                    const requestItemConfigElement: RequestItemConfig = {
                        "content.item.@type": "AuthenticationRequestItem"
                    };

                    const compatibility = deciderModule.checkRequestItemCompatibility(requestItemConfigElement, authenticationRequestItem);
                    expect(compatibility).toBe(true);
                });

                test("should return false if a property of RequestItemConfig doesn't match the RequestItem", () => {
                    const requestItemConfigElement: RequestItemConfig = {
                        "content.item.@type": "AuthenticationRequestItem",
                        "content.item.title": "anotherRequestItemTitle"
                    };

                    const compatibility = deciderModule.checkRequestItemCompatibility(requestItemConfigElement, authenticationRequestItem);
                    expect(compatibility).toBe(false);
                });

                test("should return false if a property of RequestItemConfig is set but is undefined in the RequestItem", () => {
                    const requestItemConfigElement: RequestItemConfig = {
                        "content.item.@type": "AuthenticationRequestItem",
                        "content.item.title": "requestItemTitle"
                    };

                    const authenticationRequestItemWithoutTitle = {
                        ...authenticationRequestItem,
                        title: undefined
                    };

                    const compatibility = deciderModule.checkRequestItemCompatibility(requestItemConfigElement, authenticationRequestItemWithoutTitle);
                    expect(compatibility).toBe(false);
                });
            });

            describe("ConsentRequestItemConfig", () => {
                let consentRequestItem: ConsentRequestItemJSON;

                beforeAll(() => {
                    consentRequestItem = {
                        "@type": "ConsentRequestItem",
                        consent: "consentText",
                        link: "consentLink",
                        mustBeAccepted: true,
                        requireManualDecision: false,
                        title: "requestItemTitle",
                        description: "requestItemDescription",
                        metadata: { aKey: "aValue" }
                    };
                });

                test("should return true if all properties of ConsentRequestItemConfig are set with strings", () => {
                    const requestItemConfigElement: ConsentRequestItemConfig = {
                        "content.item.@type": "ConsentRequestItem",
                        "content.item.consent": "consentText",
                        "content.item.link": "consentLink",
                        "content.item.mustBeAccepted": true,
                        "content.item.title": "requestItemTitle",
                        "content.item.description": "requestItemDescription",
                        "content.item.metadata": { aKey: "aValue" }
                    };

                    const compatibility = deciderModule.checkRequestItemCompatibility(requestItemConfigElement, consentRequestItem);
                    expect(compatibility).toBe(true);
                });

                test("should return true if all properties of ConsentRequestItemConfig are set with string arrays", () => {
                    const requestItemConfigElement: ConsentRequestItemConfig = {
                        "content.item.@type": "ConsentRequestItem",
                        "content.item.consent": ["consentText", "anotherConsentText"],
                        "content.item.link": ["consentLink", "anotherConsentLink"],
                        "content.item.mustBeAccepted": true,
                        "content.item.title": ["requestItemTitle", "anotherRequestItemTitle"],
                        "content.item.description": ["requestItemDescription", "anotherRequestItemDescription"],
                        "content.item.metadata": [{ aKey: "aValue" }, { anotherKey: "anotherValue" }]
                    };

                    const compatibility = deciderModule.checkRequestItemCompatibility(requestItemConfigElement, consentRequestItem);
                    expect(compatibility).toBe(true);
                });

                test("should return false if a property of ConsentRequestItemConfig doesn't match the RequestItem", () => {
                    const requestItemConfigElement: ConsentRequestItemConfig = {
                        "content.item.@type": "ConsentRequestItem",
                        "content.item.consent": "anotherConsentText"
                    };

                    const compatibility = deciderModule.checkRequestItemCompatibility(requestItemConfigElement, consentRequestItem);
                    expect(compatibility).toBe(false);
                });
            });

            describe("CreateAttributeRequestItemConfig", () => {
                let createIdentityAttributeRequestItem: CreateAttributeRequestItemJSON;
                let createRelationshipAttributeRequestItem: CreateAttributeRequestItemJSON;

                beforeAll(() => {
                    createIdentityAttributeRequestItem = {
                        "@type": "CreateAttributeRequestItem",
                        attribute: {
                            "@type": "IdentityAttribute",
                            value: {
                                "@type": "GivenName",
                                value: "aGivenName"
                            },
                            tags: ["tag1", "tag2"],
                            owner: "attributeOwner",
                            validFrom: "validFromDate",
                            validTo: "validToDate"
                        },
                        mustBeAccepted: true,
                        requireManualDecision: false,
                        title: "requestItemTitle",
                        description: "requestItemDescription",
                        metadata: { aKey: "aValue" }
                    };

                    createRelationshipAttributeRequestItem = {
                        "@type": "CreateAttributeRequestItem",
                        attribute: {
                            "@type": "RelationshipAttribute",
                            value: {
                                "@type": "ProprietaryString",
                                value: "aProprietaryString",
                                title: "aProprietaryTitle",
                                description: "aProprietaryDescription"
                            },
                            key: "aKey",
                            isTechnical: false,
                            confidentiality: RelationshipAttributeConfidentiality.Public,
                            owner: "attributeOwner",
                            validFrom: "validFromDate",
                            validTo: "validToDate"
                        },
                        mustBeAccepted: true,
                        requireManualDecision: false,
                        title: "requestItemTitle",
                        description: "requestItemDescription",
                        metadata: { aKey: "aValue" }
                    };
                });

                test("should return true if all properties of CreateAttributeRequestItemConfig for an IdentityAttribute are set with strings", () => {
                    const requestItemConfigElement: CreateAttributeRequestItemConfig = {
                        "content.item.@type": "CreateAttributeRequestItem",
                        "content.item.attribute.@type": "IdentityAttribute",
                        "content.item.attribute.owner": "attributeOwner",
                        "content.item.attribute.validFrom": "validFromDate",
                        "content.item.attribute.validTo": "validToDate",
                        "content.item.attribute.tags": ["tag1", "tag2"],
                        "content.item.attribute.value.@type": "GivenName",
                        "content.item.attribute.value.value": "aGivenName",
                        "content.item.mustBeAccepted": true,
                        "content.item.title": "requestItemTitle",
                        "content.item.description": "requestItemDescription",
                        "content.item.metadata": { aKey: "aValue" }
                    };

                    const compatibility = deciderModule.checkRequestItemCompatibility(requestItemConfigElement, createIdentityAttributeRequestItem);
                    expect(compatibility).toBe(true);
                });

                test("should return true if all properties of CreateAttributeRequestItemConfig for a RelationshipAttribute are set with strings", () => {
                    const requestItemConfigElement: CreateAttributeRequestItemConfig = {
                        "content.item.@type": "CreateAttributeRequestItem",
                        "content.item.attribute.@type": "RelationshipAttribute",
                        "content.item.attribute.owner": "attributeOwner",
                        "content.item.attribute.validFrom": "validFromDate",
                        "content.item.attribute.validTo": "validToDate",
                        "content.item.attribute.key": "aKey",
                        "content.item.attribute.isTechnical": false,
                        "content.item.attribute.confidentiality": RelationshipAttributeConfidentiality.Public,
                        "content.item.attribute.value.@type": "ProprietaryString",
                        "content.item.attribute.value.value": "aProprietaryString",
                        "content.item.attribute.value.title": "aProprietaryTitle",
                        "content.item.attribute.value.description": "aProprietaryDescription",
                        "content.item.mustBeAccepted": true,
                        "content.item.title": "requestItemTitle",
                        "content.item.description": "requestItemDescription",
                        "content.item.metadata": { aKey: "aValue" }
                    };

                    const compatibility = deciderModule.checkRequestItemCompatibility(requestItemConfigElement, createRelationshipAttributeRequestItem);
                    expect(compatibility).toBe(true);
                });

                test("should return true if all properties of CreateAttributeRequestItemConfig for an IdentityAttribute are set with string arrays", () => {
                    const requestItemConfigElement: CreateAttributeRequestItemConfig = {
                        "content.item.@type": "CreateAttributeRequestItem",
                        "content.item.attribute.@type": "IdentityAttribute",
                        "content.item.attribute.owner": ["attributeOwner", "anotherAttributeOwner"],
                        "content.item.attribute.validFrom": ["validFromDate", "anotherValidFromDate"],
                        "content.item.attribute.validTo": ["validToDate", "anotherValidToDate"],
                        "content.item.attribute.tags": ["tag1", "tag2", "tag3"],
                        "content.item.attribute.value.@type": ["GivenName", "Surname"],
                        "content.item.attribute.value.value": ["aGivenName", "anotherGivenName"],
                        "content.item.mustBeAccepted": true,
                        "content.item.title": ["requestItemTitle", "anotherRequestItemTitle"],
                        "content.item.description": ["requestItemDescription", "anotherRequestItemDescription"],
                        "content.item.metadata": [{ aKey: "aValue" }, { anotherKey: "anotherValue" }]
                    };

                    const compatibility = deciderModule.checkRequestItemCompatibility(requestItemConfigElement, createIdentityAttributeRequestItem);
                    expect(compatibility).toBe(true);
                });

                test("should return true if all properties of CreateAttributeRequestItemConfig for a RelationshipAttribute are set with string arrays", () => {
                    const requestItemConfigElement: CreateAttributeRequestItemConfig = {
                        "content.item.@type": "CreateAttributeRequestItem",
                        "content.item.attribute.@type": "RelationshipAttribute",
                        "content.item.attribute.owner": ["attributeOwner", "anotherAttributeOwner"],
                        "content.item.attribute.validFrom": ["validFromDate", "anotherValidFromDate"],
                        "content.item.attribute.validTo": ["validToDate", "anotherValidToDate"],
                        "content.item.attribute.key": ["aKey", "anotherKey"],
                        "content.item.attribute.isTechnical": false,
                        "content.item.attribute.confidentiality": [RelationshipAttributeConfidentiality.Public, RelationshipAttributeConfidentiality.Protected],
                        "content.item.attribute.value.@type": ["ProprietaryString", "ProprietaryLanguage"],
                        "content.item.attribute.value.value": ["aProprietaryString", "anotherProprietaryString"],
                        "content.item.attribute.value.title": ["aProprietaryTitle", "anotherProprietaryTitle"],
                        "content.item.attribute.value.description": ["aProprietaryDescription", "anotherProprietaryDescription"],
                        "content.item.mustBeAccepted": true,
                        "content.item.title": ["requestItemTitle", "anotherRequestItemTitle"],
                        "content.item.description": ["requestItemDescription", "anotherRequestItemDescription"],
                        "content.item.metadata": [{ aKey: "aValue" }, { anotherKey: "anotherValue" }]
                    };

                    const compatibility = deciderModule.checkRequestItemCompatibility(requestItemConfigElement, createRelationshipAttributeRequestItem);
                    expect(compatibility).toBe(true);
                });

                test("should return false if a property of CreateAttributeRequestItemConfig doesn't match the RequestItem", () => {
                    const requestItemConfigElement: CreateAttributeRequestItemConfig = {
                        "content.item.@type": "CreateAttributeRequestItem",
                        "content.item.attribute.@type": "RelationshipAttribute"
                    };

                    const compatibility = deciderModule.checkRequestItemCompatibility(requestItemConfigElement, createIdentityAttributeRequestItem);
                    expect(compatibility).toBe(false);
                });
            });
        });
    });

    describe("Integration tests", () => {
        test("moves an incoming Request from a Message into status 'ManualDecisionRequired' after it reached status 'DecisionRequired'", async () => {
            const message = await exchangeMessage(sender.transport, recipient.transport);

            const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                receivedRequest: { "@type": "Request", items: [{ "@type": "TestRequestItem", mustBeAccepted: false }] },
                requestSourceId: message.id
            });

            await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

            await expect(recipient.eventBus).toHavePublished(
                IncomingRequestStatusChangedEvent,
                (e) => e.data.newStatus === LocalRequestStatus.ManualDecisionRequired && e.data.request.id === receivedRequestResult.value.id
            );

            const requestAfterAction = await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id });
            expect(requestAfterAction.value.status).toStrictEqual(LocalRequestStatus.ManualDecisionRequired);
        });

        test("triggers MessageProcessedEvent", async () => {
            const message = await exchangeMessage(sender.transport, recipient.transport);

            const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                receivedRequest: { "@type": "Request", items: [{ "@type": "TestRequestItem", mustBeAccepted: false }] },
                requestSourceId: message.id
            });

            await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

            await expect(recipient.eventBus).toHavePublished(MessageProcessedEvent, (e) => e.data.result === MessageProcessedResult.ManualRequestDecisionRequired);
        });

        test("moves an incoming Request from a Relationship Template into status 'ManualDecisionRequired' after it reached status 'DecisionRequired'", async () => {
            const request = Request.from({ items: [TestRequestItem.from({ mustBeAccepted: false })] });
            const template = (
                await sender.transport.relationshipTemplates.createOwnRelationshipTemplate({
                    content: RelationshipTemplateContent.from({
                        onNewRelationship: request
                    }).toJSON(),
                    expiresAt: CoreDate.utc().add({ minutes: 5 }).toISOString()
                })
            ).value;

            await recipient.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.truncatedReference });

            const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                receivedRequest: request.toJSON(),
                requestSourceId: template.id
            });

            await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

            await expect(recipient.eventBus).toHavePublished(
                IncomingRequestStatusChangedEvent,
                (e) => e.data.newStatus === LocalRequestStatus.ManualDecisionRequired && e.data.request.id === receivedRequestResult.value.id
            );

            const requestAfterAction = await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id });

            expect(requestAfterAction.value.status).toStrictEqual(LocalRequestStatus.ManualDecisionRequired);
        });

        test("triggers RelationshipTemplateProcessedEvent for an incoming Request from a Template after it reached status 'DecisionRequired'", async () => {
            const request = Request.from({ items: [TestRequestItem.from({ mustBeAccepted: false })] });
            const template = (
                await sender.transport.relationshipTemplates.createOwnRelationshipTemplate({
                    content: RelationshipTemplateContent.from({
                        onNewRelationship: request
                    }).toJSON(),
                    expiresAt: CoreDate.utc().add({ minutes: 5 }).toISOString()
                })
            ).value;

            await recipient.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: template.truncatedReference });

            const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                receivedRequest: request.toJSON(),
                requestSourceId: template.id
            });

            await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

            await recipient.eventBus.waitForEvent(
                IncomingRequestStatusChangedEvent,
                (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired && e.data.request.id === receivedRequestResult.value.id
            );

            await expect(recipient.eventBus).toHavePublished(
                RelationshipTemplateProcessedEvent,
                (e) => e.data.template.id === template.id && e.data.result === RelationshipTemplateProcessedResult.ManualRequestDecisionRequired
            );
        });

        test("automatically accept a ShareAttributeRequestItem with attribute value type FileReferenceAttribute", async () => {
            const deciderConfig: DeciderModuleConfigurationOverwrite = {
                automationConfig: [
                    {
                        requestConfig: {
                            "content.item.@type": "ShareAttributeRequestItem",
                            "content.item.attribute.value.@type": "IdentityFileReference"
                        },
                        responseConfig: {
                            accept: true
                        }
                    }
                ]
            };
            const automatedService = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];

            const message = await exchangeMessage(sender.transport, automatedService.transport);
            const receivedRequestResult = await automatedService.consumption.incomingRequests.received({
                receivedRequest: {
                    "@type": "Request",
                    items: [
                        {
                            "@type": "ShareAttributeRequestItem",
                            sourceAttributeId: "ATT",
                            attribute: {
                                "@type": "IdentityAttribute",
                                owner: (await sender.transport.account.getIdentityInfo()).value.address,
                                value: {
                                    "@type": "IdentityFileReference",
                                    value: "A link to a file with more than 30 characters"
                                }
                            },
                            mustBeAccepted: true
                        }
                    ]
                },
                requestSourceId: message.id
            });
            await automatedService.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });
            const receivedRequest = receivedRequestResult.value;

            // TODO: publish an event for automated decisions?
            await expect(automatedService.eventBus).toHavePublished(
                IncomingRequestStatusChangedEvent,
                (e) => e.data.newStatus === LocalRequestStatus.Decided && e.data.request.id === receivedRequest.id
            );

            const requestAfterAction = (await automatedService.consumption.incomingRequests.getRequest({ id: receivedRequest.id })).value;
            expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
            expect(requestAfterAction.response).toBeDefined();
            expect(requestAfterAction.response?.content.result).toBe("Accepted");
            expect(requestAfterAction.response?.content.items[0]["@type"]).toBe("ShareAttributeAcceptResponseItemJSON");

            const sharedAttributeId = (requestAfterAction.response?.content.items[0] as ShareAttributeAcceptResponseItemJSON).attributeId;
            const sharedAttributeResult = await automatedService.consumption.attributes.getAttribute({ id: sharedAttributeId });
            expect(sharedAttributeResult).toBeSuccessful();

            // TODO: check the created Attribute properly
            const sharedAttribute = sharedAttributeResult.value;
            expect(sharedAttribute.content.value).toBe("A link to a file with more than 30 characters");
        });
    });
});
