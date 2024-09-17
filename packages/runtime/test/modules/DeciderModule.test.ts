import { NodeLoggerFactory } from "@js-soft/node-logger";
import { LocalAttributeDeletionStatus } from "@nmshd/consumption";
import {
    AuthenticationRequestItemJSON,
    ConsentRequestItemJSON,
    CreateAttributeAcceptResponseItemJSON,
    CreateAttributeRequestItemJSON,
    DeleteAttributeAcceptResponseItemJSON,
    FreeTextAcceptResponseItemJSON,
    GivenName,
    GivenNameJSON,
    IdentityAttribute,
    IdentityFileReferenceJSON,
    ProposeAttributeAcceptResponseItemJSON,
    ProprietaryFileReferenceJSON,
    ProprietaryStringJSON,
    ReadAttributeAcceptResponseItemJSON,
    RegisterAttributeListenerAcceptResponseItemJSON,
    RejectResponseItemJSON,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    RelationshipTemplateContent,
    Request,
    ResponseItemGroupJSON,
    ResponseResult,
    ShareAttributeAcceptResponseItemJSON
} from "@nmshd/content";
import { CoreAddress, CoreDate } from "@nmshd/core-types";
import {
    AcceptResponseConfig,
    AuthenticationRequestItemConfig,
    ConsentRequestItemConfig,
    CreateAttributeRequestItemConfig,
    DeleteAttributeAcceptResponseConfig,
    DeleteAttributeRequestItemConfig,
    FreeTextAcceptResponseConfig,
    FreeTextRequestItemConfig,
    GeneralRequestConfig,
    ProposeAttributeRequestItemConfig,
    ProposeAttributeWithNewAttributeAcceptResponseConfig,
    ReadAttributeRequestItemConfig,
    ReadAttributeWithNewAttributeAcceptResponseConfig,
    RegisterAttributeListenerRequestItemConfig,
    RejectResponseConfig,
    RequestItemConfig,
    ShareAttributeRequestItemConfig
} from "src/modules/decide";
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
import {
    RuntimeServiceProvider,
    TestRequestItem,
    TestRuntimeServices,
    establishRelationship,
    exchangeMessage,
    executeFullCreateAndShareRepositoryAttributeFlow,
    expectThrowsAsync
} from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();

afterAll(async () => await runtimeServiceProvider.stop());

describe("DeciderModule", () => {
    describe("Unit tests", () => {
        let deciderModule: DeciderModule;
        beforeAll(() => {
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

            deciderModule = new DeciderModule(runtime, deciderConfig, testLogger);
        });

        // TODO: This is probably not needed anymore, since it is also tested in "GeneralRequestConfig"
        describe("checkCompatibility with GeneralRequestConfig", () => {
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

                const compatibility = deciderModule.checkCompatibility(generalRequestConfigElement, incomingLocalRequest);
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

                const compatibility = deciderModule.checkCompatibility(generalRequestConfigElement, incomingLocalRequest);
                expect(compatibility).toBe(true);
            });

            test("should return true if some properties of GeneralRequestConfig are not set", () => {
                const generalRequestConfigElement: GeneralRequestConfig = {
                    peer: "peerAddress"
                };

                const compatibility = deciderModule.checkCompatibility(generalRequestConfigElement, incomingLocalRequest);
                expect(compatibility).toBe(true);
            });

            test("should return false if a property of GeneralRequestConfig doesn't match the Request", () => {
                const generalRequestConfigElement: GeneralRequestConfig = {
                    peer: "anotherAddress"
                };

                const compatibility = deciderModule.checkCompatibility(generalRequestConfigElement, incomingLocalRequest);
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

                const compatibility = deciderModule.checkCompatibility(generalRequestConfigElement, incomingLocalRequestWithoutTitle);
                expect(compatibility).toBe(false);
            });
        });

        // TODO: Is this needed anymore?
        describe("checkRequestItemCompatibility", () => {
            // TODO: This is probably not needed anymore, since it is also tested in "RequestItemConfig"
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
            // TODO: check other RequestItemConfigs
        });

        describe("validateAutomationConfig", () => {
            const rejectResponseConfig: RejectResponseConfig = {
                accept: false
            };

            const simpleAcceptResponseConfig: AcceptResponseConfig = {
                accept: true
            };

            const deleteAttributeAcceptResponseConfig: DeleteAttributeAcceptResponseConfig = {
                accept: true,
                deletionDate: "deletionDate"
            };

            const freeTextAcceptResponseConfig: FreeTextAcceptResponseConfig = {
                accept: true,
                freeText: "freeText"
            };

            const proposeAttributeWithNewAttributeAcceptResponseConfig: ProposeAttributeWithNewAttributeAcceptResponseConfig = {
                accept: true,
                attribute: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName"
                    },
                    owner: "owner"
                })
            };

            const readAttributeWithNewAttributeAcceptResponseConfig: ReadAttributeWithNewAttributeAcceptResponseConfig = {
                accept: true,
                newAttribute: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName"
                    },
                    owner: "owner"
                })
            };

            const generalRequestConfig: GeneralRequestConfig = {
                peer: ["peerA", "peerB"]
            };

            const authenticationRequestItemConfig: AuthenticationRequestItemConfig = {
                "content.item.@type": "AuthenticationRequestItem"
            };

            const consentRequestItemConfig: ConsentRequestItemConfig = {
                "content.item.@type": "ConsentRequestItem"
            };

            const createAttributeRequestItemConfig: CreateAttributeRequestItemConfig = {
                "content.item.@type": "CreateAttributeRequestItem"
            };

            const deleteAttributeRequestItemConfig: DeleteAttributeRequestItemConfig = {
                "content.item.@type": "DeleteAttributeRequestItem"
            };

            const freeTextRequestItemConfig: FreeTextRequestItemConfig = {
                "content.item.@type": "FreeTextRequestItem",
                "content.item.freeText": "A free text"
            };

            const proposeAttributeRequestItemConfig: ProposeAttributeRequestItemConfig = {
                "content.item.@type": "ProposeAttributeRequestItem"
            };

            const readAttributeRequestItemConfig: ReadAttributeRequestItemConfig = {
                "content.item.@type": "ReadAttributeRequestItem"
            };

            const registerAttributeListenerRequestItemConfig: RegisterAttributeListenerRequestItemConfig = {
                "content.item.@type": "RegisterAttributeListenerRequestItem"
            };

            const shareAttributeRequestItemConfig: ShareAttributeRequestItemConfig = {
                "content.item.@type": "ShareAttributeRequestItem"
            };

            test.each([
                [generalRequestConfig, rejectResponseConfig, true],
                [generalRequestConfig, simpleAcceptResponseConfig, true],
                [generalRequestConfig, deleteAttributeAcceptResponseConfig, false],
                [generalRequestConfig, freeTextAcceptResponseConfig, false],
                [generalRequestConfig, proposeAttributeWithNewAttributeAcceptResponseConfig, false],
                [generalRequestConfig, readAttributeWithNewAttributeAcceptResponseConfig, false],

                [authenticationRequestItemConfig, rejectResponseConfig, true],
                [authenticationRequestItemConfig, simpleAcceptResponseConfig, true],
                [authenticationRequestItemConfig, deleteAttributeAcceptResponseConfig, false],
                [authenticationRequestItemConfig, freeTextAcceptResponseConfig, false],
                [authenticationRequestItemConfig, proposeAttributeWithNewAttributeAcceptResponseConfig, false],
                [authenticationRequestItemConfig, readAttributeWithNewAttributeAcceptResponseConfig, false],

                [consentRequestItemConfig, rejectResponseConfig, true],
                [consentRequestItemConfig, simpleAcceptResponseConfig, true],
                [consentRequestItemConfig, deleteAttributeAcceptResponseConfig, false],
                [consentRequestItemConfig, freeTextAcceptResponseConfig, false],
                [consentRequestItemConfig, proposeAttributeWithNewAttributeAcceptResponseConfig, false],
                [consentRequestItemConfig, readAttributeWithNewAttributeAcceptResponseConfig, false],

                [createAttributeRequestItemConfig, rejectResponseConfig, true],
                [createAttributeRequestItemConfig, simpleAcceptResponseConfig, true],
                [createAttributeRequestItemConfig, deleteAttributeAcceptResponseConfig, false],
                [createAttributeRequestItemConfig, freeTextAcceptResponseConfig, false],
                [createAttributeRequestItemConfig, proposeAttributeWithNewAttributeAcceptResponseConfig, false],
                [createAttributeRequestItemConfig, readAttributeWithNewAttributeAcceptResponseConfig, false],

                [deleteAttributeRequestItemConfig, rejectResponseConfig, true],
                [deleteAttributeRequestItemConfig, simpleAcceptResponseConfig, false],
                [deleteAttributeRequestItemConfig, deleteAttributeAcceptResponseConfig, true],
                [deleteAttributeRequestItemConfig, freeTextAcceptResponseConfig, false],
                [deleteAttributeRequestItemConfig, proposeAttributeWithNewAttributeAcceptResponseConfig, false],
                [deleteAttributeRequestItemConfig, readAttributeWithNewAttributeAcceptResponseConfig, false],

                [freeTextRequestItemConfig, rejectResponseConfig, true],
                [freeTextRequestItemConfig, simpleAcceptResponseConfig, false],
                [freeTextRequestItemConfig, deleteAttributeAcceptResponseConfig, false],
                [freeTextRequestItemConfig, freeTextAcceptResponseConfig, true],
                [freeTextRequestItemConfig, proposeAttributeWithNewAttributeAcceptResponseConfig, false],
                [freeTextRequestItemConfig, readAttributeWithNewAttributeAcceptResponseConfig, false],

                [proposeAttributeRequestItemConfig, rejectResponseConfig, true],
                [proposeAttributeRequestItemConfig, simpleAcceptResponseConfig, false],
                [proposeAttributeRequestItemConfig, deleteAttributeAcceptResponseConfig, false],
                [proposeAttributeRequestItemConfig, freeTextAcceptResponseConfig, false],
                [proposeAttributeRequestItemConfig, proposeAttributeWithNewAttributeAcceptResponseConfig, true],
                [proposeAttributeRequestItemConfig, readAttributeWithNewAttributeAcceptResponseConfig, false],

                [readAttributeRequestItemConfig, rejectResponseConfig, true],
                [readAttributeRequestItemConfig, simpleAcceptResponseConfig, false],
                [readAttributeRequestItemConfig, deleteAttributeAcceptResponseConfig, false],
                [readAttributeRequestItemConfig, freeTextAcceptResponseConfig, false],
                [readAttributeRequestItemConfig, proposeAttributeWithNewAttributeAcceptResponseConfig, false],
                [readAttributeRequestItemConfig, readAttributeWithNewAttributeAcceptResponseConfig, true],

                [registerAttributeListenerRequestItemConfig, rejectResponseConfig, true],
                [registerAttributeListenerRequestItemConfig, simpleAcceptResponseConfig, true],
                [registerAttributeListenerRequestItemConfig, deleteAttributeAcceptResponseConfig, false],
                [registerAttributeListenerRequestItemConfig, freeTextAcceptResponseConfig, false],
                [registerAttributeListenerRequestItemConfig, proposeAttributeWithNewAttributeAcceptResponseConfig, false],
                [registerAttributeListenerRequestItemConfig, readAttributeWithNewAttributeAcceptResponseConfig, false],

                [shareAttributeRequestItemConfig, rejectResponseConfig, true],
                [shareAttributeRequestItemConfig, simpleAcceptResponseConfig, true],
                [shareAttributeRequestItemConfig, deleteAttributeAcceptResponseConfig, false],
                [shareAttributeRequestItemConfig, freeTextAcceptResponseConfig, false],
                [shareAttributeRequestItemConfig, proposeAttributeWithNewAttributeAcceptResponseConfig, false],
                [shareAttributeRequestItemConfig, readAttributeWithNewAttributeAcceptResponseConfig, false]
            ])("%p and %p should return %p as validation result", (requestConfig, responseConfig, expectedCompatibility) => {
                const result = deciderModule.validateAutomationConfig(requestConfig, responseConfig);
                expect(result).toBe(expectedCompatibility);
            });
        });
    });

    describe("Integration tests", () => {
        let sender: TestRuntimeServices;

        beforeAll(async () => {
            const runtimeServices = await runtimeServiceProvider.launch(1, { enableDeciderModule: true, enableRequestModule: true });
            sender = runtimeServices[0];
        }, 30000);

        afterEach(async () => {
            const testRuntimes = runtimeServiceProvider["runtimes"];
            await testRuntimes[testRuntimes.length - 1].stop();
        });

        describe("no automationConfig", () => {
            test("moves an incoming Request into status 'ManualDecisionRequired' if a RequestItem is flagged as requireManualDecision", async () => {
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: { "@type": "Request", items: [{ "@type": "TestRequestItem", mustBeAccepted: false, requireManualDecision: true }] },
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

            test("moves an incoming Request into status 'ManualDecisionRequired' if no automationConfig is set", async () => {
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true }))[0];
                await establishRelationship(sender.transport, recipient.transport);

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

            test("publishes a MessageProcessedEvent if an incoming Request from a Message was moved into status 'ManualDecisionRequired'", async () => {
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: { "@type": "Request", items: [{ "@type": "TestRequestItem", mustBeAccepted: false }] },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.ManualRequestDecisionRequired && e.data.message.id === message.id
                );
            });

            test("publishes a RelationshipTemplateProcessedEvent if an incoming Request from a RelationshipTemplate was moved into status 'ManualDecisionRequired'", async () => {
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true }))[0];
                await establishRelationship(sender.transport, recipient.transport);

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
                    RelationshipTemplateProcessedEvent,
                    (e) => e.data.result === RelationshipTemplateProcessedResult.ManualRequestDecisionRequired && e.data.template.id === template.id
                );
            });
        });

        describe("GeneralRequestConfig", () => {
            test("rejects a Request given a GeneralRequestConfig", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                peer: sender.address
                            },
                            responseConfig: {
                                accept: false,
                                message: "An error message",
                                code: "an.error.code"
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: { "@type": "Request", items: [{ "@type": "AuthenticationRequestItem", mustBeAccepted: false }] },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Rejected);
                expect(responseContent.items).toStrictEqual([{ "@type": "RejectResponseItem", result: "Rejected", message: "An error message", code: "an.error.code" }]);
            });

            test("accepts a Request given a GeneralRequestConfig", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                peer: sender.address
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            { "@type": "AuthenticationRequestItem", mustBeAccepted: false },
                            { "@type": "ConsentRequestItem", consent: "A consent text", mustBeAccepted: false },
                            {
                                "@type": "CreateAttributeRequestItem",
                                attribute: {
                                    "@type": "RelationshipAttribute",
                                    owner: (await sender.transport.account.getIdentityInfo()).value.address,
                                    value: {
                                        "@type": "ProprietaryFileReference",
                                        value: "A link to a file with more than 30 characters",
                                        title: "A title"
                                    },
                                    key: "A key",
                                    confidentiality: RelationshipAttributeConfidentiality.Public
                                },
                                mustBeAccepted: true
                            },
                            {
                                "@type": "RegisterAttributeListenerRequestItem",
                                query: {
                                    "@type": "IdentityAttributeQuery",
                                    valueType: "Nationality"
                                },
                                mustBeAccepted: true
                            },
                            {
                                "@type": "ShareAttributeRequestItem",
                                sourceAttributeId: "sourceAttributeId",
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
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);
                expect(responseContent.items).toHaveLength(5);
                expect(responseContent.items[0]["@type"]).toBe("AcceptResponseItem");
                expect(responseContent.items[1]["@type"]).toBe("AcceptResponseItem");
                expect(responseContent.items[2]["@type"]).toBe("CreateAttributeAcceptResponseItem");
                expect(responseContent.items[3]["@type"]).toBe("RegisterAttributeListenerAcceptResponseItem");
                expect(responseContent.items[4]["@type"]).toBe("ShareAttributeAcceptResponseItem");
            });

            test("decides a Request given a GeneralRequestConfig with all fields set", async () => {
                const requestExpirationDate = CoreDate.utc().add({ days: 1 }).toString();

                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                peer: sender.address,
                                "source.type": "Message",
                                "content.expiresAt": requestExpirationDate,
                                "content.title": "Title of Request",
                                "content.description": "Description of Request",
                                "content.metadata": { key: "value" }
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        expiresAt: requestExpirationDate,
                        title: "Title of Request",
                        description: "Description of Request",
                        metadata: { key: "value" },
                        items: [{ "@type": "AuthenticationRequestItem", mustBeAccepted: false }]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );
            });

            test("decides a Request given a GeneralRequestConfig with all fields set with arrays", async () => {
                const requestExpirationDate = CoreDate.utc().add({ days: 1 }).toString();
                const anotherExpirationDate = CoreDate.utc().add({ days: 2 }).toString();

                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                peer: [sender.address, "another Identity"],
                                "source.type": "Message",
                                "content.expiresAt": [requestExpirationDate, anotherExpirationDate],
                                "content.title": ["Title of Request", "Another title of Request"],
                                "content.description": ["Description of Request", "Another description of Request"],
                                "content.metadata": [{ key: "value" }, { anotherKey: "anotherValue" }]
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        expiresAt: requestExpirationDate,
                        title: "Title of Request",
                        description: "Description of Request",
                        metadata: { key: "value" },
                        items: [{ "@type": "AuthenticationRequestItem", mustBeAccepted: false }]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );
            });

            test("decides a Request given a GeneralRequestConfig that doesn't require a property that is set in the Request", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                peer: sender.address
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        title: "Title of Request",
                        items: [{ "@type": "AuthenticationRequestItem", mustBeAccepted: false }]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );
            });

            test("cannot decide a Request given a GeneralRequestConfig that doesn't fit the Request", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                peer: "another identity",
                                "source.type": "Message"
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: { "@type": "Request", items: [{ "@type": "AuthenticationRequestItem", mustBeAccepted: false }] },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.ManualRequestDecisionRequired && e.data.message.id === message.id
                );
            });

            test("cannot decide a Request given a GeneralRequestConfig with arrays that don't fit the Request", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                peer: ["another Identity", "a further other Identity"],
                                "source.type": "Message"
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: { "@type": "Request", items: [{ "@type": "AuthenticationRequestItem", mustBeAccepted: false }] },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.ManualRequestDecisionRequired && e.data.message.id === message.id
                );
            });

            test("cannot decide a Request given a GeneralRequestConfig that requires a property that is not set in the Request", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                peer: sender.address,
                                "content.title": "Title of Request"
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: { "@type": "Request", items: [{ "@type": "AuthenticationRequestItem", mustBeAccepted: false }] },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.ManualRequestDecisionRequired && e.data.message.id === message.id
                );
            });
        });

        describe("RequestItemConfig", () => {
            test("rejects a RequestItem given a RequestItemConfig with all fields set", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "AuthenticationRequestItem",
                                "content.item.mustBeAccepted": false,
                                "content.item.title": "Title of RequestItem",
                                "content.item.description": "Description of RequestItem",
                                "content.item.metadata": { key: "value" }
                            },
                            responseConfig: {
                                accept: false,
                                code: "an.error.code",
                                message: "An error message"
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "AuthenticationRequestItem",
                                mustBeAccepted: false,
                                title: "Title of RequestItem",
                                description: "Description of RequestItem",
                                metadata: { key: "value" }
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Rejected);
                expect((responseContent.items[0] as RejectResponseItemJSON).code).toBe("an.error.code");
                expect((responseContent.items[0] as RejectResponseItemJSON).message).toBe("An error message");
            });

            test("accepts a RequestItem given a RequestItemConfig with all fields set", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "AuthenticationRequestItem",
                                "content.item.mustBeAccepted": false,
                                "content.item.title": "Title of RequestItem",
                                "content.item.description": "Description of RequestItem",
                                "content.item.metadata": { key: "value" }
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "AuthenticationRequestItem",
                                mustBeAccepted: false,
                                title: "Title of RequestItem",
                                description: "Description of RequestItem",
                                metadata: { key: "value" }
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);
            });

            test("accepts a RequestItem given a RequestItemConfig with all fields set with arrays", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": ["AuthenticationRequestItem", "ContentRequestItem"],
                                "content.item.mustBeAccepted": false,
                                "content.item.title": ["Title of RequestItem", "Another title of RequestItem"],
                                "content.item.description": ["Description of RequestItem", "Another description of RequestItem"],
                                "content.item.metadata": [{ key: "value" }, { anotherKey: "anotherValue" }]
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "AuthenticationRequestItem",
                                mustBeAccepted: false,
                                title: "Title of RequestItem",
                                description: "Description of RequestItem",
                                metadata: { key: "value" }
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);
            });

            test("decides a Request with equal RequestItems given a single RequestItemConfig", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "AuthenticationRequestItem"
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "AuthenticationRequestItem",
                                mustBeAccepted: false
                            },
                            {
                                "@type": "AuthenticationRequestItem",
                                mustBeAccepted: false
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);

                const responseItems = responseContent.items;
                expect(responseItems).toHaveLength(2);
                expect(responseItems[0]["@type"]).toBe("AcceptResponseItem");
                expect(responseItems[1]["@type"]).toBe("AcceptResponseItem");
            });

            test("decides a RequestItem given a RequestItemConfig that doesn't require a property that is set in the Request", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "AuthenticationRequestItem"
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "AuthenticationRequestItem",
                                mustBeAccepted: false,
                                title: "Title of RequestItem"
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);
            });

            test("cannot decide a RequestItem given a RequestItemConfig that doesn't fit the RequestItem", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "AuthenticationRequestItem",
                                "content.item.title": "Another title of RequestItem"
                            },
                            responseConfig: {
                                accept: false
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "AuthenticationRequestItem",
                                mustBeAccepted: false,
                                title: "Title of RequestItem"
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.ManualRequestDecisionRequired && e.data.message.id === message.id
                );
            });

            test("cannot decide a RequestItem given a RequestItemConfig with arrays that doesn't fit the RequestItem", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "AuthenticationRequestItem",
                                "content.item.title": ["Another title of RequestItem", "A further title of RequestItem"]
                            },
                            responseConfig: {
                                accept: false
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "AuthenticationRequestItem",
                                mustBeAccepted: false,
                                title: "Title of RequestItem"
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.ManualRequestDecisionRequired && e.data.message.id === message.id
                );
            });

            test("cannot decide a RequestItem given a RequestItemConfig that requires a property that is not set in the Request", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "AuthenticationRequestItem",
                                "content.item.title": "Title of RequestItem"
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: { "@type": "Request", items: [{ "@type": "AuthenticationRequestItem", mustBeAccepted: false }] },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.ManualRequestDecisionRequired && e.data.message.id === message.id
                );
            });
        });

        describe("RequestItemDerivationConfigs", () => {
            test("accepts an AuthenticationRequestItem given a AuthenticationRequestItemConfig", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "AuthenticationRequestItem"
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "AuthenticationRequestItem",
                                mustBeAccepted: true
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);
                expect(responseContent.items).toHaveLength(1);
                expect(responseContent.items[0]["@type"]).toBe("AcceptResponseItem");
            });

            test("accepts a ConsentRequestItem given a ConsentRequestItemConfig with all fields set", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "ConsentRequestItem",
                                "content.item.consent": "A consent text",
                                "content.item.link": "www.a-link-to-a-consent-website.com"
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "ConsentRequestItem",
                                mustBeAccepted: true,
                                consent: "A consent text",
                                link: "www.a-link-to-a-consent-website.com"
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);
                expect(responseContent.items).toHaveLength(1);
                expect(responseContent.items[0]["@type"]).toBe("AcceptResponseItem");
            });

            test("accepts a CreateAttributeRequestItem given a CreateAttributeRequestItemConfig with all fields set for an IdentityAttribute", async () => {
                const attributeValidFrom = CoreDate.utc().subtract({ days: 1 }).toString();
                const attributeValidTo = CoreDate.utc().add({ days: 1 }).toString();

                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "CreateAttributeRequestItem",
                                "content.item.attribute.@type": "IdentityAttribute",
                                "content.item.attribute.validFrom": attributeValidFrom,
                                "content.item.attribute.validTo": attributeValidTo,
                                "content.item.attribute.tags": ["tag1", "tag2"],
                                "content.item.attribute.value.@type": "IdentityFileReference",
                                "content.item.attribute.value.value": "A link to a file with more than 30 characters"
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "CreateAttributeRequestItem",
                                attribute: {
                                    "@type": "IdentityAttribute",
                                    owner: recipient.address,
                                    validFrom: attributeValidFrom,
                                    validTo: attributeValidTo,
                                    tags: ["tag1", "tag3"],
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
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);
                expect(responseContent.items).toHaveLength(1);
                expect(responseContent.items[0]["@type"]).toBe("CreateAttributeAcceptResponseItem");

                const createdAttributeId = (responseContent.items[0] as CreateAttributeAcceptResponseItemJSON).attributeId;
                const createdAttributeResult = await recipient.consumption.attributes.getAttribute({ id: createdAttributeId });
                expect(createdAttributeResult).toBeSuccessful();

                const createdAttribute = createdAttributeResult.value;
                expect(createdAttribute.content.owner).toBe(recipient.address);
                expect(createdAttribute.content.value["@type"]).toBe("IdentityFileReference");
                expect((createdAttribute.content.value as IdentityFileReferenceJSON).value).toBe("A link to a file with more than 30 characters");
            });

            test("accepts a CreateAttributeRequestItem given a CreateAttributeRequestItemConfig with all fields set for a RelationshipAttribute", async () => {
                const attributeValidFrom = CoreDate.utc().subtract({ days: 1 }).toString();
                const attributeValidTo = CoreDate.utc().add({ days: 1 }).toString();

                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "CreateAttributeRequestItem",
                                "content.item.attribute.@type": "RelationshipAttribute",
                                "content.item.attribute.owner": sender.address,
                                "content.item.attribute.validFrom": attributeValidFrom,
                                "content.item.attribute.validTo": attributeValidTo,
                                "content.item.attribute.key": "A key",
                                "content.item.attribute.isTechnical": false,
                                "content.item.attribute.confidentiality": RelationshipAttributeConfidentiality.Public,
                                "content.item.attribute.value.@type": "ProprietaryFileReference",
                                "content.item.attribute.value.value": "A proprietary file reference with more than 30 characters",
                                "content.item.attribute.value.title": "An Attribute's title",
                                "content.item.attribute.value.description": "An Attribute's description"
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "CreateAttributeRequestItem",
                                attribute: {
                                    "@type": "RelationshipAttribute",
                                    owner: sender.address,
                                    validFrom: attributeValidFrom,
                                    validTo: attributeValidTo,
                                    key: "A key",
                                    isTechnical: false,
                                    confidentiality: RelationshipAttributeConfidentiality.Public,
                                    value: {
                                        "@type": "ProprietaryFileReference",
                                        value: "A proprietary file reference with more than 30 characters",
                                        title: "An Attribute's title",
                                        description: "An Attribute's description"
                                    }
                                },
                                mustBeAccepted: true
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);
                expect(responseContent.items).toHaveLength(1);
                expect(responseContent.items[0]["@type"]).toBe("CreateAttributeAcceptResponseItem");

                const createdAttributeId = (responseContent.items[0] as CreateAttributeAcceptResponseItemJSON).attributeId;
                const createdAttributeResult = await recipient.consumption.attributes.getAttribute({ id: createdAttributeId });
                expect(createdAttributeResult).toBeSuccessful();

                const createdAttribute = createdAttributeResult.value;
                expect(createdAttribute.content.owner).toBe(sender.address);
                expect(createdAttribute.content.value["@type"]).toBe("ProprietaryFileReference");
                expect((createdAttribute.content.value as ProprietaryFileReferenceJSON).value).toBe("A proprietary file reference with more than 30 characters");
            });

            test("accepts a DeleteAttributeRequestItem given a DeleteAttributeRequestItemConfig with all fields set", async () => {
                const deletionDate = CoreDate.utc().add({ days: 7 }).toString();

                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "DeleteAttributeRequestItem"
                            },
                            responseConfig: {
                                accept: true,
                                deletionDate: deletionDate
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig, enableRequestModule: true }))[0];

                await establishRelationship(sender.transport, recipient.transport);
                const sharedAttribute = await executeFullCreateAndShareRepositoryAttributeFlow(sender, recipient, {
                    content: {
                        value: {
                            "@type": "GivenName",
                            value: "Given name of sender"
                        }
                    }
                });

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "DeleteAttributeRequestItem",
                                mustBeAccepted: true,
                                attributeId: sharedAttribute.id
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);
                expect(responseContent.items).toHaveLength(1);
                expect(responseContent.items[0]["@type"]).toBe("DeleteAttributeAcceptResponseItem");
                expect((responseContent.items[0] as DeleteAttributeAcceptResponseItemJSON).deletionDate).toBe(deletionDate);

                const updatedSharedAttribute = (await recipient.consumption.attributes.getAttribute({ id: sharedAttribute.id })).value;
                expect(updatedSharedAttribute.deletionInfo!.deletionStatus).toBe(LocalAttributeDeletionStatus.ToBeDeleted);
                expect(updatedSharedAttribute.deletionInfo!.deletionDate).toBe(deletionDate);
            });

            test("accepts a FreeTextRequestItem given a FreeTextRequestItemConfig with all fields set", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "FreeTextRequestItem",
                                "content.item.freeText": "A Request free text"
                            },
                            responseConfig: {
                                accept: true,
                                freeText: "A Response free text"
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "FreeTextRequestItem",
                                mustBeAccepted: true,
                                freeText: "A Request free text"
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);
                expect(responseContent.items).toHaveLength(1);
                expect(responseContent.items[0]["@type"]).toBe("FreeTextAcceptResponseItem");
                expect((responseContent.items[0] as FreeTextAcceptResponseItemJSON).freeText).toBe("A Response free text");
            });

            test("accepts a ProposeAttributeRequestItem given a ProposeAttributeRequestItemConfig with all fields set for an IdentityAttribute", async () => {
                const attributeValidFrom = CoreDate.utc().subtract({ days: 1 }).toString();
                const attributeValidTo = CoreDate.utc().add({ days: 1 }).toString();

                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "ProposeAttributeRequestItem",
                                "content.item.attribute.@type": "IdentityAttribute",
                                "content.item.attribute.validFrom": attributeValidFrom,
                                "content.item.attribute.validTo": attributeValidTo,
                                "content.item.attribute.tags": ["tag1", "tag2"],
                                "content.item.attribute.value.@type": "GivenName",
                                "content.item.attribute.value.value": "Given name of recipient proposed by sender",
                                "content.item.query.@type": "IdentityAttributeQuery",
                                "content.item.query.validFrom": attributeValidFrom,
                                "content.item.query.validTo": attributeValidTo,
                                "content.item.query.valueType": "GivenName",
                                "content.item.query.tags": ["tag1", "tag2"]
                            },
                            // TODO: this will always create a new Attribute
                            responseConfig: {
                                accept: true,
                                attribute: IdentityAttribute.from({
                                    owner: "",
                                    validFrom: attributeValidFrom,
                                    validTo: attributeValidTo,
                                    value: GivenName.from("Given name of recipient").toJSON(),
                                    tags: ["tag1"]
                                })
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "ProposeAttributeRequestItem",
                                attribute: {
                                    "@type": "IdentityAttribute",
                                    owner: recipient.address,
                                    validFrom: attributeValidFrom,
                                    validTo: attributeValidTo,
                                    tags: ["tag1", "tag3"],
                                    value: {
                                        "@type": "GivenName",
                                        value: "Given name of recipient proposed by sender"
                                    }
                                },
                                query: {
                                    "@type": "IdentityAttributeQuery",
                                    validFrom: attributeValidFrom,
                                    validTo: attributeValidTo,
                                    valueType: "GivenName",
                                    tags: ["tag1", "tag3"]
                                },
                                mustBeAccepted: true
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);
                expect(responseContent.items).toHaveLength(1);
                expect(responseContent.items[0]["@type"]).toBe("ProposeAttributeAcceptResponseItem");

                const readAttributeId = (responseContent.items[0] as ProposeAttributeAcceptResponseItemJSON).attributeId;
                const readAttributeResult = await recipient.consumption.attributes.getAttribute({ id: readAttributeId });
                expect(readAttributeResult).toBeSuccessful();

                const readAttribute = readAttributeResult.value;
                expect(readAttribute.content.owner).toBe(recipient.address);
                expect(readAttribute.content.value["@type"]).toBe("GivenName");
                expect((readAttribute.content.value as GivenNameJSON).value).toBe("Given name of recipient");
            });

            test("accepts a ProposeAttributeRequestItem given a ProposeAttributeRequestItemConfig with all fields set for a RelationshipAttribute", async () => {
                const attributeValidFrom = CoreDate.utc().subtract({ days: 1 }).toString();
                const attributeValidTo = CoreDate.utc().add({ days: 1 }).toString();

                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "ProposeAttributeRequestItem",
                                "content.item.attribute.@type": "RelationshipAttribute",
                                "content.item.attribute.owner": "",
                                "content.item.attribute.validFrom": attributeValidFrom,
                                "content.item.attribute.validTo": attributeValidTo,
                                "content.item.attribute.key": "A key",
                                "content.item.attribute.isTechnical": false,
                                "content.item.attribute.confidentiality": RelationshipAttributeConfidentiality.Public,
                                "content.item.attribute.value.@type": "ProprietaryString",
                                "content.item.attribute.value.value": "A proprietary string",
                                "content.item.attribute.value.title": "Title of Attribute",
                                "content.item.attribute.value.description": "Description of Attribute",
                                "content.item.query.@type": "RelationshipAttributeQuery",
                                "content.item.query.validFrom": attributeValidFrom,
                                "content.item.query.validTo": attributeValidTo,
                                "content.item.query.key": "A key",
                                "content.item.query.owner": "",
                                "content.item.query.attributeCreationHints.title": "Title of Attribute",
                                "content.item.query.attributeCreationHints.description": "Description of Attribute",
                                "content.item.query.attributeCreationHints.valueType": "ProprietaryString",
                                "content.item.query.attributeCreationHints.confidentiality": RelationshipAttributeConfidentiality.Public
                            },
                            // TODO: this will always create a new Attribute
                            responseConfig: {
                                accept: true,
                                attribute: RelationshipAttribute.from({
                                    owner: CoreAddress.from(""),
                                    value: {
                                        "@type": "ProprietaryString",
                                        value: "A proprietary string",
                                        title: "Title of Attribute",
                                        description: "Description of Attribute",
                                        validFrom: attributeValidFrom,
                                        validTo: attributeValidTo
                                    },
                                    key: "A key",
                                    confidentiality: RelationshipAttributeConfidentiality.Public
                                })
                            }
                        }
                    ]
                };

                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "ProposeAttributeRequestItem",
                                attribute: {
                                    "@type": "RelationshipAttribute",
                                    owner: sender.address,
                                    validFrom: attributeValidFrom,
                                    validTo: attributeValidTo,
                                    key: "A key",
                                    isTechnical: false,
                                    confidentiality: RelationshipAttributeConfidentiality.Public,
                                    value: {
                                        "@type": "ProprietaryString",
                                        value: "A proprietary string",
                                        title: "Title of Attribute",
                                        description: "Description of Attribute"
                                    }
                                },
                                query: {
                                    "@type": "RelationshipAttributeQuery",
                                    owner: "",
                                    validFrom: attributeValidFrom,
                                    validTo: attributeValidTo,
                                    key: "A key",
                                    attributeCreationHints: {
                                        valueType: "ProprietaryString",
                                        title: "Title of Attribute",
                                        description: "Description of Attribute",
                                        confidentiality: RelationshipAttributeConfidentiality.Public
                                    }
                                },
                                mustBeAccepted: true
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);
                expect(responseContent.items).toHaveLength(1);
                expect(responseContent.items[0]["@type"]).toBe("ProposeAttributeAcceptResponseItem");

                const readAttributeId = (responseContent.items[0] as ProposeAttributeAcceptResponseItemJSON).attributeId;
                const readAttributeResult = await recipient.consumption.attributes.getAttribute({ id: readAttributeId });
                expect(readAttributeResult).toBeSuccessful();

                const readAttribute = readAttributeResult.value;
                expect(readAttribute.content.owner).toBe(recipient.address);
                expect(readAttribute.content.value["@type"]).toBe("ProprietaryString");
                expect((readAttribute.content.value as ProprietaryStringJSON).value).toBe("A proprietary string");
            });

            test("accepts a ReadAttributeRequestItem given a ReadAttributeRequestItemConfig with all fields set for an IdentityAttributeQuery", async () => {
                const attributeValidFrom = CoreDate.utc().subtract({ days: 1 }).toString();
                const attributeValidTo = CoreDate.utc().add({ days: 1 }).toString();

                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "ReadAttributeRequestItem",
                                "content.item.query.@type": "IdentityAttributeQuery",
                                "content.item.query.validFrom": attributeValidFrom,
                                "content.item.query.validTo": attributeValidTo,
                                "content.item.query.valueType": "GivenName",
                                "content.item.query.tags": ["tag1", "tag2"]
                            },
                            // TODO: this will always create a new Attribute
                            responseConfig: {
                                accept: true,
                                newAttribute: IdentityAttribute.from({
                                    owner: "",
                                    validFrom: attributeValidFrom,
                                    validTo: attributeValidTo,
                                    value: GivenName.from("Given name of recipient").toJSON(),
                                    tags: ["tag1"]
                                })
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "ReadAttributeRequestItem",
                                query: {
                                    "@type": "IdentityAttributeQuery",
                                    validFrom: attributeValidFrom,
                                    validTo: attributeValidTo,
                                    valueType: "GivenName",
                                    tags: ["tag1", "tag3"]
                                },
                                mustBeAccepted: true
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);
                expect(responseContent.items).toHaveLength(1);
                expect(responseContent.items[0]["@type"]).toBe("ReadAttributeAcceptResponseItem");

                const readAttributeId = (responseContent.items[0] as ReadAttributeAcceptResponseItemJSON).attributeId;
                const readAttributeResult = await recipient.consumption.attributes.getAttribute({ id: readAttributeId });
                expect(readAttributeResult).toBeSuccessful();

                const readAttribute = readAttributeResult.value;
                expect(readAttribute.content.owner).toBe(recipient.address);
                expect(readAttribute.content.value["@type"]).toBe("GivenName");
                expect((readAttribute.content.value as GivenNameJSON).value).toBe("Given name of recipient");
            });

            test("accepts a ReadAttributeRequestItem given a ReadAttributeRequestItemConfig with all fields set for a RelationshipAttributeQuery", async () => {
                const attributeValidFrom = CoreDate.utc().subtract({ days: 1 }).toString();
                const attributeValidTo = CoreDate.utc().add({ days: 1 }).toString();

                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "ReadAttributeRequestItem",
                                "content.item.query.@type": "RelationshipAttributeQuery",
                                "content.item.query.validFrom": attributeValidFrom,
                                "content.item.query.validTo": attributeValidTo,
                                "content.item.query.key": "A key",
                                "content.item.query.owner": "",
                                "content.item.query.attributeCreationHints.title": "Title of Attribute",
                                "content.item.query.attributeCreationHints.description": "Description of Attribute",
                                "content.item.query.attributeCreationHints.valueType": "ProprietaryString",
                                "content.item.query.attributeCreationHints.confidentiality": RelationshipAttributeConfidentiality.Public
                            },
                            // TODO: this will always create a new Attribute
                            responseConfig: {
                                accept: true,
                                newAttribute: RelationshipAttribute.from({
                                    owner: CoreAddress.from(""),
                                    value: {
                                        "@type": "ProprietaryString",
                                        value: "A proprietary string",
                                        title: "Title of Attribute",
                                        description: "Description of Attribute",
                                        validFrom: attributeValidFrom,
                                        validTo: attributeValidTo
                                    },
                                    key: "A key",
                                    confidentiality: RelationshipAttributeConfidentiality.Public
                                })
                            }
                        }
                    ]
                };

                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "ReadAttributeRequestItem",
                                query: {
                                    "@type": "RelationshipAttributeQuery",
                                    owner: "",
                                    validFrom: attributeValidFrom,
                                    validTo: attributeValidTo,
                                    key: "A key",
                                    attributeCreationHints: {
                                        valueType: "ProprietaryString",
                                        title: "Title of Attribute",
                                        description: "Description of Attribute",
                                        confidentiality: RelationshipAttributeConfidentiality.Public
                                    }
                                },
                                mustBeAccepted: true
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);
                expect(responseContent.items).toHaveLength(1);
                expect(responseContent.items[0]["@type"]).toBe("ReadAttributeAcceptResponseItem");

                const readAttributeId = (responseContent.items[0] as ReadAttributeAcceptResponseItemJSON).attributeId;
                const readAttributeResult = await recipient.consumption.attributes.getAttribute({ id: readAttributeId });
                expect(readAttributeResult).toBeSuccessful();

                const readAttribute = readAttributeResult.value;
                expect(readAttribute.content.owner).toBe(recipient.address);
                expect(readAttribute.content.value["@type"]).toBe("ProprietaryString");
                expect((readAttribute.content.value as ProprietaryStringJSON).value).toBe("A proprietary string");
            });

            test("accepts a ReadAttributeRequestItem given a ReadAttributeRequestItemConfig with all fields set for an IQLQuery", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "ReadAttributeRequestItem",
                                "content.item.query.@type": "IQLQuery",
                                "content.item.query.queryString": "GivenName || LastName",
                                "content.item.query.attributeCreationHints.valueType": "GivenName",
                                "content.item.query.attributeCreationHints.tags": ["tag1", "tag2"]
                            },
                            // TODO: this will always create a new Attribute
                            responseConfig: {
                                accept: true,
                                newAttribute: IdentityAttribute.from({
                                    owner: "",
                                    value: GivenName.from("Given name of recipient").toJSON(),
                                    tags: ["tag1"]
                                })
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "ReadAttributeRequestItem",
                                query: {
                                    "@type": "IQLQuery",
                                    queryString: "GivenName || LastName",
                                    attributeCreationHints: {
                                        valueType: "GivenName",
                                        tags: ["tag1", "tag3"]
                                    }
                                },
                                mustBeAccepted: true
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);
                expect(responseContent.items).toHaveLength(1);
                expect(responseContent.items[0]["@type"]).toBe("ReadAttributeAcceptResponseItem");

                const readAttributeId = (responseContent.items[0] as ReadAttributeAcceptResponseItemJSON).attributeId;
                const readAttributeResult = await recipient.consumption.attributes.getAttribute({ id: readAttributeId });
                expect(readAttributeResult).toBeSuccessful();

                const readAttribute = readAttributeResult.value;
                expect(readAttribute.content.owner).toBe(recipient.address);
                expect(readAttribute.content.value["@type"]).toBe("GivenName");
                expect((readAttribute.content.value as GivenNameJSON).value).toBe("Given name of recipient");
            });

            test("accepts a RegisterAttributeListenerRequestItem given a RegisterAttributeListenerRequestItemConfig with all fields set for an IdentityAttributeQuery", async () => {
                const attributeValidFrom = CoreDate.utc().subtract({ days: 1 }).toString();
                const attributeValidTo = CoreDate.utc().add({ days: 1 }).toString();

                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "RegisterAttributeListenerRequestItem",
                                "content.item.query.@type": "IdentityAttributeQuery",
                                "content.item.query.validFrom": attributeValidFrom,
                                "content.item.query.validTo": attributeValidTo,
                                "content.item.query.valueType": "GivenName",
                                "content.item.query.tags": ["tag1", "tag2"]
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "RegisterAttributeListenerRequestItem",
                                query: {
                                    "@type": "IdentityAttributeQuery",
                                    validFrom: attributeValidFrom,
                                    validTo: attributeValidTo,
                                    valueType: "GivenName",
                                    tags: ["tag1", "tag3"]
                                },
                                mustBeAccepted: true
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);
                expect(responseContent.items).toHaveLength(1);
                expect(responseContent.items[0]["@type"]).toBe("RegisterAttributeListenerAcceptResponseItem");
                expect((responseContent.items[0] as RegisterAttributeListenerAcceptResponseItemJSON).listenerId).toBeDefined();
            });

            test("accepts a ShareAttributeRequestItem given a ShareAttributeRequestItemConfig with all fields set for an IdentityAttribute", async () => {
                const attributeValidFrom = CoreDate.utc().subtract({ days: 1 }).toString();
                const attributeValidTo = CoreDate.utc().add({ days: 1 }).toString();

                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "ShareAttributeRequestItem",
                                "content.item.attribute.@type": "IdentityAttribute",
                                "content.item.attribute.owner": sender.address,
                                "content.item.attribute.validFrom": attributeValidFrom,
                                "content.item.attribute.validTo": attributeValidTo,
                                "content.item.attribute.tags": ["tag1", "tag2"],
                                "content.item.attribute.value.@type": "IdentityFileReference",
                                "content.item.attribute.value.value": "A link to a file with more than 30 characters"
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "ShareAttributeRequestItem",
                                sourceAttributeId: "sourceAttributeId",
                                attribute: {
                                    "@type": "IdentityAttribute",
                                    owner: sender.address,
                                    validFrom: attributeValidFrom,
                                    validTo: attributeValidTo,
                                    tags: ["tag1", "tag3"],
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
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);
                expect(responseContent.items).toHaveLength(1);
                expect(responseContent.items[0]["@type"]).toBe("ShareAttributeAcceptResponseItem");

                const sharedAttributeId = (responseContent.items[0] as ShareAttributeAcceptResponseItemJSON).attributeId;
                const sharedAttributeResult = await recipient.consumption.attributes.getAttribute({ id: sharedAttributeId });
                expect(sharedAttributeResult).toBeSuccessful();

                const sharedAttribute = sharedAttributeResult.value;
                expect(sharedAttribute.content.owner).toBe(sender.address);
                expect(sharedAttribute.content.value["@type"]).toBe("IdentityFileReference");
                expect((sharedAttribute.content.value as IdentityFileReferenceJSON).value).toBe("A link to a file with more than 30 characters");
            });

            test("accepts a ShareAttributeRequestItem given a ShareAttributeRequestItemConfig with all fields set for a RelationshipAttribute", async () => {
                const attributeValidFrom = CoreDate.utc().subtract({ days: 1 }).toString();
                const attributeValidTo = CoreDate.utc().add({ days: 1 }).toString();

                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "ShareAttributeRequestItem",
                                "content.item.attribute.@type": "RelationshipAttribute",
                                "content.item.attribute.owner": sender.address,
                                "content.item.attribute.validFrom": attributeValidFrom,
                                "content.item.attribute.validTo": attributeValidTo,
                                "content.item.attribute.key": "A key",
                                "content.item.attribute.isTechnical": false,
                                "content.item.attribute.confidentiality": RelationshipAttributeConfidentiality.Public,
                                "content.item.attribute.value.@type": "ProprietaryString",
                                "content.item.attribute.value.value": "A proprietary string",
                                "content.item.attribute.value.title": "An Attribute's title",
                                "content.item.attribute.value.description": "An Attribute's description"
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "ShareAttributeRequestItem",
                                sourceAttributeId: "sourceAttributeId",
                                attribute: {
                                    "@type": "RelationshipAttribute",
                                    owner: sender.address,
                                    validFrom: attributeValidFrom,
                                    validTo: attributeValidTo,
                                    key: "A key",
                                    isTechnical: false,
                                    confidentiality: RelationshipAttributeConfidentiality.Public,
                                    value: {
                                        "@type": "ProprietaryString",
                                        value: "A proprietary string",
                                        title: "An Attribute's title",
                                        description: "An Attribute's description"
                                    }
                                },
                                mustBeAccepted: true
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);
                expect(responseContent.items).toHaveLength(1);
                expect(responseContent.items[0]["@type"]).toBe("ShareAttributeAcceptResponseItem");

                const sharedAttributeId = (responseContent.items[0] as ShareAttributeAcceptResponseItemJSON).attributeId;
                const sharedAttributeResult = await recipient.consumption.attributes.getAttribute({ id: sharedAttributeId });
                expect(sharedAttributeResult).toBeSuccessful();

                const sharedAttribute = sharedAttributeResult.value;
                expect(sharedAttribute.content.owner).toBe(sender.address);
                expect(sharedAttribute.content.value["@type"]).toBe("ProprietaryString");
                expect((sharedAttribute.content.value as ProprietaryStringJSON).value).toBe("A proprietary string");
            });
        });

        describe("RequestConfig with general and RequestItem-specific elements", () => {
            test("decides a Request given a config with general and RequestItem-specific elements", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                peer: sender.address,
                                "content.item.@type": "ConsentRequestItem",
                                "content.item.consent": "A consent text"
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: { "@type": "Request", items: [{ "@type": "ConsentRequestItem", consent: "A consent text", mustBeAccepted: false }] },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );
            });

            test("decides a Request given a config with general elements and multiple RequestItem types", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                peer: sender.address,
                                "content.item.@type": ["AuthenticationRequestItem", "ConsentRequestItem"]
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: { "@type": "Request", items: [{ "@type": "ConsentRequestItem", consent: "A consent text", mustBeAccepted: false }] },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );
            });

            test("cannot decide a Request given a config with fitting general and not fitting RequestItem-specific elements", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                peer: "another Identity",
                                "content.item.@type": "ConsentRequestItem",
                                "content.item.consent": "A consent text"
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: { "@type": "Request", items: [{ "@type": "ConsentRequestItem", consent: "A consent text", mustBeAccepted: false }] },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.ManualRequestDecisionRequired && e.data.message.id === message.id
                );
            });

            test("cannot decide a Request given a config with not fitting general and fitting RequestItem-specific elements", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                peer: sender.address,
                                "content.item.@type": "ConsentRequestItem",
                                "content.item.consent": "Another consent text"
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: { "@type": "Request", items: [{ "@type": "ConsentRequestItem", consent: "A consent text", mustBeAccepted: false }] },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.ManualRequestDecisionRequired && e.data.message.id === message.id
                );
            });
        });

        describe("RequestItemGroups", () => {
            test("decides a RequestItem in a RequestItemGroup given a GeneralRequestConfig", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                peer: sender.address
                            },
                            responseConfig: {
                                accept: false,
                                code: "an.error.code",
                                message: "An error message"
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "RequestItemGroup",
                                items: [
                                    {
                                        "@type": "AuthenticationRequestItem",
                                        mustBeAccepted: false
                                    }
                                ]
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Rejected);

                const itemsOfResponse = responseContent.items;
                expect(itemsOfResponse).toHaveLength(1);
                expect(itemsOfResponse[0]["@type"]).toBe("ResponseItemGroup");
                expect((itemsOfResponse[0] as ResponseItemGroupJSON).items).toHaveLength(1);
                expect((itemsOfResponse[0] as ResponseItemGroupJSON).items[0]["@type"]).toBe("RejectResponseItem");
                expect(((itemsOfResponse[0] as ResponseItemGroupJSON).items[0] as RejectResponseItemJSON).code).toBe("an.error.code");
                expect(((itemsOfResponse[0] as ResponseItemGroupJSON).items[0] as RejectResponseItemJSON).message).toBe("An error message");
            });

            test("decides all RequestItems inside and outside of a RequestItemGroup given a GeneralRequestConfig", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                peer: sender.address
                            },
                            responseConfig: {
                                accept: false,
                                code: "an.error.code",
                                message: "An error message"
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "AuthenticationRequestItem",
                                mustBeAccepted: false
                            },
                            {
                                "@type": "RequestItemGroup",
                                items: [
                                    {
                                        "@type": "AuthenticationRequestItem",
                                        mustBeAccepted: false
                                    },
                                    {
                                        "@type": "AuthenticationRequestItem",
                                        mustBeAccepted: false
                                    }
                                ]
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Rejected);

                const itemsOfResponse = responseContent.items;
                expect(itemsOfResponse).toHaveLength(2);
                expect(itemsOfResponse[0]["@type"]).toBe("RejectResponseItem");
                expect((itemsOfResponse[0] as RejectResponseItemJSON).code).toBe("an.error.code");
                expect((itemsOfResponse[0] as RejectResponseItemJSON).message).toBe("An error message");

                expect(itemsOfResponse[1]["@type"]).toBe("ResponseItemGroup");
                expect((itemsOfResponse[1] as ResponseItemGroupJSON).items).toHaveLength(2);
                expect((itemsOfResponse[1] as ResponseItemGroupJSON).items[0]["@type"]).toBe("RejectResponseItem");
                expect((itemsOfResponse[1] as ResponseItemGroupJSON).items[1]["@type"]).toBe("RejectResponseItem");
            });

            test("decides a RequestItem in a RequestItemGroup given a RequestItemConfig", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "AuthenticationRequestItem"
                            },
                            responseConfig: {
                                accept: false,
                                code: "an.error.code",
                                message: "An error message"
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "RequestItemGroup",
                                items: [
                                    {
                                        "@type": "AuthenticationRequestItem",
                                        mustBeAccepted: false
                                    }
                                ]
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Rejected);

                const itemsOfResponse = responseContent.items;
                expect(itemsOfResponse).toHaveLength(1);
                expect(itemsOfResponse[0]["@type"]).toBe("ResponseItemGroup");
                expect((itemsOfResponse[0] as ResponseItemGroupJSON).items).toHaveLength(1);
                expect((itemsOfResponse[0] as ResponseItemGroupJSON).items[0]["@type"]).toBe("RejectResponseItem");
                expect(((itemsOfResponse[0] as ResponseItemGroupJSON).items[0] as RejectResponseItemJSON).code).toBe("an.error.code");
                expect(((itemsOfResponse[0] as ResponseItemGroupJSON).items[0] as RejectResponseItemJSON).message).toBe("An error message");
            });

            test("decides all RequestItems inside and outside of a RequestItemGroup given a RequestItemConfig", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "AuthenticationRequestItem"
                            },
                            responseConfig: {
                                accept: false,
                                code: "an.error.code",
                                message: "An error message"
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "AuthenticationRequestItem",
                                mustBeAccepted: false
                            },
                            {
                                "@type": "RequestItemGroup",
                                items: [
                                    {
                                        "@type": "AuthenticationRequestItem",
                                        mustBeAccepted: false
                                    },
                                    {
                                        "@type": "AuthenticationRequestItem",
                                        mustBeAccepted: false
                                    }
                                ]
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Rejected);

                const itemsOfResponse = responseContent.items;
                expect(itemsOfResponse).toHaveLength(2);
                expect(itemsOfResponse[0]["@type"]).toBe("RejectResponseItem");
                expect((itemsOfResponse[0] as RejectResponseItemJSON).code).toBe("an.error.code");
                expect((itemsOfResponse[0] as RejectResponseItemJSON).message).toBe("An error message");

                expect(itemsOfResponse[1]["@type"]).toBe("ResponseItemGroup");
                expect((itemsOfResponse[1] as ResponseItemGroupJSON).items).toHaveLength(2);
                expect((itemsOfResponse[1] as ResponseItemGroupJSON).items[0]["@type"]).toBe("RejectResponseItem");
                expect((itemsOfResponse[1] as ResponseItemGroupJSON).items[1]["@type"]).toBe("RejectResponseItem");
            });
        });

        describe("automationConfig with multiple elements", () => {
            test("decides a Request given an individual RequestItemConfig for every RequestItem", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "AuthenticationRequestItem"
                            },
                            responseConfig: {
                                accept: true
                            }
                        },
                        {
                            requestConfig: {
                                "content.item.@type": "ConsentRequestItem"
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "AuthenticationRequestItem",
                                mustBeAccepted: false
                            },
                            {
                                "@type": "ConsentRequestItem",
                                mustBeAccepted: false,
                                consent: "A consent text"
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);

                const responseItems = responseContent.items;
                expect(responseItems).toHaveLength(2);
                expect(responseItems[0]["@type"]).toBe("AcceptResponseItem");
                expect(responseItems[1]["@type"]).toBe("AcceptResponseItem");
            });

            test("decides a Request with RequestItemGroup given an individual RequestItemConfig for every RequestItem", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "AuthenticationRequestItem"
                            },
                            responseConfig: {
                                accept: true
                            }
                        },
                        {
                            requestConfig: {
                                "content.item.@type": "ConsentRequestItem"
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "AuthenticationRequestItem",
                                mustBeAccepted: false
                            },
                            {
                                "@type": "RequestItemGroup",
                                items: [
                                    {
                                        "@type": "ConsentRequestItem",
                                        mustBeAccepted: false,
                                        consent: "A consent text"
                                    }
                                ]
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);

                const responseItems = responseContent.items;
                expect(responseItems).toHaveLength(2);
                expect(responseItems[0]["@type"]).toBe("AcceptResponseItem");
                expect(responseItems[1]["@type"]).toBe("ResponseItemGroup");
                expect((responseItems[1] as ResponseItemGroupJSON).items).toHaveLength(1);
                expect((responseItems[1] as ResponseItemGroupJSON).items[0]["@type"]).toBe("AcceptResponseItem");
            });

            test("decides a Request with the first fitting RequestItemConfig given multiple fitting RequestItemConfigs", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "AuthenticationRequestItem"
                            },
                            responseConfig: {
                                accept: true
                            }
                        },
                        {
                            requestConfig: {
                                "content.item.@type": "AuthenticationRequestItem"
                            },
                            responseConfig: {
                                accept: false
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "AuthenticationRequestItem",
                                mustBeAccepted: false
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Accepted);
            });

            test("decides a Request with the first fitting GeneralRequestConfig given fitting RequestItemConfigs that haven't decided all RequestItems before", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "AuthenticationRequestItem"
                            },
                            responseConfig: {
                                accept: true
                            }
                        },
                        {
                            requestConfig: {
                                peer: sender.address
                            },
                            responseConfig: {
                                accept: false
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "AuthenticationRequestItem",
                                mustBeAccepted: false
                            },
                            {
                                "@type": "ConsentRequestItem",
                                mustBeAccepted: false,
                                consent: "A consent text"
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.RequestAutomaticallyDecided && e.data.message.id === message.id
                );

                const requestAfterAction = (await recipient.consumption.incomingRequests.getRequest({ id: receivedRequestResult.value.id })).value;
                expect(requestAfterAction.status).toStrictEqual(LocalRequestStatus.Decided);
                expect(requestAfterAction.response).toBeDefined();

                const responseContent = requestAfterAction.response!.content;
                expect(responseContent.result).toBe(ResponseResult.Rejected);
            });

            test("cannot decide a Request if there is no fitting RequestItemConfig for every RequestItem", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "AuthenticationRequestItem"
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "AuthenticationRequestItem",
                                mustBeAccepted: false
                            },
                            {
                                "@type": "ConsentRequestItem",
                                mustBeAccepted: false,
                                consent: "A consent text"
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.ManualRequestDecisionRequired && e.data.message.id === message.id
                );
            });

            test("cannot decide a Request with RequestItemGroup if there is no fitting RequestItemConfig for every RequestItem", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "AuthenticationRequestItem"
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "AuthenticationRequestItem",
                                mustBeAccepted: false
                            },
                            {
                                "@type": "RequestItemGroup",
                                items: [
                                    {
                                        "@type": "ConsentRequestItem",
                                        mustBeAccepted: false,
                                        consent: "A consent text"
                                    }
                                ]
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.ManualRequestDecisionRequired && e.data.message.id === message.id
                );
            });

            test("cannot decide a Request if a mustBeAccepted RequestItem is not accepted", async () => {
                const deciderConfig: DeciderModuleConfigurationOverwrite = {
                    automationConfig: [
                        {
                            requestConfig: {
                                "content.item.@type": "AuthenticationRequestItem"
                            },
                            responseConfig: {
                                accept: false
                            }
                        },
                        {
                            requestConfig: {
                                "content.item.@type": "ConsentRequestItem"
                            },
                            responseConfig: {
                                accept: true
                            }
                        }
                    ]
                };
                const recipient = (await runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }))[0];
                await establishRelationship(sender.transport, recipient.transport);

                const message = await exchangeMessage(sender.transport, recipient.transport);
                const receivedRequestResult = await recipient.consumption.incomingRequests.received({
                    receivedRequest: {
                        "@type": "Request",
                        items: [
                            {
                                "@type": "AuthenticationRequestItem",
                                mustBeAccepted: true
                            },
                            {
                                "@type": "ConsentRequestItem",
                                mustBeAccepted: true,
                                consent: "A consent text"
                            }
                        ]
                    },
                    requestSourceId: message.id
                });
                await recipient.consumption.incomingRequests.checkPrerequisites({ requestId: receivedRequestResult.value.id });

                await expect(recipient.eventBus).toHavePublished(
                    MessageProcessedEvent,
                    (e) => e.data.result === MessageProcessedResult.ManualRequestDecisionRequired && e.data.message.id === message.id
                );
            });
        });

        test("should throw an error if the automationConfig is invalid", async () => {
            const deciderConfig: DeciderModuleConfigurationOverwrite = {
                automationConfig: [
                    {
                        requestConfig: {
                            "content.item.@type": "FreeTextRequestItem"
                        },
                        responseConfig: {
                            accept: true,
                            deletionDate: CoreDate.utc().add({ days: 1 }).toString()
                        }
                    }
                ]
            };
            await expectThrowsAsync(
                runtimeServiceProvider.launch(1, { enableDeciderModule: true, configureDeciderModule: deciderConfig }),
                "The RequestConfig does not match the ResponseConfig."
            );
        });
    });
});
