import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import {
    GivenName,
    IdentityAttribute,
    IIdentityAttribute,
    IRelationshipAttribute,
    ProprietaryString,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    Request,
    ResponseItemResult,
    ShareAttributeAcceptResponseItem,
    ShareAttributeRequestItem,
    Surname
} from "@nmshd/content";
import { AccountController, CoreAddress, CoreDate, CoreId, Transport } from "@nmshd/transport";
import { ConsumptionController, ConsumptionIds, DeletionStatus, LocalAttribute, LocalRequest, LocalRequestStatus, ShareAttributeRequestItemProcessor } from "../../../../../src";
import { TestUtil } from "../../../../core/TestUtil";
import { TestObjectFactory } from "../../testHelpers/TestObjectFactory";

describe("ShareAttributeRequestItemProcessor", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let consumptionController: ConsumptionController;
    let testAccount: AccountController;

    let processor: ShareAttributeRequestItemProcessor;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const account = (await TestUtil.provideAccounts(transport, 1))[0];
        ({ accountController: testAccount, consumptionController } = account);
    });

    afterAll(async function () {
        await connection.close();
    });

    beforeEach(function () {
        processor = new ShareAttributeRequestItemProcessor(consumptionController);
    });

    describe("canCreateOutgoingRequestItem", function () {
        test.each([
            {
                scenario: "an Identity Attribute with owner=sender",
                result: "success",
                attribute: IdentityAttribute.from({
                    value: GivenName.fromAny({ value: "AGivenName" }),
                    owner: CoreAddress.from("Sender")
                })
            },
            {
                scenario: "an Identity Attribute with owner=<empty string>",
                result: "success",
                attribute: IdentityAttribute.from({
                    value: GivenName.fromAny({ value: "AGivenName" }),
                    owner: CoreAddress.from("")
                })
            },
            {
                scenario: "an Identity Attribute with owner=someOtherOwner",
                result: "error",
                expectedError: {
                    code: "error.consumption.requests.invalidRequestItem",
                    message: "The provided IdentityAttribute belongs to someone else. You can only share own IdentityAttributes."
                },
                attribute: IdentityAttribute.from({
                    value: GivenName.fromAny({ value: "AGivenName" }),
                    owner: CoreAddress.from("someOtherOwner")
                })
            },
            {
                scenario: "a Relationship Attribute with owner=sender",
                result: "success",
                attribute: RelationshipAttribute.from({
                    value: ProprietaryString.fromAny({ value: "AGivenName", title: "ATitle" }),
                    owner: CoreAddress.from("Sender"),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "AKey"
                })
            },
            {
                scenario: "a Relationship Attribute with owner=<empty string>",
                result: "success",
                attribute: RelationshipAttribute.from({
                    value: ProprietaryString.fromAny({ value: "AGivenName", title: "ATitle" }),
                    owner: CoreAddress.from("Sender"),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "AKey"
                })
            },
            {
                scenario: "a Relationship Attribute with owner=someOtherOwner",
                result: "success",
                attribute: RelationshipAttribute.from({
                    value: ProprietaryString.fromAny({ value: "AGivenName", title: "ATitle" }),
                    owner: CoreAddress.from("Sender"),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "AKey"
                })
            },
            {
                scenario: "a Relationship Attribute with confidentiality=private",
                result: "error",
                attribute: RelationshipAttribute.from({
                    value: ProprietaryString.fromAny({ value: "AGivenName", title: "ATitle" }),
                    owner: CoreAddress.from("Sender"),
                    confidentiality: RelationshipAttributeConfidentiality.Private,
                    key: "AKey"
                }),
                expectedError: {
                    code: "error.consumption.requests.invalidRequestItem",
                    message: "The confidentiality of the given `attribute` is private. Therefore you are not allowed to share it."
                }
            },
            {
                scenario: "a Relationship Attribute with owner=recipient",
                result: "error",
                attribute: RelationshipAttribute.from({
                    value: ProprietaryString.fromAny({ value: "AGivenName", title: "ATitle" }),
                    owner: CoreAddress.from("Recipient"),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "AKey"
                }),
                expectedError: {
                    code: "error.consumption.requests.invalidRequestItem",
                    message: "It doesn't make sense to share a RelationshipAttribute with its owner."
                }
            }
        ])("returns ${value.result} when passing ${value.scenario}", async function (testParams) {
            const sender = testAccount.identity.address;
            const recipient = CoreAddress.from("Recipient");
            const aThirdParty = CoreAddress.from("AThirdParty");

            if (testParams.attribute.owner.address === "Sender") {
                testParams.attribute.owner = sender;
            }

            if (testParams.attribute.owner.address === "Recipient") {
                testParams.attribute.owner = recipient;
            }

            let sourceAttribute;

            if (testParams.attribute instanceof IdentityAttribute) {
                sourceAttribute = await consumptionController.attributes.createAttributeUnsafe({
                    content: {
                        ...testParams.attribute.toJSON(),
                        owner: testParams.attribute.owner.equals("") ? sender : testParams.attribute.owner
                    } as IIdentityAttribute
                });
            } else {
                sourceAttribute = await consumptionController.attributes.createSharedLocalAttribute({
                    content: {
                        ...testParams.attribute.toJSON(),
                        owner: testParams.attribute.owner.equals("") ? sender : testParams.attribute.owner
                    } as IRelationshipAttribute,
                    peer: aThirdParty,
                    requestReference: await ConsumptionIds.request.generate()
                });
            }

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: sourceAttribute.content,
                sourceAttributeId: sourceAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            if (testParams.result === "success") {
                // eslint-disable-next-line jest/no-conditional-expect
                expect(result).successfulValidationResult();
            } else {
                // eslint-disable-next-line jest/no-conditional-expect
                expect(result).errorValidationResult(testParams.expectedError);
            }
        });

        test("returns error when the attribute doesn't exists", async function () {
            const sender = testAccount.identity.address;
            const recipient = CoreAddress.from("Recipient");

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: IdentityAttribute.from({
                    value: GivenName.fromAny({ value: "AGivenName" }),
                    owner: sender
                }),
                sourceAttributeId: CoreId.from("anIdThatDoesntExist")
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: "The Attribute with the given sourceAttributeId 'anIdThatDoesntExist' could not be found."
            });
        });

        test("returns error when the attribute content is not equal to the content persisted in the attribute collection", async function () {
            const sender = testAccount.identity.address;
            const recipient = CoreAddress.from("Recipient");

            const attribute = IdentityAttribute.from({
                value: GivenName.fromAny({ value: "AGivenName" }),
                owner: sender
            });

            const sourceAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: attribute
            });
            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: IdentityAttribute.from({
                    ...sourceAttribute.content.toJSON(),
                    value: Surname.from("ASurname").toJSON()
                }),
                sourceAttributeId: sourceAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The Attribute with the given sourceAttributeId '${sourceAttribute.id.toString()}' does not match the given Attribute.`
            });
        });

        test("returns error when the IdentityAttribute is a shared copy of a RepositoryAttribute", async function () {
            const sender = testAccount.identity.address;
            const recipient = CoreAddress.from("Recipient");
            const aThirdParty = CoreAddress.from("AThirdParty");

            const localAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({
                        value: "AGivenName"
                    })
                }),
                shareInfo: {
                    peer: aThirdParty,
                    requestReference: await ConsumptionIds.request.generate(),
                    sourceAttribute: CoreId.from("sourceAttributeId")
                }
            });
            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: localAttribute.content,
                sourceAttributeId: localAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: "The provided IdentityAttribute is a shared copy of a RepositoryAttribute. You can only share RepositoryAttributes."
            });
        });

        test("returns error when the IdentityAttribute is already shared with the peer", async function () {
            const sender = testAccount.identity.address;
            const recipient = CoreAddress.from("Recipient");

            const localAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({
                        value: "AGivenName"
                    })
                })
            });

            const localAttributeCopy = await consumptionController.attributes.createSharedLocalAttributeCopy({
                peer: recipient,
                requestReference: await ConsumptionIds.request.generate(),
                sourceAttributeId: localAttribute.id
            });
            expect(localAttributeCopy.isShared()).toBe(true);

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: localAttribute.content,
                sourceAttributeId: localAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The IdentityAttribute with the given sourceAttributeId '${requestItem.sourceAttributeId.toString()}' has already been shared with the peer.`
            });
        });

        test("returns success when the IdentityAttribute is already shared with the peer but DeletedByPeer", async function () {
            const sender = testAccount.identity.address;
            const recipient = CoreAddress.from("Recipient");

            const localAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({
                        value: "AGivenName"
                    })
                })
            });

            const localAttributeCopy = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({
                        value: "AGivenName"
                    })
                }),
                shareInfo: {
                    peer: recipient,
                    requestReference: await ConsumptionIds.request.generate(),
                    sourceAttribute: localAttribute.id
                },
                deletionInfo: {
                    deletionStatus: DeletionStatus.DeletedByPeer,
                    deletionDate: CoreDate.utc().subtract({ days: 1 })
                }
            });
            expect(localAttributeCopy.isShared()).toBe(true);

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: localAttribute.content,
                sourceAttributeId: localAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).successfulValidationResult();
        });

        test("returns success when the IdentityAttribute is already shared with the peer but ToBeDeletedByPeer", async function () {
            const sender = testAccount.identity.address;
            const recipient = CoreAddress.from("Recipient");

            const localAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({
                        value: "AGivenName"
                    })
                })
            });

            const localAttributeCopy = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({
                        value: "AGivenName"
                    })
                }),
                shareInfo: {
                    peer: recipient,
                    requestReference: await ConsumptionIds.request.generate(),
                    sourceAttribute: localAttribute.id
                },
                deletionInfo: {
                    deletionStatus: DeletionStatus.ToBeDeletedByPeer,
                    deletionDate: CoreDate.utc().add({ days: 1 })
                }
            });
            expect(localAttributeCopy.isShared()).toBe(true);

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: localAttribute.content,
                sourceAttributeId: localAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).successfulValidationResult();
        });

        test("returns an error when a successor of the existing IdentityAttribute is already shared with the peer", async function () {
            const sender = testAccount.identity.address;
            const recipient = CoreAddress.from("Recipient");

            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: sender
                })
            });

            const { successor: successorOfRepositoryAttribute } = await consumptionController.attributes.succeedRepositoryAttribute(repositoryAttribute.id, {
                content: {
                    "@type": "IdentityAttribute",
                    owner: sender.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "AnotherGivenName"
                    }
                }
            });

            const ownSharedCopyOfSuccessor = await consumptionController.attributes.createSharedLocalAttributeCopy({
                sourceAttributeId: successorOfRepositoryAttribute.id,
                peer: recipient,
                requestReference: await ConsumptionIds.request.generate()
            });

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attribute: repositoryAttribute.content,
                sourceAttributeId: repositoryAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The provided IdentityAttribute is outdated. You have already shared the successor '${ownSharedCopyOfSuccessor.shareInfo?.sourceAttribute?.toString()}' of it.`
            });
        });

        test("returns success when a successor of the existing IdentityAttribute is already shared with the peer but DeletedByPeer", async function () {
            const sender = testAccount.identity.address;
            const recipient = CoreAddress.from("Recipient");

            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: sender
                })
            });

            const { successor: successorOfRepositoryAttribute } = await consumptionController.attributes.succeedRepositoryAttribute(repositoryAttribute.id, {
                content: {
                    "@type": "IdentityAttribute",
                    owner: sender.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "AnotherGivenName"
                    }
                }
            });

            await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({
                        value: "AGivenName"
                    })
                }),
                shareInfo: {
                    peer: recipient,
                    requestReference: await ConsumptionIds.request.generate(),
                    sourceAttribute: successorOfRepositoryAttribute.id
                },
                deletionInfo: {
                    deletionStatus: DeletionStatus.DeletedByPeer,
                    deletionDate: CoreDate.utc().subtract({ days: 1 })
                }
            });

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attribute: repositoryAttribute.content,
                sourceAttributeId: repositoryAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).successfulValidationResult();
        });

        test("returns success when a successor of the existing IdentityAttribute is already shared with the peer but ToBeDeletedByPeer", async function () {
            const sender = testAccount.identity.address;
            const recipient = CoreAddress.from("Recipient");

            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: sender
                })
            });

            const { successor: successorOfRepositoryAttribute } = await consumptionController.attributes.succeedRepositoryAttribute(repositoryAttribute.id, {
                content: {
                    "@type": "IdentityAttribute",
                    owner: sender.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "AnotherGivenName"
                    }
                }
            });

            await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({
                        value: "AGivenName"
                    })
                }),
                shareInfo: {
                    peer: recipient,
                    requestReference: await ConsumptionIds.request.generate(),
                    sourceAttribute: successorOfRepositoryAttribute.id
                },
                deletionInfo: {
                    deletionStatus: DeletionStatus.ToBeDeletedByPeer,
                    deletionDate: CoreDate.utc().add({ days: 1 })
                }
            });

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attribute: repositoryAttribute.content,
                sourceAttributeId: repositoryAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).successfulValidationResult();
        });

        test("returns an error when a predecessor of the existing IdentityAttribute is already shared and therefore the user should notify about the Attribute succession instead of share it.", async function () {
            const sender = testAccount.identity.address;
            const recipient = CoreAddress.from("Recipient");

            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: sender
                })
            });

            const ownSharedCopyOfPredecessor = await consumptionController.attributes.createSharedLocalAttributeCopy({
                sourceAttributeId: repositoryAttribute.id,
                peer: recipient,
                requestReference: await ConsumptionIds.request.generate()
            });

            expect(ownSharedCopyOfPredecessor.isShared()).toBe(true);

            const { successor: successorOfRepositoryAttribute } = await consumptionController.attributes.succeedRepositoryAttribute(repositoryAttribute.id, {
                content: {
                    "@type": "IdentityAttribute",
                    owner: sender.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "AnotherGivenName"
                    }
                }
            });

            expect(successorOfRepositoryAttribute.isShared()).toBe(false);

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attribute: successorOfRepositoryAttribute.content,
                sourceAttributeId: successorOfRepositoryAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `You have already shared the predecessor '${ownSharedCopyOfPredecessor.shareInfo?.sourceAttribute?.toString()}' of the IdentityAttribute. Instead of sharing it, you should notify the peer about the Attribute succession.`
            });
        });

        test("returns success when a predecessor of the existing IdentityAttribute is already shared with the peer but DeletedByPeer", async function () {
            const sender = testAccount.identity.address;
            const recipient = CoreAddress.from("Recipient");

            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: sender
                })
            });

            const { successor: successorOfRepositoryAttribute } = await consumptionController.attributes.succeedRepositoryAttribute(repositoryAttribute.id, {
                content: {
                    "@type": "IdentityAttribute",
                    owner: sender.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "AnotherGivenName"
                    }
                }
            });

            await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({
                        value: "AGivenName"
                    })
                }),
                shareInfo: {
                    peer: recipient,
                    requestReference: await ConsumptionIds.request.generate(),
                    sourceAttribute: repositoryAttribute.id
                },
                deletionInfo: {
                    deletionStatus: DeletionStatus.DeletedByPeer,
                    deletionDate: CoreDate.utc().subtract({ days: 1 })
                }
            });

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attribute: successorOfRepositoryAttribute.content,
                sourceAttributeId: successorOfRepositoryAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).successfulValidationResult();
        });

        test("returns success when a predecessor of the existing IdentityAttribute is already shared with the peer but ToBeDeletedByPeer", async function () {
            const sender = testAccount.identity.address;
            const recipient = CoreAddress.from("Recipient");

            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: sender
                })
            });

            const { successor: successorOfRepositoryAttribute } = await consumptionController.attributes.succeedRepositoryAttribute(repositoryAttribute.id, {
                content: {
                    "@type": "IdentityAttribute",
                    owner: sender.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "AnotherGivenName"
                    }
                }
            });

            await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({
                        value: "AGivenName"
                    })
                }),
                shareInfo: {
                    peer: recipient,
                    requestReference: await ConsumptionIds.request.generate(),
                    sourceAttribute: repositoryAttribute.id
                },
                deletionInfo: {
                    deletionStatus: DeletionStatus.ToBeDeletedByPeer,
                    deletionDate: CoreDate.utc().add({ days: 1 })
                }
            });

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attribute: successorOfRepositoryAttribute.content,
                sourceAttributeId: successorOfRepositoryAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).successfulValidationResult();
        });

        test("returns error when the RelationshipAttribute is a copy of another RelationshipAttribute", async function () {
            const sender = testAccount.identity.address;
            const recipient = CoreAddress.from("Recipient");
            const aThirdParty = CoreAddress.from("AThirdParty");

            const relationshipAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: RelationshipAttribute.from({
                    owner: sender,
                    value: ProprietaryString.fromAny({ value: "AGivenName", title: "ATitle" }),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "AKey"
                }),
                shareInfo: {
                    peer: aThirdParty,
                    requestReference: await ConsumptionIds.request.generate(),
                    sourceAttribute: CoreId.from("sourceAttributeId")
                }
            });
            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: relationshipAttribute.content,
                sourceAttributeId: relationshipAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: "You can only share RelationshipAttributes that are not a copy of a sourceAttribute."
            });
        });

        test("returns error when the RelationshipAttribute exists in the context of the Relationship with the peer", async function () {
            const sender = testAccount.identity.address;
            const recipient = CoreAddress.from("Recipient");

            const relationshipAttribute = await consumptionController.attributes.createSharedLocalAttribute({
                content: RelationshipAttribute.from({
                    owner: sender,
                    value: ProprietaryString.fromAny({ value: "AGivenName", title: "ATitle" }),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "AKey"
                }),
                peer: recipient,
                requestReference: await ConsumptionIds.request.generate()
            });
            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: relationshipAttribute.content,
                sourceAttributeId: relationshipAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: "The provided RelationshipAttribute already exists in the context of the Relationship with the peer."
            });
        });
    });

    describe("accept", function () {
        test("in case of an IdentityAttribute with 'owner=<empty>', creates a Local Attribute for the Sender of the Request", async function () {
            const sender = CoreAddress.from("Sender");

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                sourceAttributeId: CoreId.from("aSourceAttributeId"),
                attribute: TestObjectFactory.createIdentityAttribute({
                    owner: CoreAddress.from("")
                })
            });
            const incomingRequest = LocalRequest.from({
                id: await ConsumptionIds.request.generate(),
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    items: [requestItem]
                }),
                statusLog: []
            });
            const result = await processor.accept(
                requestItem,
                {
                    accept: true
                },
                incomingRequest
            );
            const createdAttribute = await consumptionController.attributes.getLocalAttribute(result.attributeId);
            expect(createdAttribute).toBeDefined();
            expect(createdAttribute!.shareInfo).toBeDefined();
            expect(createdAttribute!.shareInfo!.peer.toString()).toStrictEqual(sender.toString());
            expect(createdAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
            expect(createdAttribute!.content.owner.toString()).toStrictEqual(sender.toString());
        });

        test("in case of a RelationshipAttribute with 'owner=<empty>', creates a Local Attribute for the Sender of the Request", async function () {
            const sender = CoreAddress.from("Sender");

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                sourceAttributeId: CoreId.from("aSourceAttributeId"),
                attribute: TestObjectFactory.createRelationshipAttribute({
                    owner: CoreAddress.from("")
                })
            });
            const incomingRequest = LocalRequest.from({
                id: await ConsumptionIds.request.generate(),
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    items: [requestItem]
                }),
                statusLog: []
            });
            const result = await processor.accept(
                requestItem,
                {
                    accept: true
                },
                incomingRequest
            );
            const createdAttribute = await consumptionController.attributes.getLocalAttribute(result.attributeId);
            expect(createdAttribute).toBeDefined();
            expect(createdAttribute!.shareInfo).toBeDefined();
            expect(createdAttribute!.shareInfo!.peer.toString()).toStrictEqual(sender.toString());
            expect(createdAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
            expect(createdAttribute!.content.owner.toString()).toStrictEqual(sender.toString());
        });
    });

    describe("applyIncomingResponseItem", function () {
        test.each([
            {
                attributeType: "IdentityAttribute",
                attributeOwner: ""
            },
            {
                attributeType: "IdentityAttribute",
                attributeOwner: "Sender"
            },
            {
                attributeType: "RelationshipAttribute",
                attributeOwner: ""
            },
            {
                attributeType: "RelationshipAttribute",
                attributeOwner: "Sender"
            }
        ])(
            "in case of a ${value.attributeType}, creates a LocalAttribute with the Attribute from the RequestItem and the attributeId from the ResponseItem for the peer of the Request",

            async function (testParams) {
                const sourceAttributeContent =
                    testParams.attributeType === "IdentityAttribute"
                        ? TestObjectFactory.createIdentityAttribute({ owner: testAccount.identity.address })
                        : TestObjectFactory.createRelationshipAttribute({ owner: testAccount.identity.address });

                const sourceAttribute = await consumptionController.attributes.createAttributeUnsafe({
                    content: sourceAttributeContent
                });

                testParams.attributeOwner = testParams.attributeOwner.replace("Sender", testAccount.identity.address.toString());

                sourceAttribute.content.owner = CoreAddress.from(testParams.attributeOwner);

                const { localRequest, requestItem } = await createLocalRequest({ sourceAttribute });

                const responseItem = ShareAttributeAcceptResponseItem.from({
                    result: ResponseItemResult.Accepted,
                    attributeId: await ConsumptionIds.attribute.generate()
                });
                await processor.applyIncomingResponseItem(responseItem, requestItem, localRequest);
                const createdAttribute = await consumptionController.attributes.getLocalAttribute(responseItem.attributeId);
                expect(createdAttribute).toBeDefined();
                expect(createdAttribute!.id.toString()).toBe(responseItem.attributeId.toString());
                expect(createdAttribute!.shareInfo).toBeDefined();
                expect(createdAttribute!.shareInfo!.peer.toString()).toStrictEqual(localRequest.peer.toString());
                expect(createdAttribute!.shareInfo!.sourceAttribute?.toString()).toStrictEqual(sourceAttribute.id.toString());
                expect(createdAttribute!.content.owner.toString()).toStrictEqual(testAccount.identity.address.toString());
            }
        );
    });

    async function createLocalRequest({ sourceAttribute }: { sourceAttribute: LocalAttribute }): Promise<{ localRequest: LocalRequest; requestItem: ShareAttributeRequestItem }> {
        const requestItem = ShareAttributeRequestItem.from({
            mustBeAccepted: true,
            attribute: sourceAttribute.content,
            sourceAttributeId: sourceAttribute.id
        });
        const requestId = await ConsumptionIds.request.generate();
        const peer = CoreAddress.from("did:e:a-domain:dids:anidentity");
        const localRequest = LocalRequest.from({
            id: requestId,
            createdAt: CoreDate.utc(),
            isOwn: true,
            peer: peer,
            status: LocalRequestStatus.Open,
            content: Request.from({
                id: requestId,
                items: [requestItem]
            }),
            statusLog: []
        });

        return { localRequest, requestItem };
    }
});
