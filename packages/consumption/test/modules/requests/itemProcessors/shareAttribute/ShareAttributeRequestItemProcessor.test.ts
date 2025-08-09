import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import {
    AttributeAlreadySharedAcceptResponseItem,
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
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import { anything, reset, spy, when } from "ts-mockito";
import {
    ConsumptionController,
    ConsumptionIds,
    LocalAttribute,
    LocalAttributeDeletionStatus,
    LocalAttributeShareInfo,
    LocalRequest,
    LocalRequestStatus,
    ShareAttributeRequestItemProcessor,
    ValidationResult
} from "../../../../../src";
import { TestUtil } from "../../../../core/TestUtil";
import { TestObjectFactory } from "../../testHelpers/TestObjectFactory";

describe("ShareAttributeRequestItemProcessor", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let consumptionController: ConsumptionController;
    let testAccount: AccountController;

    let processor: ShareAttributeRequestItemProcessor;

    let thirdPartyConsumptionController: ConsumptionController;
    let thirdPartyTestAccount: AccountController;
    let aThirdParty: CoreAddress;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport();
        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 2);
        ({ accountController: testAccount, consumptionController } = accounts[0]);

        ({ accountController: thirdPartyTestAccount, consumptionController: thirdPartyConsumptionController } = accounts[1]);
        aThirdParty = thirdPartyTestAccount.identity.address;

        await TestUtil.ensureActiveRelationship(testAccount, thirdPartyTestAccount);

        processor = new ShareAttributeRequestItemProcessor(consumptionController);
    });

    beforeEach(async () => await TestUtil.cleanupAttributes(consumptionController));

    afterAll(async () => await connection.close());

    describe("canCreateOutgoingRequestItem", function () {
        const recipient = CoreAddress.from("Recipient");
        let sender: CoreAddress;

        beforeAll(function () {
            sender = testAccount.identity.address;
        });

        test.each([
            {
                scenario: "an Identity Attribute with owner=sender",
                result: "success",
                attribute: IdentityAttribute.from({
                    value: GivenName.fromAny({ value: "aGivenName" }),
                    owner: CoreAddress.from("Sender")
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
                    value: GivenName.fromAny({ value: "aGivenName" }),
                    owner: CoreAddress.from("someOtherOwner")
                })
            },
            {
                scenario: "an Identity Attribute with invalid tag",
                result: "error",
                expectedError: {
                    code: "error.consumption.requests.invalidRequestItem",
                    message: "Detected invalidity of the following tags: 'invalidTag'."
                },
                attribute: IdentityAttribute.from({
                    value: GivenName.fromAny({ value: "aGivenName" }),
                    owner: CoreAddress.from("Sender"),
                    tags: ["invalidTag"]
                })
            },
            {
                scenario: "a Relationship Attribute with owner=sender",
                result: "success",
                attribute: RelationshipAttribute.from({
                    value: ProprietaryString.fromAny({ value: "aGivenName", title: "aTitle" }),
                    owner: CoreAddress.from("Sender"),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "aKey"
                })
            },
            {
                scenario: "a Relationship Attribute with owner=someOtherOwner",
                result: "success",
                attribute: RelationshipAttribute.from({
                    value: ProprietaryString.fromAny({ value: "aGivenName", title: "aTitle" }),
                    owner: CoreAddress.from("Sender"),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "aKey"
                })
            },
            {
                scenario: "a Relationship Attribute with confidentiality=private",
                result: "error",
                attribute: RelationshipAttribute.from({
                    value: ProprietaryString.fromAny({ value: "aGivenName", title: "aTitle" }),
                    owner: CoreAddress.from("Sender"),
                    confidentiality: RelationshipAttributeConfidentiality.Private,
                    key: "aKey"
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
                    value: ProprietaryString.fromAny({ value: "aGivenName", title: "aTitle" }),
                    owner: CoreAddress.from("Recipient"),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "aKey"
                }),
                expectedError: {
                    code: "error.consumption.requests.invalidRequestItem",
                    message: "It doesn't make sense to share a RelationshipAttribute with its owner."
                }
            }
        ])("returns $result when passing $scenario", async function (testParams) {
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
                    sourceReference: await ConsumptionIds.request.generate()
                });
            }

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: sourceAttribute.content,
                sourceAttributeId: sourceAttribute.id,
                thirdPartyAddress: !(testParams.attribute instanceof IdentityAttribute) ? aThirdParty : undefined
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            if (testParams.result === "success") {
                expect(result).successfulValidationResult();
            } else {
                expect(result).errorValidationResult(testParams.expectedError);
            }
        });

        test("returns error when the attribute doesn't exists", async function () {
            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: IdentityAttribute.from({
                    value: GivenName.fromAny({ value: "aGivenName" }),
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
            const attribute = IdentityAttribute.from({
                value: GivenName.fromAny({ value: "aGivenName" }),
                owner: sender
            });

            const sourceAttribute = await consumptionController.attributes.createRepositoryAttribute({ content: attribute });
            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: IdentityAttribute.from({
                    ...sourceAttribute.content.toJSON(),
                    value: Surname.from("aSurname").toJSON()
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

        test("returns error when an empty string is specified for the owner of the IdentityAttribute instead of the explicit address", async function () {
            const sourceAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({ value: "aGivenName" })
                })
            });

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: IdentityAttribute.from({
                    owner: CoreAddress.from(""),
                    value: GivenName.from({ value: "aGivenName" })
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
            const localAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({ value: "aGivenName" })
                }),
                shareInfo: {
                    peer: aThirdParty,
                    sourceReference: await ConsumptionIds.request.generate(),
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
            const localAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({ value: "aGivenName" })
                })
            });

            const localAttributeCopy = await consumptionController.attributes.createSharedLocalAttributeCopy({
                peer: recipient,
                sourceReference: await ConsumptionIds.request.generate(),
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
                message: `The IdentityAttribute with the given sourceAttributeId '${requestItem.sourceAttributeId.toString()}' is already shared with the peer.`
            });
        });

        test("returns success when the IdentityAttribute is already shared with the peer but DeletedByPeer", async function () {
            const localAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({ value: "aGivenName" })
                })
            });

            const localAttributeCopy = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({ value: "aGivenName" })
                }),
                shareInfo: {
                    peer: recipient,
                    sourceReference: await ConsumptionIds.request.generate(),
                    sourceAttribute: localAttribute.id
                },
                deletionInfo: {
                    deletionStatus: LocalAttributeDeletionStatus.DeletedByPeer,
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
            const localAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({ value: "aGivenName" })
                })
            });

            const localAttributeCopy = await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({ value: "aGivenName" })
                }),
                shareInfo: {
                    peer: recipient,
                    sourceReference: await ConsumptionIds.request.generate(),
                    sourceAttribute: localAttribute.id
                },
                deletionInfo: {
                    deletionStatus: LocalAttributeDeletionStatus.ToBeDeletedByPeer,
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
            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({ owner: sender })
            });

            const { successor: successorOfRepositoryAttribute } = await consumptionController.attributes.succeedRepositoryAttribute(repositoryAttribute.id, {
                content: {
                    "@type": "IdentityAttribute",
                    owner: sender.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "anotherGivenName"
                    }
                }
            });

            const ownSharedCopyOfSuccessor = await consumptionController.attributes.createSharedLocalAttributeCopy({
                sourceAttributeId: successorOfRepositoryAttribute.id,
                peer: recipient,
                sourceReference: await ConsumptionIds.request.generate()
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
                message: `The provided IdentityAttribute is outdated. Its successor '${ownSharedCopyOfSuccessor.shareInfo?.sourceAttribute?.toString()}' is already shared with the peer.`
            });
        });

        test("returns success when a successor of the existing IdentityAttribute is already shared with the peer but DeletedByPeer", async function () {
            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({ owner: sender })
            });

            const { successor: successorOfRepositoryAttribute } = await consumptionController.attributes.succeedRepositoryAttribute(repositoryAttribute.id, {
                content: {
                    "@type": "IdentityAttribute",
                    owner: sender.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "anotherGivenName"
                    }
                }
            });

            await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({ value: "aGivenName" })
                }),
                shareInfo: {
                    peer: recipient,
                    sourceReference: await ConsumptionIds.request.generate(),
                    sourceAttribute: successorOfRepositoryAttribute.id
                },
                deletionInfo: {
                    deletionStatus: LocalAttributeDeletionStatus.DeletedByPeer,
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
            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({ owner: sender })
            });

            const { successor: successorOfRepositoryAttribute } = await consumptionController.attributes.succeedRepositoryAttribute(repositoryAttribute.id, {
                content: {
                    "@type": "IdentityAttribute",
                    owner: sender.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "anotherGivenName"
                    }
                }
            });

            await consumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({ value: "aGivenName" })
                }),
                shareInfo: {
                    peer: recipient,
                    sourceReference: await ConsumptionIds.request.generate(),
                    sourceAttribute: successorOfRepositoryAttribute.id
                },
                deletionInfo: {
                    deletionStatus: LocalAttributeDeletionStatus.ToBeDeletedByPeer,
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
            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({ owner: sender })
            });

            const ownSharedCopyOfPredecessor = await consumptionController.attributes.createSharedLocalAttributeCopy({
                sourceAttributeId: repositoryAttribute.id,
                peer: recipient,
                sourceReference: await ConsumptionIds.request.generate()
            });

            expect(ownSharedCopyOfPredecessor.isShared()).toBe(true);

            const { successor: successorOfRepositoryAttribute } = await consumptionController.attributes.succeedRepositoryAttribute(repositoryAttribute.id, {
                content: {
                    "@type": "IdentityAttribute",
                    owner: sender.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "anotherGivenName"
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
                message: `The predecessor '${ownSharedCopyOfPredecessor.shareInfo?.sourceAttribute?.toString()}' of the IdentityAttribute is already shared with the peer. Instead of sharing it, you should notify the peer about the Attribute succession.`
            });
        });

        test("returns success when a predecessor of the existing IdentityAttribute is already shared with the peer but DeletedByPeer", async function () {
            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({ owner: sender })
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
                    value: GivenName.from({ value: "aGivenName" })
                }),
                shareInfo: {
                    peer: recipient,
                    sourceReference: await ConsumptionIds.request.generate(),
                    sourceAttribute: repositoryAttribute.id
                },
                deletionInfo: {
                    deletionStatus: LocalAttributeDeletionStatus.DeletedByPeer,
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
            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({ owner: sender })
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
                    value: GivenName.from({ value: "aGivenName" })
                }),
                shareInfo: {
                    peer: recipient,
                    sourceReference: await ConsumptionIds.request.generate(),
                    sourceAttribute: repositoryAttribute.id
                },
                deletionInfo: {
                    deletionStatus: LocalAttributeDeletionStatus.ToBeDeletedByPeer,
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
            const relationshipAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: RelationshipAttribute.from({
                    owner: sender,
                    value: ProprietaryString.fromAny({ value: "aGivenName", title: "aTitle" }),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "aKey"
                }),
                shareInfo: {
                    peer: aThirdParty,
                    sourceReference: await ConsumptionIds.request.generate(),
                    sourceAttribute: CoreId.from("sourceAttributeId")
                }
            });
            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: relationshipAttribute.content,
                sourceAttributeId: relationshipAttribute.id,
                thirdPartyAddress: relationshipAttribute.shareInfo?.peer
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: "You can only share RelationshipAttributes that are not a copy of a sourceAttribute."
            });
        });

        test("returns error when the initial RelationshipAttribute already exists in the context of the Relationship with the peer", async function () {
            const relationshipAttribute = await consumptionController.attributes.createSharedLocalAttribute({
                content: RelationshipAttribute.from({
                    owner: sender,
                    value: ProprietaryString.fromAny({ value: "aGivenName", title: "aTitle" }),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "aKey"
                }),
                peer: recipient,
                sourceReference: await ConsumptionIds.request.generate()
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

        test("returns error when a ThirdPartyRelationshipAttribute already exists in the context of the Relationship with the peer", async function () {
            const initialRelationshipAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: RelationshipAttribute.from({
                    owner: sender,
                    value: ProprietaryString.fromAny({ value: "aGivenName", title: "aTitle" }),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "aKey"
                }),
                shareInfo: {
                    peer: aThirdParty,
                    sourceReference: await ConsumptionIds.request.generate()
                }
            });

            await consumptionController.attributes.createAttributeUnsafe({
                content: RelationshipAttribute.from({
                    owner: sender,
                    value: ProprietaryString.fromAny({ value: "aGivenName", title: "aTitle" }),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "aKey"
                }),
                shareInfo: {
                    peer: recipient,
                    sourceReference: await ConsumptionIds.request.generate(),
                    thirdPartyAddress: aThirdParty,
                    sourceAttribute: initialRelationshipAttribute.id
                }
            });

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: initialRelationshipAttribute.content,
                sourceAttributeId: initialRelationshipAttribute.id,
                thirdPartyAddress: aThirdParty
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: "The provided RelationshipAttribute already exists in the context of the Relationship with the peer."
            });
        });

        test("returns success when a ThirdPartyRelationshipAttribute already exists in the context of the Relationship with the peer but is ToBeDeletedByPeer", async function () {
            const initialRelationshipAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: RelationshipAttribute.from({
                    owner: sender,
                    value: ProprietaryString.fromAny({ value: "aGivenName", title: "aTitle" }),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "aKey"
                }),
                shareInfo: {
                    peer: aThirdParty,
                    sourceReference: await ConsumptionIds.request.generate()
                }
            });

            await consumptionController.attributes.createAttributeUnsafe({
                content: RelationshipAttribute.from({
                    owner: sender,
                    value: ProprietaryString.fromAny({ value: "aGivenName", title: "aTitle" }),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "aKey"
                }),
                shareInfo: {
                    peer: recipient,
                    sourceReference: await ConsumptionIds.request.generate(),
                    thirdPartyAddress: aThirdParty,
                    sourceAttribute: initialRelationshipAttribute.id
                },
                deletionInfo: {
                    deletionStatus: LocalAttributeDeletionStatus.ToBeDeletedByPeer,
                    deletionDate: CoreDate.utc().add({ day: 1 })
                }
            });

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: initialRelationshipAttribute.content,
                sourceAttributeId: initialRelationshipAttribute.id,
                thirdPartyAddress: aThirdParty
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).successfulValidationResult();
        });

        test("returns success when a ThirdPartyRelationshipAttribute already exists in the context of the Relationship with the peer but is DeletedByPeer", async function () {
            const initialRelationshipAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: RelationshipAttribute.from({
                    owner: sender,
                    value: ProprietaryString.fromAny({ value: "aGivenName", title: "aTitle" }),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "aKey"
                }),
                shareInfo: {
                    peer: aThirdParty,
                    sourceReference: await ConsumptionIds.request.generate()
                }
            });

            await consumptionController.attributes.createAttributeUnsafe({
                content: RelationshipAttribute.from({
                    owner: sender,
                    value: ProprietaryString.fromAny({ value: "aGivenName", title: "aTitle" }),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "aKey"
                }),
                shareInfo: {
                    peer: recipient,
                    sourceReference: await ConsumptionIds.request.generate(),
                    sourceAttribute: initialRelationshipAttribute.id,
                    thirdPartyAddress: aThirdParty
                },
                deletionInfo: {
                    deletionStatus: LocalAttributeDeletionStatus.DeletedByPeer,
                    deletionDate: CoreDate.utc().subtract({ day: 1 })
                }
            });

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: initialRelationshipAttribute.content,
                sourceAttributeId: initialRelationshipAttribute.id,
                thirdPartyAddress: aThirdParty
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).successfulValidationResult();
        });

        test("returns an error when trying to share a RelationshipAttribute of a pending Relationship", async function () {
            await TestUtil.mutualDecomposeIfActiveRelationshipExists(testAccount, consumptionController, thirdPartyTestAccount, thirdPartyConsumptionController);
            await TestUtil.addPendingRelationship(testAccount, thirdPartyTestAccount);

            const relationshipAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: RelationshipAttribute.from({
                    owner: sender,
                    value: ProprietaryString.fromAny({ value: "aGivenName", title: "aTitle" }),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "aKey"
                }),
                shareInfo: {
                    peer: aThirdParty,
                    sourceReference: await ConsumptionIds.request.generate()
                }
            });

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: relationshipAttribute.content,
                sourceAttributeId: relationshipAttribute.id,
                thirdPartyAddress: relationshipAttribute.shareInfo?.peer
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.cannotShareRelationshipAttributeOfPendingRelationship",
                message: "The provided RelationshipAttribute exists in the context of a pending Relationship and therefore cannot be shared."
            });
        });
    });

    describe("accept", function () {
        const sender = CoreAddress.from("Sender");

        test("returns ShareAttributeAcceptResponseItem when accepting a shared IdentityAttribute", async function () {
            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                sourceAttributeId: CoreId.from("aSourceAttributeId"),
                attribute: TestObjectFactory.createIdentityAttribute({ owner: sender })
            });

            const incomingRequest = LocalRequest.from({
                id: await ConsumptionIds.request.generate(),
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({ items: [requestItem] }),
                statusLog: []
            });

            const responseItem = await processor.accept(requestItem, { accept: true }, incomingRequest);
            expect(responseItem).toBeInstanceOf(ShareAttributeAcceptResponseItem);

            const createdAttribute = await consumptionController.attributes.getLocalAttribute(responseItem.attributeId);
            expect(createdAttribute!.shareInfo!.peer).toStrictEqual(sender);
            expect(createdAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
            expect(createdAttribute!.content.owner).toStrictEqual(sender);
        });

        test("returns ShareAttributeAcceptResponseItem when accepting a shared RelationshipAttribute", async function () {
            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                sourceAttributeId: CoreId.from("aSourceAttributeId"),
                attribute: TestObjectFactory.createRelationshipAttribute({ owner: sender }),
                thirdPartyAddress: CoreAddress.from("aThirdParty")
            });

            const incomingRequest = LocalRequest.from({
                id: await ConsumptionIds.request.generate(),
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({ items: [requestItem] }),
                statusLog: []
            });

            const responseItem = await processor.accept(requestItem, { accept: true }, incomingRequest);
            expect(responseItem).toBeInstanceOf(ShareAttributeAcceptResponseItem);

            const createdAttribute = await consumptionController.attributes.getLocalAttribute(responseItem.attributeId);
            expect(createdAttribute!.shareInfo!.peer).toStrictEqual(sender);
            expect(createdAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
            expect(createdAttribute!.content.owner).toStrictEqual(sender);
        });

        test("returns AttributeAlreadySharedAcceptResponseItem when accepting an already existing peer shared IdentityAttribute", async function () {
            const existingPeerSharedIdentityAttribute = await consumptionController.attributes.createSharedLocalAttribute({
                content: TestObjectFactory.createIdentityAttribute({ owner: sender }),
                peer: sender,
                sourceReference: await ConsumptionIds.request.generate()
            });

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                sourceAttributeId: CoreId.from("aSourceAttributeId"),
                attribute: TestObjectFactory.createIdentityAttribute({ owner: sender })
            });

            const incomingRequest = LocalRequest.from({
                id: await ConsumptionIds.request.generate(),
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({ items: [requestItem] }),
                statusLog: []
            });

            const responseItem = await processor.accept(requestItem, { accept: true }, incomingRequest);
            expect(responseItem).toBeInstanceOf(AttributeAlreadySharedAcceptResponseItem);
            expect(responseItem.attributeId).toStrictEqual(existingPeerSharedIdentityAttribute.id);
        });

        test("returns ShareAttributeAcceptResponseItem when accepting an already existing peer shared IdentityAttribute that has a deletionInfo", async function () {
            const existingPeerSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: TestObjectFactory.createIdentityAttribute({ owner: sender }),
                shareInfo: {
                    sourceReference: await ConsumptionIds.request.generate(),
                    peer: sender
                },
                deletionInfo: {
                    deletionStatus: LocalAttributeDeletionStatus.ToBeDeleted,
                    deletionDate: CoreDate.utc().add({ days: 1 })
                }
            });

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                sourceAttributeId: CoreId.from("aSourceAttributeId"),
                attribute: TestObjectFactory.createIdentityAttribute({ owner: sender })
            });

            const incomingRequest = LocalRequest.from({
                id: await ConsumptionIds.request.generate(),
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({ items: [requestItem] }),
                statusLog: []
            });

            const responseItem = await processor.accept(requestItem, { accept: true }, incomingRequest);
            expect(responseItem).toBeInstanceOf(ShareAttributeAcceptResponseItem);
            expect(responseItem.attributeId).not.toStrictEqual(existingPeerSharedIdentityAttribute.id);
        });

        test("returns ShareAttributeAcceptResponseItem when accepting an already existing peer shared IdentityAttribute that has a successor", async function () {
            const existingPeerSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: TestObjectFactory.createIdentityAttribute({ owner: sender }),
                shareInfo: {
                    sourceReference: await ConsumptionIds.request.generate(),
                    peer: sender
                },
                succeededBy: CoreId.from("aSuccessorId")
            });

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                sourceAttributeId: CoreId.from("aSourceAttributeId"),
                attribute: TestObjectFactory.createIdentityAttribute({ owner: sender })
            });

            const incomingRequest = LocalRequest.from({
                id: await ConsumptionIds.request.generate(),
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({ items: [requestItem] }),
                statusLog: []
            });

            const responseItem = await processor.accept(requestItem, { accept: true }, incomingRequest);
            expect(responseItem).toBeInstanceOf(ShareAttributeAcceptResponseItem);
            expect(responseItem.attributeId).not.toStrictEqual(existingPeerSharedIdentityAttribute.id);
        });
    });

    describe("canAccept", function () {
        test("returns success when sharing a valid IdentityAttribute", async function () {
            const existingAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: testAccount.identity.address,
                    tags: ["x:tag1"]
                })
            });

            const sender = CoreAddress.from("Sender");

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attribute: existingAttribute.content,
                sourceAttributeId: existingAttribute.id
            });
            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const canAcceptWithExistingAttributeResult = await processor.canAccept(
                requestItem,
                {
                    accept: true
                },
                request
            );

            expect(canAcceptWithExistingAttributeResult).successfulValidationResult();
        });

        test("returns an error when sharing an IdentityAttribute with an invalid tag", async function () {
            const attributesControllerSpy = spy(consumptionController.attributes);
            when(attributesControllerSpy.validateTagsOfAttribute(anything())).thenResolve(ValidationResult.success());

            const existingAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    tags: ["invalidTag"],
                    owner: testAccount.identity.address
                })
            });

            reset(attributesControllerSpy);

            const sender = CoreAddress.from("Sender");

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attribute: existingAttribute.content,
                sourceAttributeId: existingAttribute.id
            });
            const requestId = await ConsumptionIds.request.generate();
            const request = LocalRequest.from({
                id: requestId,
                createdAt: CoreDate.utc(),
                isOwn: false,
                peer: sender,
                status: LocalRequestStatus.DecisionRequired,
                content: Request.from({
                    id: requestId,
                    items: [requestItem]
                }),
                statusLog: []
            });

            const canAcceptWithExistingAttributeResult = await processor.canAccept(
                requestItem,
                {
                    accept: true
                },
                request
            );

            expect(canAcceptWithExistingAttributeResult).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: "Detected invalidity of the following tags: 'invalidTag'."
            });
        });
    });

    describe("applyIncomingResponseItem", function () {
        test("in case of an IdentityAttribute, creates a LocalAttribute with the Attribute from the RequestItem and the attributeId from the ResponseItem for the peer of the Request", async function () {
            const sourceAttributeContent = TestObjectFactory.createIdentityAttribute({ owner: testAccount.identity.address });
            const sourceAttribute = await consumptionController.attributes.createAttributeUnsafe({ content: sourceAttributeContent });

            const { localRequest, requestItem } = await createLocalRequest({ sourceAttribute });

            const responseItem = ShareAttributeAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                attributeId: await ConsumptionIds.attribute.generate()
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, localRequest);

            const createdAttribute = await consumptionController.attributes.getLocalAttribute(responseItem.attributeId);
            expect(createdAttribute!.id).toStrictEqual(responseItem.attributeId);
            expect(createdAttribute!.shareInfo!.peer).toStrictEqual(localRequest.peer);
            expect(createdAttribute!.shareInfo!.sourceAttribute).toStrictEqual(sourceAttribute.id);
            expect(createdAttribute!.content.owner).toStrictEqual(testAccount.identity.address);
        });

        test("in case of a RelationshipAttribute, creates a LocalAttribute with the Attribute from the RequestItem and the attributeId from the ResponseItem for the peer of the Request", async function () {
            const sourceAttributeContent = TestObjectFactory.createRelationshipAttribute({ owner: testAccount.identity.address });
            const sourceAttribute = await consumptionController.attributes.createAttributeUnsafe({
                content: sourceAttributeContent,
                shareInfo: LocalAttributeShareInfo.from({
                    sourceReference: CoreId.from("REQ1"),
                    peer: aThirdParty
                })
            });

            const { localRequest, requestItem } = await createLocalRequest({ sourceAttribute });

            const responseItem = ShareAttributeAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                attributeId: await ConsumptionIds.attribute.generate()
            });

            await processor.applyIncomingResponseItem(responseItem, requestItem, localRequest);

            const createdAttribute = await consumptionController.attributes.getLocalAttribute(responseItem.attributeId);
            expect(createdAttribute!.id).toStrictEqual(responseItem.attributeId);
            expect(createdAttribute!.shareInfo!.peer).toStrictEqual(localRequest.peer);
            expect(createdAttribute!.shareInfo!.sourceAttribute).toStrictEqual(sourceAttribute.id);
            expect(createdAttribute!.content.owner).toStrictEqual(testAccount.identity.address);
            expect(createdAttribute!.shareInfo!.thirdPartyAddress).toStrictEqual(aThirdParty);
        });
    });

    async function createLocalRequest({ sourceAttribute }: { sourceAttribute: LocalAttribute }): Promise<{ localRequest: LocalRequest; requestItem: ShareAttributeRequestItem }> {
        const requestItem = ShareAttributeRequestItem.from({
            mustBeAccepted: true,
            attribute: sourceAttribute.content,
            sourceAttributeId: sourceAttribute.id,
            thirdPartyAddress: sourceAttribute.isRelationshipAttribute() ? sourceAttribute.shareInfo.peer : undefined
        });

        const requestId = await ConsumptionIds.request.generate();
        const localRequest = LocalRequest.from({
            id: requestId,
            createdAt: CoreDate.utc(),
            isOwn: true,
            peer: CoreAddress.from("did:e:a-domain:dids:anidentity"),
            status: LocalRequestStatus.Open,
            content: Request.from({ id: requestId, items: [requestItem] }),
            statusLog: []
        });

        return { localRequest, requestItem };
    }
});
