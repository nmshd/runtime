import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import {
    AcceptResponseItem,
    AttributeAlreadySharedAcceptResponseItem,
    GivenName,
    IdentityAttribute,
    ProprietaryString,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    Request,
    ResponseItemResult,
    ShareAttributeRequestItem,
    Surname
} from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import { anything, reset, spy, when } from "ts-mockito";
import {
    ConsumptionController,
    ConsumptionIds,
    EmittedAttributeDeletionInfo,
    EmittedAttributeDeletionStatus,
    IPeerIdentityAttributeSuccessorParams,
    LocalAttribute,
    LocalRequest,
    LocalRequestStatus,
    OwnIdentityAttribute,
    OwnRelationshipAttribute,
    PeerIdentityAttribute,
    ReceivedAttributeDeletionInfo,
    ReceivedAttributeDeletionStatus,
    ShareAttributeRequestItemProcessor,
    ThirdPartyRelationshipAttribute,
    ThirdPartyRelationshipAttributeDeletionInfo,
    ThirdPartyRelationshipAttributeDeletionStatus,
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

    let recipientTestAccount: AccountController;

    let thirdPartyConsumptionController: ConsumptionController;
    let thirdPartyTestAccount: AccountController;
    let aThirdParty: CoreAddress;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport();
        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 3);
        ({ accountController: testAccount, consumptionController } = accounts[0]);

        ({ accountController: recipientTestAccount } = accounts[1]);

        ({ accountController: thirdPartyTestAccount, consumptionController: thirdPartyConsumptionController } = accounts[2]);
        aThirdParty = thirdPartyTestAccount.identity.address;

        await TestUtil.ensureActiveRelationship(testAccount, recipientTestAccount);
        await TestUtil.ensureActiveRelationship(testAccount, thirdPartyTestAccount);

        processor = new ShareAttributeRequestItemProcessor(consumptionController);
    });

    beforeEach(async () => await TestUtil.cleanupAttributes(consumptionController));

    afterAll(async () => await connection.close());

    describe("canCreateOutgoingRequestItem", function () {
        let recipient: CoreAddress;
        let sender: CoreAddress;

        beforeAll(function () {
            sender = testAccount.identity.address;
            recipient = recipientTestAccount.identity.address;
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
                    message: /The Attribute with the given attributeId '.*' is not an OwnIdentityAttribute, an OwnRelationshipAttribute or a PeerRelationshipAttribute\./
                },
                attribute: IdentityAttribute.from({
                    value: GivenName.fromAny({ value: "aGivenName" }),
                    owner: CoreAddress.from("someOtherOwner")
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
                scenario: "a Relationship Attribute with owner=aThirdParty",
                result: "success",
                attribute: RelationshipAttribute.from({
                    value: ProprietaryString.fromAny({ value: "aGivenName", title: "aTitle" }),
                    owner: CoreAddress.from("aThirdParty"),
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
                    message: "The provided RelationshipAttribute already exists in the context of the Relationship with the peer."
                }
            }
        ])("returns $result when passing $scenario", async function (testParams) {
            if (testParams.attribute.owner.address === "Sender") {
                testParams.attribute.owner = sender;
            }

            if (testParams.attribute.owner.address === "Recipient") {
                testParams.attribute.owner = recipient;
            }

            if (testParams.attribute.owner.address === "aThirdParty") {
                testParams.attribute.owner = aThirdParty;
            }

            let sourceAttribute;

            if (testParams.attribute instanceof IdentityAttribute) {
                if (testParams.attribute.owner.equals(sender)) {
                    sourceAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                        content: testParams.attribute
                    });
                } else {
                    sourceAttribute = await consumptionController.attributes.createPeerIdentityAttribute({
                        content: testParams.attribute,
                        peer: testParams.attribute.owner,
                        sourceReference: CoreId.from("aSourceReferenceId"),
                        id: CoreId.from("aPeerIdentityAttributeId")
                    });
                }
            } else if (testParams.attribute.owner.equals(sender)) {
                sourceAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
                    content: testParams.attribute,
                    peer: aThirdParty,
                    sourceReference: CoreId.from("aSourceReferenceId")
                });
            } else {
                sourceAttribute = await consumptionController.attributes.createPeerRelationshipAttribute({
                    content: testParams.attribute,
                    peer: testParams.attribute.owner,
                    sourceReference: CoreId.from("aSourceReferenceId")
                });
            }

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: sourceAttribute.content,
                attributeId: sourceAttribute.id,
                thirdPartyAddress: !(testParams.attribute instanceof IdentityAttribute)
                    ? testParams.attribute.owner.equals(sender)
                        ? aThirdParty
                        : testParams.attribute.owner
                    : undefined
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
                attributeId: CoreId.from("anIdThatDoesntExist")
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: "The Attribute with the given attributeId 'anIdThatDoesntExist' could not be found."
            });
        });

        test("returns error when the attribute content is not equal to the content persisted in the attribute collection", async function () {
            const attribute = IdentityAttribute.from({
                value: GivenName.fromAny({ value: "aGivenName" }),
                owner: sender
            });

            const sourceAttribute = await consumptionController.attributes.createOwnIdentityAttribute({ content: attribute });
            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: IdentityAttribute.from({
                    ...sourceAttribute.content.toJSON(),
                    value: Surname.from("aSurname").toJSON()
                }),
                attributeId: sourceAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The Attribute with the given attributeId '${sourceAttribute.id.toString()}' does not match the given Attribute.`
            });
        });

        test("returns error when an empty string is specified for the owner of the IdentityAttribute instead of the explicit address", async function () {
            const sourceAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
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
                attributeId: sourceAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The Attribute with the given attributeId '${sourceAttribute.id.toString()}' does not match the given Attribute.`
            });
        });

        test("returns error when an invalid tag is specified as a tag of the provided IdentityAttribute", async function () {
            const sourceAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({ value: "aGivenName" })
                })
            });

            sourceAttribute.content.tags = ["invalidTag"];
            await consumptionController.attributes.updateAttributeUnsafe(sourceAttribute);

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({ value: "aGivenName" }),
                    tags: ["invalidTag"]
                }),
                attributeId: sourceAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `Detected invalidity of the following tags: 'invalidTag'.`
            });
        });

        test("returns error when the IdentityAttribute is already shared with the peer", async function () {
            const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({ value: "aGivenName" })
                })
            });

            const forwardedOwnIdentityAttribute = await consumptionController.attributes.addForwardedSharingInfoToAttribute(
                ownIdentityAttribute,
                recipient,
                CoreId.from("aSourceReferenceId")
            );

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: forwardedOwnIdentityAttribute.content,
                attributeId: forwardedOwnIdentityAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The Attribute with the given attributeId '${requestItem.attributeId.toString()}' is already shared with the peer.`
            });
        });

        test("returns success when the IdentityAttribute is already shared with the peer but DeletedByPeer", async function () {
            const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({ value: "aGivenName" })
                })
            });

            const forwardedOwnIdentityAttribute = await consumptionController.attributes.addForwardedSharingInfoToAttribute(
                ownIdentityAttribute,
                recipient,
                CoreId.from("aSourceReferenceId")
            );

            await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(
                forwardedOwnIdentityAttribute,
                EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.DeletedByPeer,
                    deletionDate: CoreDate.utc().subtract({ days: 1 })
                }),
                recipient
            );

            const forwardedOwnIdentityAttributeWithDeletionInfo = (await consumptionController.attributes.getLocalAttribute(
                forwardedOwnIdentityAttribute.id
            )) as OwnIdentityAttribute;

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: forwardedOwnIdentityAttributeWithDeletionInfo.content,
                attributeId: forwardedOwnIdentityAttributeWithDeletionInfo.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).successfulValidationResult();
        });

        test("returns success when the IdentityAttribute is already shared with the peer but ToBeDeletedByPeer", async function () {
            const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    owner: sender,
                    value: GivenName.from({ value: "aGivenName" })
                })
            });

            const forwardedOwnIdentityAttribute = await consumptionController.attributes.addForwardedSharingInfoToAttribute(
                ownIdentityAttribute,
                recipient,
                CoreId.from("aSourceReferenceId")
            );

            await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(
                forwardedOwnIdentityAttribute,
                EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.ToBeDeletedByPeer,
                    deletionDate: CoreDate.utc().add({ days: 1 })
                }),
                recipient
            );

            const forwardedOwnIdentityAttributeWithDeletionInfo = (await consumptionController.attributes.getLocalAttribute(
                forwardedOwnIdentityAttribute.id
            )) as OwnIdentityAttribute;

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: forwardedOwnIdentityAttributeWithDeletionInfo.content,
                attributeId: forwardedOwnIdentityAttributeWithDeletionInfo.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).successfulValidationResult();
        });

        test("returns an error when a successor of the existing IdentityAttribute is already shared with the peer", async function () {
            const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: TestObjectFactory.createIdentityAttribute({ owner: sender })
            });

            const { successor: successorOfOwnIdentityAttribute } = await consumptionController.attributes.succeedOwnIdentityAttribute(ownIdentityAttribute, {
                content: {
                    "@type": "IdentityAttribute",
                    owner: sender.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "anotherGivenName"
                    }
                }
            });

            const forwardedSuccessor = await consumptionController.attributes.addForwardedSharingInfoToAttribute(
                successorOfOwnIdentityAttribute,
                recipient,
                CoreId.from("aSourceReferenceId")
            );

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attribute: ownIdentityAttribute.content,
                attributeId: ownIdentityAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The provided Attribute is outdated. Its successor '${forwardedSuccessor.id.toString()}' is already shared with the peer.`
            });
        });

        test("returns success when a successor of the existing IdentityAttribute is already shared with the peer but DeletedByPeer", async function () {
            const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: TestObjectFactory.createIdentityAttribute({ owner: sender })
            });

            const { successor: successorOfOwnIdentityAttribute } = await consumptionController.attributes.succeedOwnIdentityAttribute(ownIdentityAttribute, {
                content: {
                    "@type": "IdentityAttribute",
                    owner: sender.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "anotherGivenName"
                    }
                }
            });

            const forwardedSuccessor = await consumptionController.attributes.addForwardedSharingInfoToAttribute(
                successorOfOwnIdentityAttribute,
                recipient,
                CoreId.from("aSourceReferenceId")
            );

            await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(
                forwardedSuccessor,
                EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.DeletedByPeer,
                    deletionDate: CoreDate.utc().subtract({ days: 1 })
                }),
                recipient
            );

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attribute: ownIdentityAttribute.content,
                attributeId: ownIdentityAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).successfulValidationResult();
        });

        test("returns an error when a successor of the existing IdentityAttribute is already shared with the peer but ToBeDeletedByPeer", async function () {
            const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: TestObjectFactory.createIdentityAttribute({ owner: sender })
            });

            const { successor: successorOfOwnIdentityAttribute } = await consumptionController.attributes.succeedOwnIdentityAttribute(ownIdentityAttribute, {
                content: {
                    "@type": "IdentityAttribute",
                    owner: sender.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "anotherGivenName"
                    }
                }
            });

            const forwardedSuccessor = await consumptionController.attributes.addForwardedSharingInfoToAttribute(
                successorOfOwnIdentityAttribute,
                recipient,
                CoreId.from("aSourceReferenceId")
            );

            await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(
                forwardedSuccessor,
                EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.ToBeDeletedByPeer,
                    deletionDate: CoreDate.utc().add({ days: 1 })
                }),
                recipient
            );

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attribute: ownIdentityAttribute.content,
                attributeId: ownIdentityAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The provided Attribute is outdated. Its successor '${forwardedSuccessor.id.toString()}' is already shared with the peer.`
            });
        });

        test("returns an error when a predecessor of the existing IdentityAttribute is already shared and therefore the user should notify about the Attribute succession instead of share it", async function () {
            const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: TestObjectFactory.createIdentityAttribute({ owner: sender })
            });

            const forwardedPredecessor = await consumptionController.attributes.addForwardedSharingInfoToAttribute(
                ownIdentityAttribute,
                recipient,
                CoreId.from("aSourceReferenceId")
            );

            const { successor: successorOfOwnIdentityAttribute } = await consumptionController.attributes.succeedOwnIdentityAttribute(ownIdentityAttribute, {
                content: {
                    "@type": "IdentityAttribute",
                    owner: sender.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "anotherGivenName"
                    }
                }
            });

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attribute: successorOfOwnIdentityAttribute.content,
                attributeId: successorOfOwnIdentityAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The predecessor '${forwardedPredecessor.id.toString()}' of the Attribute is already shared with the peer. Instead of sharing it, you should notify the peer about the Attribute succession.`
            });
        });

        test("returns success when a predecessor of the existing IdentityAttribute is already shared with the peer but DeletedByPeer", async function () {
            const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: TestObjectFactory.createIdentityAttribute({ owner: sender })
            });

            const { successor: successorOfOwnIdentityAttribute } = await consumptionController.attributes.succeedOwnIdentityAttribute(ownIdentityAttribute, {
                content: {
                    "@type": "IdentityAttribute",
                    owner: sender.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "AnotherGivenName"
                    }
                }
            });

            const forwardedPredecessor = await consumptionController.attributes.addForwardedSharingInfoToAttribute(
                ownIdentityAttribute,
                recipient,
                CoreId.from("aSourceReferenceId")
            );

            await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(
                forwardedPredecessor,
                EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.DeletedByPeer,
                    deletionDate: CoreDate.utc().subtract({ days: 1 })
                }),
                recipient
            );

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attribute: successorOfOwnIdentityAttribute.content,
                attributeId: successorOfOwnIdentityAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).successfulValidationResult();
        });

        test("returns error when a predecessor of the existing IdentityAttribute is already shared with the peer but ToBeDeletedByPeer", async function () {
            const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: TestObjectFactory.createIdentityAttribute({ owner: sender })
            });

            const { successor: successorOfOwnIdentityAttribute } = await consumptionController.attributes.succeedOwnIdentityAttribute(ownIdentityAttribute, {
                content: {
                    "@type": "IdentityAttribute",
                    owner: sender.toString(),
                    value: {
                        "@type": "GivenName",
                        value: "AnotherGivenName"
                    }
                }
            });

            const forwardedPredecessor = await consumptionController.attributes.addForwardedSharingInfoToAttribute(
                ownIdentityAttribute,
                recipient,
                CoreId.from("aSourceReferenceId")
            );

            await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(
                forwardedPredecessor,
                EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.ToBeDeletedByPeer,
                    deletionDate: CoreDate.utc().add({ days: 1 })
                }),
                recipient
            );

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attribute: successorOfOwnIdentityAttribute.content,
                attributeId: successorOfOwnIdentityAttribute.id
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The predecessor '${forwardedPredecessor.id.toString()}' of the Attribute is already shared with the peer. Instead of sharing it, you should notify the peer about the Attribute succession.`
            });
        });

        test("returns error when the RelationshipAttribute is a ThirdPartyRelationshipAttribute", async function () {
            const relationshipAttribute = await consumptionController.attributes.createThirdPartyRelationshipAttribute({
                content: RelationshipAttribute.from({
                    owner: aThirdParty,
                    value: ProprietaryString.fromAny({ value: "aGivenName", title: "aTitle" }),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "aKey"
                }),

                peer: aThirdParty,
                sourceReference: CoreId.from("aSourceReferenceId"),
                initialAttributePeer: CoreAddress.from("initialAttributePeer"),
                id: CoreId.from("aThirdPartyRelationshipAttributeId")
            });
            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: relationshipAttribute.content,
                attributeId: relationshipAttribute.id,
                thirdPartyAddress: aThirdParty
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The Attribute with the given attributeId '${requestItem.attributeId.toString()}' is not an OwnIdentityAttribute, an OwnRelationshipAttribute or a PeerRelationshipAttribute.`
            });
        });

        test("returns error when a RelationshipAttribute is already shared with the peer", async function () {
            const initialRelationshipAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
                content: RelationshipAttribute.from({
                    owner: sender,
                    value: ProprietaryString.fromAny({ value: "aGivenName", title: "aTitle" }),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "aKey"
                }),
                peer: aThirdParty,
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            await consumptionController.attributes.addForwardedSharingInfoToAttribute(initialRelationshipAttribute, recipient, CoreId.from("aSourceReferenceId"));

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: initialRelationshipAttribute.content,
                attributeId: initialRelationshipAttribute.id,
                thirdPartyAddress: aThirdParty
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The Attribute with the given attributeId '${requestItem.attributeId.toString()}' is already shared with the peer.`
            });
        });

        test("returns success when a RelationshipAttribute is already shared with the peer but is ToBeDeletedByPeer", async function () {
            const initialRelationshipAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
                content: RelationshipAttribute.from({
                    owner: sender,
                    value: ProprietaryString.fromAny({ value: "aGivenName", title: "aTitle" }),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "aKey"
                }),
                peer: aThirdParty,
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            const forwardedRelationshipAttribute = await consumptionController.attributes.addForwardedSharingInfoToAttribute(
                initialRelationshipAttribute,
                recipient,
                CoreId.from("anotherSourceReferenceId")
            );

            await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(
                forwardedRelationshipAttribute,
                EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.ToBeDeletedByPeer,
                    deletionDate: CoreDate.utc().add({ days: 1 })
                }),
                recipient
            );

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: initialRelationshipAttribute.content,
                attributeId: initialRelationshipAttribute.id,
                thirdPartyAddress: aThirdParty
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).successfulValidationResult();
        });

        test("returns success when a RelationshipAttribute is already shared with the peer but is DeletedByPeer", async function () {
            const initialRelationshipAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
                content: RelationshipAttribute.from({
                    owner: sender,
                    value: ProprietaryString.fromAny({ value: "aGivenName", title: "aTitle" }),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "aKey"
                }),
                peer: aThirdParty,
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            const forwardedRelationshipAttribute = await consumptionController.attributes.addForwardedSharingInfoToAttribute(
                initialRelationshipAttribute,
                recipient,
                CoreId.from("anotherSourceReferenceId")
            );

            await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(
                forwardedRelationshipAttribute,
                EmittedAttributeDeletionInfo.from({
                    deletionStatus: EmittedAttributeDeletionStatus.DeletedByPeer,
                    deletionDate: CoreDate.utc().subtract({ days: 1 })
                }),
                recipient
            );

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: initialRelationshipAttribute.content,
                attributeId: initialRelationshipAttribute.id,
                thirdPartyAddress: aThirdParty
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).successfulValidationResult();
        });

        test("returns an error when trying to share a RelationshipAttribute of a pending Relationship", async function () {
            await TestUtil.mutualDecomposeIfActiveRelationshipExists(testAccount, consumptionController, thirdPartyTestAccount, thirdPartyConsumptionController);
            await TestUtil.addPendingRelationship(testAccount, thirdPartyTestAccount);

            const relationshipAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
                content: RelationshipAttribute.from({
                    owner: sender,
                    value: ProprietaryString.fromAny({ value: "aGivenName", title: "aTitle" }),
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    key: "aKey"
                }),
                peer: aThirdParty,
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: false,
                attribute: relationshipAttribute.content,
                attributeId: relationshipAttribute.id,
                thirdPartyAddress: relationshipAttribute.peerSharingInfo.peer
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.cannotShareRelationshipAttributeOfPendingRelationship",
                message: "The provided RelationshipAttribute exists in the context of a pending Relationship and therefore cannot be shared."
            });
        });

        test("returns an error when a successor of the existing RelationshipAttribute is already shared with the peer", async function () {
            const ownRelationshipAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
                content: TestObjectFactory.createRelationshipAttribute({ owner: sender }),
                peer: aThirdParty,
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            const { successor: successorOfOwnRelationshipAttribute } = await consumptionController.attributes.succeedOwnRelationshipAttribute(ownRelationshipAttribute, {
                content: {
                    "@type": "RelationshipAttribute",
                    owner: sender.toString(),
                    key: "aKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    value: {
                        "@type": "ProprietaryString",
                        value: "anotherValue",
                        title: "aTitle"
                    }
                },
                peerSharingInfo: { peer: aThirdParty.toString(), sourceReference: "anotherSourceReferenceId" }
            });

            const forwardedSuccessor = await consumptionController.attributes.addForwardedSharingInfoToAttribute(
                successorOfOwnRelationshipAttribute,
                recipient,
                CoreId.from("aForwardingSourceReferenceId")
            );

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attribute: ownRelationshipAttribute.content,
                attributeId: ownRelationshipAttribute.id,
                thirdPartyAddress: ownRelationshipAttribute.peerSharingInfo.peer
            });
            const request = Request.from({ items: [requestItem] });

            const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipient);

            expect(result).errorValidationResult({
                code: "error.consumption.requests.invalidRequestItem",
                message: `The provided Attribute is outdated. Its successor '${forwardedSuccessor.id.toString()}' is already shared with the peer.`
            });
        });
    });

    describe("accept", function () {
        const sender = CoreAddress.from("Sender");

        test("returns AcceptResponseItem when accepting a shared IdentityAttribute", async function () {
            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attributeId: CoreId.from("anAttributeId"),
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
            expect(responseItem).toBeInstanceOf(AcceptResponseItem);

            const createdAttribute = await consumptionController.attributes.getLocalAttribute(requestItem.attributeId);
            expect((createdAttribute as PeerIdentityAttribute).peerSharingInfo.peer).toStrictEqual(sender);
            expect(createdAttribute!.content.owner).toStrictEqual(sender);
        });

        test("returns AcceptResponseItem when accepting an already existing PeerIdentityAttribute that is DeletedByOwner", async function () {
            const existingPeerIdentityAttribute = await consumptionController.attributes.createPeerIdentityAttribute({
                content: TestObjectFactory.createIdentityAttribute({ owner: sender }),
                sourceReference: CoreId.from("aSourceReferenceId"),
                peer: sender,
                id: CoreId.from("aPeerIdentityAttributeId")
            });

            await consumptionController.attributes.setPeerDeletionInfoOfPeerAttribute(
                existingPeerIdentityAttribute,
                ReceivedAttributeDeletionInfo.from({
                    deletionStatus: ReceivedAttributeDeletionStatus.DeletedByOwner,
                    deletionDate: CoreDate.utc().subtract({ days: 1 })
                })
            );

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attributeId: CoreId.from("anotherAttributeId"),
                attribute: existingPeerIdentityAttribute.content
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
            expect(responseItem).toBeInstanceOf(AcceptResponseItem);
        });

        test("returns AttributeAlreadySharedAcceptResponseItem when accepting an already existing PeerIdentityAttribute", async function () {
            const existingPeerIdentityAttribute = await consumptionController.attributes.createPeerIdentityAttribute({
                content: TestObjectFactory.createIdentityAttribute({ owner: sender }),
                peer: sender,
                sourceReference: CoreId.from("aSourceReferenceId"),
                id: CoreId.from("aPeerIdentityAttributeId")
            });

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attributeId: CoreId.from("anAttributeId"),
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
            expect((responseItem as AttributeAlreadySharedAcceptResponseItem).attributeId).toStrictEqual(existingPeerIdentityAttribute.id);
        });

        test("returns AttributeAlreadySharedAcceptResponseItem when accepting an already existing PeerIdentityAttribute that is to be deleted", async function () {
            const existingPeerIdentityAttribute = await consumptionController.attributes.createPeerIdentityAttribute({
                content: TestObjectFactory.createIdentityAttribute({ owner: sender }),
                sourceReference: CoreId.from("aSourceReferenceId"),
                peer: sender,
                id: CoreId.from("aPeerIdentityAttributeId")
            });

            await consumptionController.attributes.setPeerDeletionInfoOfPeerAttribute(
                existingPeerIdentityAttribute,
                ReceivedAttributeDeletionInfo.from({
                    deletionStatus: ReceivedAttributeDeletionStatus.ToBeDeleted,
                    deletionDate: CoreDate.utc().add({ days: 1 })
                })
            );

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attributeId: CoreId.from("anAttributeId"),
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
            expect((responseItem as AttributeAlreadySharedAcceptResponseItem).attributeId).toStrictEqual(existingPeerIdentityAttribute.id);

            const updatedAttribute = (await consumptionController.attributes.getLocalAttribute(existingPeerIdentityAttribute.id)) as PeerIdentityAttribute;
            expect(updatedAttribute.peerSharingInfo.deletionInfo).toBeUndefined();
        });

        test("returns AttributeAlreadySharedAcceptResponseItem when accepting an already existing PeerIdentityAttribute that has a successor", async function () {
            const existingPeerIdentityAttribute = await consumptionController.attributes.createPeerIdentityAttribute({
                content: TestObjectFactory.createIdentityAttribute({ owner: sender, value: GivenName.from({ value: "aGivenName" }) }),
                sourceReference: CoreId.from("aSourceReferenceId"),
                peer: sender,
                id: CoreId.from("aPeerIdentityAttributeId")
            });

            const successorParams: IPeerIdentityAttributeSuccessorParams = {
                content: TestObjectFactory.createIdentityAttribute({ owner: sender, value: GivenName.from({ value: "anotherGivenName" }) }),
                id: CoreId.from("aPeerIdentityAttributeSuccessorId"),
                peerSharingInfo: {
                    peer: sender,
                    sourceReference: CoreId.from("anotherSourceReferenceId")
                }
            };
            await consumptionController.attributes.succeedPeerIdentityAttribute(existingPeerIdentityAttribute, successorParams);

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attributeId: existingPeerIdentityAttribute.id,
                attribute: existingPeerIdentityAttribute.content
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
        });

        test("returns AcceptResponseItem when accepting a shared RelationshipAttribute", async function () {
            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attributeId: CoreId.from("anAttributeId"),
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
            expect(responseItem).toBeInstanceOf(AcceptResponseItem);

            const createdAttribute = await consumptionController.attributes.getLocalAttribute(requestItem.attributeId);
            expect((createdAttribute! as PeerIdentityAttribute).peerSharingInfo.peer).toStrictEqual(sender);
            expect(createdAttribute!.content.owner).toStrictEqual(sender);
        });

        test("returns AcceptResponseItem when accepting an already shared RelationshipAttribute that is DeletedByOwner", async function () {
            const existingThirdPartyRelationshipAttribute = await consumptionController.attributes.createThirdPartyRelationshipAttribute({
                content: TestObjectFactory.createRelationshipAttribute({ owner: sender }),
                sourceReference: CoreId.from("aSourceReferenceId"),
                peer: sender,
                initialAttributePeer: aThirdParty,
                id: CoreId.from("aThirdPartyRelationshipAttributeId")
            });

            await consumptionController.attributes.setPeerDeletionInfoOfThirdPartyRelationshipAttribute(
                existingThirdPartyRelationshipAttribute,
                ThirdPartyRelationshipAttributeDeletionInfo.from({
                    deletionStatus: ThirdPartyRelationshipAttributeDeletionStatus.DeletedByOwner,
                    deletionDate: CoreDate.utc().subtract({ days: 1 })
                })
            );

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attributeId: CoreId.from("anotherAttributeId"),
                attribute: TestObjectFactory.createRelationshipAttribute({ owner: sender }),
                thirdPartyAddress: aThirdParty
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
            expect(responseItem).toBeInstanceOf(AcceptResponseItem);
        });

        test("returns AttributeAlreadySharedAcceptResponseItem when accepting an already shared RelationshipAttribute", async function () {
            const existingThirdPartyRelationshipAttribute = await consumptionController.attributes.createThirdPartyRelationshipAttribute({
                content: TestObjectFactory.createRelationshipAttribute({ owner: sender }),
                sourceReference: CoreId.from("aSourceReferenceId"),
                peer: sender,
                initialAttributePeer: aThirdParty,
                id: CoreId.from("aThirdPartyRelationshipAttributeId")
            });

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attributeId: CoreId.from("anotherAttributeId"),
                attribute: TestObjectFactory.createRelationshipAttribute({ owner: sender }),
                thirdPartyAddress: aThirdParty
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
            expect((responseItem as AttributeAlreadySharedAcceptResponseItem).attributeId).toStrictEqual(existingThirdPartyRelationshipAttribute.id);
        });

        test("returns AttributeAlreadySharedAcceptResponseItem when accepting an already shared RelationshipAttribute that is ToBeDeleted", async function () {
            const existingThirdPartyRelationshipAttribute = await consumptionController.attributes.createThirdPartyRelationshipAttribute({
                content: TestObjectFactory.createRelationshipAttribute({ owner: sender }),
                sourceReference: CoreId.from("aSourceReferenceId"),
                peer: sender,
                initialAttributePeer: aThirdParty,
                id: CoreId.from("aThirdPartyRelationshipAttributeId")
            });

            await consumptionController.attributes.setPeerDeletionInfoOfThirdPartyRelationshipAttribute(
                existingThirdPartyRelationshipAttribute,
                ThirdPartyRelationshipAttributeDeletionInfo.from({
                    deletionStatus: ThirdPartyRelationshipAttributeDeletionStatus.ToBeDeleted,
                    deletionDate: CoreDate.utc().add({ days: 1 })
                })
            );

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attributeId: CoreId.from("anotherAttributeId"),
                attribute: TestObjectFactory.createRelationshipAttribute({ owner: sender }),
                thirdPartyAddress: aThirdParty
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
            expect((responseItem as AttributeAlreadySharedAcceptResponseItem).attributeId).toStrictEqual(existingThirdPartyRelationshipAttribute.id);

            const updatedAttribute = (await consumptionController.attributes.getLocalAttribute(existingThirdPartyRelationshipAttribute.id)) as ThirdPartyRelationshipAttribute;
            expect(updatedAttribute.peerSharingInfo.deletionInfo).toBeUndefined();
        });
    });

    describe("canAccept", function () {
        test("returns success when sharing a valid IdentityAttribute", async function () {
            const existingAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: TestObjectFactory.createIdentityAttribute({
                    owner: testAccount.identity.address,
                    tags: ["x:tag1"]
                })
            });

            const sender = CoreAddress.from("Sender");

            const requestItem = ShareAttributeRequestItem.from({
                mustBeAccepted: true,
                attribute: existingAttribute.content,
                attributeId: existingAttribute.id
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

            const existingAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
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
                attributeId: existingAttribute.id
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
        test("in case of an IdentityAttribute, adds a ForwardedSharingInfo to the Attribute from the RequestItem for the peer of the Request", async function () {
            const sharedAttributeContent = TestObjectFactory.createIdentityAttribute({ owner: testAccount.identity.address });
            const sharedAttribute = await consumptionController.attributes.createOwnIdentityAttribute({ content: sharedAttributeContent });

            const { localRequest, requestItem } = await createLocalRequest({ sharedAttribute: sharedAttribute });

            const responseItem = AcceptResponseItem.from({ result: ResponseItemResult.Accepted });

            await processor.applyIncomingResponseItem(responseItem, requestItem, localRequest);

            const forwardedAttribute = await consumptionController.attributes.getLocalAttribute(sharedAttribute.id);
            expect((forwardedAttribute! as OwnIdentityAttribute).isForwardedTo(localRequest.peer)).toBe(true);
            expect(forwardedAttribute!.content.owner).toStrictEqual(testAccount.identity.address);
        });

        test("in case of a RelationshipAttribute, adds a ForwardedSharingInfo to the Attribute from the RequestItem for the peer of the Request", async function () {
            const sharedAttributeContent = TestObjectFactory.createRelationshipAttribute({ owner: testAccount.identity.address });
            const sharedAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
                content: sharedAttributeContent,
                sourceReference: CoreId.from("aSourceReferenceId"),
                peer: aThirdParty
            });

            const { localRequest, requestItem } = await createLocalRequest({ sharedAttribute: sharedAttribute });

            const responseItem = AcceptResponseItem.from({ result: ResponseItemResult.Accepted });

            await processor.applyIncomingResponseItem(responseItem, requestItem, localRequest);

            const forwardedAttribute = await consumptionController.attributes.getLocalAttribute(sharedAttribute.id);
            expect((forwardedAttribute! as OwnRelationshipAttribute).isForwardedTo(localRequest.peer)).toBe(true);
            expect(forwardedAttribute!.content.owner).toStrictEqual(testAccount.identity.address);
            expect((forwardedAttribute! as OwnRelationshipAttribute).peerSharingInfo.peer).toStrictEqual(aThirdParty);
        });

        test("in case of an already shared Attribute that is ToBeDeletedByPeer, removes the deletionInfo", async function () {
            const sharedAttributeContent = TestObjectFactory.createIdentityAttribute({ owner: testAccount.identity.address });
            const sharedAttribute = await consumptionController.attributes.createOwnIdentityAttribute({ content: sharedAttributeContent });

            await consumptionController.attributes.addForwardedSharingInfoToAttribute(
                sharedAttribute,
                CoreAddress.from("did:e:a-domain:dids:anidentity"),
                CoreId.from("aSourceReferenceId")
            );

            const deletionInfo = EmittedAttributeDeletionInfo.from({
                deletionStatus: EmittedAttributeDeletionStatus.ToBeDeletedByPeer,
                deletionDate: CoreDate.utc().add({ days: 1 })
            });
            await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(sharedAttribute, deletionInfo, CoreAddress.from("did:e:a-domain:dids:anidentity"));

            const { localRequest, requestItem } = await createLocalRequest({ sharedAttribute: sharedAttribute });

            const responseItem = AttributeAlreadySharedAcceptResponseItem.from({ result: ResponseItemResult.Accepted, attributeId: sharedAttribute.id });

            await processor.applyIncomingResponseItem(responseItem, requestItem, localRequest);

            const forwardedAttribute = (await consumptionController.attributes.getLocalAttribute(sharedAttribute.id)) as OwnIdentityAttribute;
            expect(forwardedAttribute.isForwardedTo(localRequest.peer, true)).toBe(true);
            expect(forwardedAttribute.forwardedSharingInfos![0].deletionInfo).toBeUndefined();
        });
    });

    async function createLocalRequest({ sharedAttribute }: { sharedAttribute: LocalAttribute }): Promise<{ localRequest: LocalRequest; requestItem: ShareAttributeRequestItem }> {
        const requestItem = ShareAttributeRequestItem.from({
            mustBeAccepted: true,
            attribute: sharedAttribute.content,
            attributeId: sharedAttribute.id,
            thirdPartyAddress: sharedAttribute.content instanceof RelationshipAttribute ? (sharedAttribute as OwnRelationshipAttribute).peerSharingInfo.peer : undefined
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
