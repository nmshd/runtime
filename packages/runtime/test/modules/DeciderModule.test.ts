import { NodeLoggerFactory } from "@js-soft/node-logger";
import { AuthenticationRequestItemJSON, RelationshipTemplateContent, Request, ShareAttributeAcceptResponseItemJSON } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { GeneralRequestConfig, RequestItemConfig } from "src/modules/decide";
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
                    "source.reference": "messageId",
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
                    "source.reference": ["messageId", "otherMessageId"],
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
                            "attribute.value.@type": "IdentityFileReference"
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
