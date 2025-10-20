import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { sleep } from "@js-soft/ts-utils";
import {
    BirthPlace,
    DisplayName,
    EMailAddress,
    IdentityAttribute,
    IIdentityAttributeQuery,
    IIQLQuery,
    IRelationshipAttributeQuery,
    Nationality,
    ProprietaryString,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    ThirdPartyRelationshipAttributeQueryOwner
} from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, ClientResult, TagClient, Transport } from "@nmshd/transport";
import { IPeerRelationshipAttributeSuccessorParams } from "src/modules/attributes/local/successorParams/PeerRelationshipAttributeSuccessorParams";
import { anything, reset, spy, verify, when } from "ts-mockito";
import {
    AttributeCreatedEvent,
    AttributeDeletedEvent,
    AttributeForwardingDetailsChangedEvent,
    AttributesController,
    AttributeTagCollection,
    ConsumptionController,
    EmittedAttributeDeletionInfo,
    EmittedAttributeDeletionStatus,
    IOwnRelationshipAttributeSuccessorParams,
    IPeerIdentityAttributeSuccessorParams,
    IThirdPartyRelationshipAttributeSuccessorParams,
    OwnIdentityAttribute,
    OwnIdentityAttributeSuccessorParams,
    OwnRelationshipAttribute,
    PeerIdentityAttribute,
    PeerIdentityAttributeSuccessorParams,
    PeerRelationshipAttribute,
    ReceivedAttributeDeletionInfo,
    ReceivedAttributeDeletionStatus,
    ThirdPartyRelationshipAttribute
} from "../../../src";
import { TestUtil } from "../../core/TestUtil";
import { MockEventBus } from "../MockEventBus";

const mockEventBus = new MockEventBus();

describe("AttributesController", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let consumptionController: ConsumptionController;
    let testAccount: AccountController;

    let appConsumptionController: ConsumptionController;
    let appTestAccount: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport(mockEventBus);
        await transport.init();

        const connectorAccount = (await TestUtil.provideAccounts(transport, connection, 1))[0];
        ({ accountController: testAccount, consumptionController } = connectorAccount);

        const appAccount = (await TestUtil.provideAccounts(transport, connection, 1, undefined, undefined, { setDefaultOwnIdentityAttributes: true }))[0];
        ({ accountController: appTestAccount, consumptionController: appConsumptionController } = appAccount);
    });

    afterAll(async function () {
        await testAccount.close();
        await appTestAccount.close();
        await connection.close();
    });

    beforeEach(function () {
        mockEventBus.clearPublishedEvents();
    });

    afterEach(async function () {
        const attributes = await consumptionController.attributes.getLocalAttributes();
        for (const attribute of attributes) {
            await consumptionController.attributes.deleteAttribute(attribute.id);
        }

        const appAttributes = await appConsumptionController.attributes.getLocalAttributes();
        for (const attribute of appAttributes) {
            await appConsumptionController.attributes.deleteAttribute(attribute.id);
        }
    });

    describe("create Attributes", function () {
        test("should create a new OwnIdentityAttribute", async function () {
            const params = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "DisplayName",
                        value: "aDisplayName"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            };

            const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute(params);
            expect(ownIdentityAttribute).toBeInstanceOf(OwnIdentityAttribute);
            expect(ownIdentityAttribute.content).toBeInstanceOf(IdentityAttribute);

            const attributesAfterCreate = await consumptionController.attributes.getLocalAttributes();
            expect(attributesAfterCreate).toHaveLength(1);

            mockEventBus.expectPublishedEvents(AttributeCreatedEvent);
        });

        test("should not create a new OwnIdentityAttribute with a forbidden character", async function () {
            const params = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "DisplayName",
                        value: "aDisplayName😀"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            };

            await expect(consumptionController.attributes.createOwnIdentityAttribute(params)).rejects.toThrow(
                "error.consumption.attributes.forbiddenCharactersInAttribute: 'The Attribute contains forbidden characters.'"
            );
        });

        test("should not create a new OwnIdentityAttribute with an invalid tag", async function () {
            const params = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "DisplayName",
                        value: "aDisplayName"
                    },
                    owner: consumptionController.accountController.identity.address,
                    tags: ["invalidTag"]
                })
            };

            await expect(consumptionController.attributes.createOwnIdentityAttribute(params)).rejects.toThrow("Detected invalidity of the following tags: 'invalidTag'.");
        });

        test("should trim whitespace for an OwnIdentityAttribute", async function () {
            const params = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "DisplayName",
                        value: "  aDisplayName\n"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            };

            const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute(params);
            expect((ownIdentityAttribute.content.value as DisplayName).value).toBe("aDisplayName");
        });

        test("should create a new OwnIdentityAttribute of type SchematizedXML", async function () {
            const params = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "SchematizedXML",
                        title: "aTitle",
                        value: "aValue"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            };

            const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute(params);
            expect(ownIdentityAttribute).toBeInstanceOf(OwnIdentityAttribute);
            expect(ownIdentityAttribute.content).toBeInstanceOf(IdentityAttribute);

            const attributesAfterCreate = await consumptionController.attributes.getLocalAttributes();
            expect(attributesAfterCreate).toHaveLength(1);

            mockEventBus.expectPublishedEvents(AttributeCreatedEvent);
        });

        test("should set an OwnIdentityAttribute as default if it is the only of its value type and setDefaultOwnIdentityAttributes is true", async function () {
            const attributeParams = {
                content: IdentityAttribute.from({
                    value: EMailAddress.from({
                        value: "my@email.address"
                    }),
                    owner: appConsumptionController.accountController.identity.address
                })
            };
            const attribute = await appConsumptionController.attributes.createOwnIdentityAttribute(attributeParams);
            expect(attribute.isDefault).toBe(true);
        });

        test("should not set an OwnIdentityAttribute as default if already another exists with that value type and setDefaultOwnIdentityAttributes is true", async function () {
            const attributeParams = {
                content: IdentityAttribute.from({
                    value: EMailAddress.from({
                        value: "my@email.address"
                    }),
                    owner: appConsumptionController.accountController.identity.address
                })
            };
            const firstAttribute = await appConsumptionController.attributes.createOwnIdentityAttribute(attributeParams);
            expect(firstAttribute.isDefault).toBe(true);

            const secondAttribute = await appConsumptionController.attributes.createOwnIdentityAttribute(attributeParams);
            expect(secondAttribute.isDefault).toBeUndefined();
        });

        test("should not set an OwnIdentityAttribute as default if it is the only of its value type but setDefaultOwnIdentityAttributes is false", async function () {
            const attributeParams = {
                content: IdentityAttribute.from({
                    value: EMailAddress.from({
                        value: "my@email.address"
                    }),
                    owner: consumptionController.accountController.identity.address
                })
            };
            const attribute = await consumptionController.attributes.createOwnIdentityAttribute(attributeParams);
            expect(attribute.isDefault).toBeUndefined();
        });

        test("should allow to create a PeerIdentityAttribute", async function () {
            const content = IdentityAttribute.from({
                value: {
                    "@type": "Nationality",
                    value: "DE"
                },
                owner: CoreAddress.from("address")
            });
            const createPeerIdentityAttributeParams = {
                content: content,
                sourceReference: CoreId.from("aSourceReferenceId"),
                peer: CoreAddress.from("address"),
                id: CoreId.from("aPeerIdentityAttributeId")
            };
            const peerIdentityAttribute = await consumptionController.attributes.createPeerIdentityAttribute(createPeerIdentityAttributeParams);
            expect(peerIdentityAttribute).toBeInstanceOf(PeerIdentityAttribute);
            expect(peerIdentityAttribute.content.toJSON()).toStrictEqual(content.toJSON());
            expect(peerIdentityAttribute.content.value).toBeInstanceOf(Nationality);
            expect(peerIdentityAttribute.peer.toString()).toBe("address");
            expect(peerIdentityAttribute.sourceReference.toString()).toBe("aSourceReferenceId");

            mockEventBus.expectLastPublishedEvent(AttributeCreatedEvent);
        });

        test("should allow to create an OwnRelationshipAttribute", async function () {
            const peerAddress = CoreAddress.from("peerAddress");

            const ownRelationshipAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    owner: testAccount.identity.address,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                peer: peerAddress,
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            expect(ownRelationshipAttribute).toBeInstanceOf(OwnRelationshipAttribute);
            expect(ownRelationshipAttribute.content.value).toBeInstanceOf(ProprietaryString);
            expect(ownRelationshipAttribute.peer.toString()).toBe(peerAddress.toString());
            expect(ownRelationshipAttribute.sourceReference.toString()).toBe("aSourceReferenceId");

            mockEventBus.expectLastPublishedEvent(AttributeCreatedEvent);
        });

        test("should allow to create a PeerRelationshipAttribute", async function () {
            const peerAddress = CoreAddress.from("peerAddress");

            const peerRelationshipAttribute = await consumptionController.attributes.createPeerRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    owner: peerAddress,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                peer: peerAddress,
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            expect(peerRelationshipAttribute).toBeInstanceOf(PeerRelationshipAttribute);
            expect(peerRelationshipAttribute.content.value).toBeInstanceOf(ProprietaryString);
            expect(peerRelationshipAttribute.peer.toString()).toBe(peerAddress.toString());
            expect(peerRelationshipAttribute.sourceReference.toString()).toBe("aSourceReferenceId");

            mockEventBus.expectLastPublishedEvent(AttributeCreatedEvent);
        });

        test("should allow to create a ThirdPartyRelationshipAttribute", async function () {
            const thirdPartyAddress = CoreAddress.from("thirdPartyAdress");
            const peerAddress = CoreAddress.from("peerAddress");

            const thirdPartyRelationshipAttribute = await consumptionController.attributes.createThirdPartyRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    owner: peerAddress,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                peer: peerAddress,
                sourceReference: CoreId.from("aSourceReferenceId"),
                initialAttributePeer: thirdPartyAddress,
                id: CoreId.from("aThirdPartyRelationshipAttributeId")
            });

            expect(thirdPartyRelationshipAttribute).toBeInstanceOf(ThirdPartyRelationshipAttribute);
            expect(thirdPartyRelationshipAttribute.content.value).toBeInstanceOf(ProprietaryString);
            expect(thirdPartyRelationshipAttribute.peer.toString()).toBe(peerAddress.toString());
            expect(thirdPartyRelationshipAttribute.sourceReference.toString()).toBe("aSourceReferenceId");

            mockEventBus.expectLastPublishedEvent(AttributeCreatedEvent);
        });
    });

    describe("change ForwardingDetails of Attributes", function () {
        test("should allow to add ForwardingDetails to an OwnIdentityAttribute", async function () {
            const attributeParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: testAccount.identity.address
                })
            };
            const attribute = await consumptionController.attributes.createOwnIdentityAttribute(attributeParams);

            const peer = CoreAddress.from("address");
            const sourceReference = CoreId.from("aSourceReferenceId");

            const forwardedAttribute = await consumptionController.attributes.addForwardingDetailsToAttribute(attribute, peer, sourceReference);
            expect(forwardedAttribute).toBeInstanceOf(OwnIdentityAttribute);

            const isForwarded = await consumptionController.attributes.isForwardedTo(forwardedAttribute, peer)
            expect(isForwarded).toBe(true);
        });

        test("should allow to add ForwardingDetails to an OwnRelationshipAttribute", async function () {
            const thirdPartyAddress = CoreAddress.from("thirdPartyAdress");
            const peerAddress = CoreAddress.from("peerAddress");

            const ownRelationshipAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    owner: testAccount.identity.address,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                peer: thirdPartyAddress,
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            const forwardedOwnRelationshipAttribute = await consumptionController.attributes.addForwardingDetailsToAttribute(
                ownRelationshipAttribute,
                peerAddress,
                CoreId.from("anotherSourceReferenceId")
            );

            expect(forwardedOwnRelationshipAttribute).toBeInstanceOf(OwnRelationshipAttribute);

            const isForwarded = await consumptionController.attributes.isForwardedTo(forwardedOwnRelationshipAttribute, peerAddress)
            expect(isForwarded).toBe(true);
        });

        test("should allow to add ForwardingDetails to a PeerRelationshipAttribute", async function () {
            const thirdPartyAddress = CoreAddress.from("thirdPartyAdress");
            const peerAddress = CoreAddress.from("peerAddress");

            const peerRelationshipAttribute = await consumptionController.attributes.createPeerRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    owner: thirdPartyAddress,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                peer: thirdPartyAddress,
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            const forwardedPeerRelationshipAttribute = await consumptionController.attributes.addForwardingDetailsToAttribute(
                peerRelationshipAttribute,
                peerAddress,
                CoreId.from("anotherSourceReferenceId")
            );

            expect(forwardedPeerRelationshipAttribute).toBeInstanceOf(PeerRelationshipAttribute);

            const isForwarded = await consumptionController.attributes.isForwardedTo(forwardedPeerRelationshipAttribute, peerAddress);
            expect(isForwarded).toBe(true);
        });

        test("should publish an event adding ForwardingDetails to an Attribute", async function () {
            const attributeParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: testAccount.identity.address
                })
            };
            const attribute = await consumptionController.attributes.createOwnIdentityAttribute(attributeParams);

            const peer = CoreAddress.from("address");
            const sourceReference = CoreId.from("aSourceReferenceId");

            const forwardedAttribute = await consumptionController.attributes.addForwardingDetailsToAttribute(attribute, peer, sourceReference);
            mockEventBus.expectLastPublishedEvent(AttributeForwardingDetailsChangedEvent, forwardedAttribute);
        });

        test("should throw trying to add ForwardingDetails to an Attribute if it is already forwarded", async function () {
            const attributeParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: testAccount.identity.address
                })
            };
            const attribute = await consumptionController.attributes.createOwnIdentityAttribute(attributeParams);
            await consumptionController.attributes.addForwardingDetailsToAttribute(attribute, CoreAddress.from("peer"), CoreId.from("aSourceReferenceId"));

            await expect(consumptionController.attributes.addForwardingDetailsToAttribute(attribute, CoreAddress.from("peer"), CoreId.from("aSourceReferenceId"))).rejects.toThrow(
                "error.consumption.attributes.alreadyForwarded"
            );
        });

        test("should allow to add ForwardingDetails to an Attribute if it is already forwarded but DeletedByRecipient", async function () {
            const attributeParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: testAccount.identity.address
                })
            };
            const attribute = await consumptionController.attributes.createOwnIdentityAttribute(attributeParams);
            await consumptionController.attributes.addForwardingDetailsToAttribute(attribute, CoreAddress.from("peer"), CoreId.from("aSourceReferenceId"));

            const deletionInfo = EmittedAttributeDeletionInfo.from({
                deletionStatus: EmittedAttributeDeletionStatus.DeletedByRecipient,
                deletionDate: CoreDate.utc().subtract({ days: 1 })
            });
            await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(attribute, deletionInfo, CoreAddress.from("peer"));

            const updatedAttribute = await consumptionController.attributes.addForwardingDetailsToAttribute(attribute, CoreAddress.from("peer"), CoreId.from("aSourceReferenceId"));
            expect(updatedAttribute.numberOfForwards).toBe(2);
        });

        test("should updated a ForwardingDetails of an Attribute if it is already forwarded but ToBeDeletedByRecipient", async function () {
            const attributeParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: testAccount.identity.address
                })
            };
            const attribute = await consumptionController.attributes.createOwnIdentityAttribute(attributeParams);
            await consumptionController.attributes.addForwardingDetailsToAttribute(attribute, CoreAddress.from("peer"), CoreId.from("aSourceReferenceId"));

            const deletionInfo = EmittedAttributeDeletionInfo.from({
                deletionStatus: EmittedAttributeDeletionStatus.ToBeDeletedByRecipient,
                deletionDate: CoreDate.utc().add({ days: 1 })
            });
            await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(attribute, deletionInfo, CoreAddress.from("peer"));

            const updatedAttribute = await consumptionController.attributes.addForwardingDetailsToAttribute(attribute, CoreAddress.from("peer"), CoreId.from("aSourceReferenceId"));
            expect(updatedAttribute.numberOfForwards).toBe(1);
        });

        test("should remove a ForwardingDetails from an Attribute", async function () {
            const attributeParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: testAccount.identity.address
                })
            };
            const attribute = await consumptionController.attributes.createOwnIdentityAttribute(attributeParams);

            const peer = CoreAddress.from("address");

            const forwardedAttribute = await consumptionController.attributes.addForwardingDetailsToAttribute(attribute, peer, CoreId.from("aSourceReferenceId"));
            const isForwarded = await consumptionController.attributes.isForwardedTo(forwardedAttribute, peer)
            expect(isForwarded).toBe(true);

            const updatedAttribute = await consumptionController.attributes.removeForwardingDetailsFromAttribute(forwardedAttribute, peer);
            const updatedIsForwarded = await consumptionController.attributes.isForwardedTo(updatedAttribute, peer)
            expect(updatedIsForwarded).toBe(false);
        });

        test("should publish an event removing a ForwardingDetails from an Attribute", async function () {
            const attributeParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: testAccount.identity.address
                })
            };
            const attribute = await consumptionController.attributes.createOwnIdentityAttribute(attributeParams);

            const peer = CoreAddress.from("address");
            const forwardedAttribute = await consumptionController.attributes.addForwardingDetailsToAttribute(attribute, peer, CoreId.from("aSourceReferenceId"));
            mockEventBus.clearPublishedEvents();

            const updatedAttribute = await consumptionController.attributes.removeForwardingDetailsFromAttribute(forwardedAttribute, peer);
            mockEventBus.expectLastPublishedEvent(AttributeForwardingDetailsChangedEvent, updatedAttribute);
        });

        test("should not change Attribute trying to remove a ForwardingDetails from an Attribute without ForwardingDetails", async function () {
            const attributeParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: testAccount.identity.address
                })
            };
            const attributeWithoutForwardingDetails = await consumptionController.attributes.createOwnIdentityAttribute(attributeParams);

            const peer = CoreAddress.from("address");
            const unchangedAttribute = await consumptionController.attributes.removeForwardingDetailsFromAttribute(attributeWithoutForwardingDetails, peer);
            expect(unchangedAttribute).toStrictEqual(attributeWithoutForwardingDetails);
        });
    });

    describe("query Attributes", function () {
        test("should allow to query RelationshipAttributes with empty owner", async function () {
            const relationshipAttributeParams = {
                content: RelationshipAttribute.from({
                    key: "aKey",
                    value: {
                        "@type": "ProprietaryString",
                        value: "aStringValue",
                        title: "aTitle"
                    },
                    owner: testAccount.identity.address,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                sourceReference: CoreId.from("aSourceReferenceId"),
                peer: CoreAddress.from("peer")
            };
            await consumptionController.attributes.createOwnRelationshipAttribute(relationshipAttributeParams);

            const query: IRelationshipAttributeQuery = {
                key: "aKey",
                owner: CoreAddress.from(""),
                attributeCreationHints: {
                    valueType: "ProprietaryString",
                    title: "aTitle",
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }
            };

            const attribute = await consumptionController.attributes.executeRelationshipAttributeQuery(query);
            expect(attribute).toBeDefined();
        });

        test("should allow to query public RelationshipAttributes", async function () {
            const relationshipAttributeParams = {
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    owner: testAccount.identity.address,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                sourceReference: CoreId.from("aSourceReferenceId"),
                peer: CoreAddress.from("peer")
            };
            await consumptionController.attributes.createOwnRelationshipAttribute(relationshipAttributeParams);

            const query: IRelationshipAttributeQuery = {
                key: "customerId",
                owner: testAccount.identity.address,
                attributeCreationHints: {
                    valueType: "ProprietaryString",
                    title: "someHintTitle",
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }
            };

            const attribute = await consumptionController.attributes.executeRelationshipAttributeQuery(query);
            expect(attribute).toBeDefined();
            expect(attribute!.content).toBeInstanceOf(RelationshipAttribute);
            expect((attribute!.content as RelationshipAttribute).key).toBe("customerId");
        });

        test("should allow to query protected RelationshipAttributes", async function () {
            const relationshipAttributeParams = {
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    owner: testAccount.identity.address,
                    confidentiality: RelationshipAttributeConfidentiality.Protected
                }),
                sourceReference: CoreId.from("aSourceReferenceId"),
                peer: CoreAddress.from("peer")
            };
            await consumptionController.attributes.createOwnRelationshipAttribute(relationshipAttributeParams);

            const query: IRelationshipAttributeQuery = {
                key: "customerId",
                owner: testAccount.identity.address,
                attributeCreationHints: {
                    valueType: "ProprietaryString",
                    title: "someHintTitle",
                    confidentiality: RelationshipAttributeConfidentiality.Protected
                }
            };

            const attribute = await consumptionController.attributes.executeRelationshipAttributeQuery(query);
            expect(attribute).toBeDefined();
            expect(attribute!.content).toBeInstanceOf(RelationshipAttribute);
            expect((attribute!.content as RelationshipAttribute).key).toBe("customerId");
        });

        test("should not allow to query private RelationshipAttributes", async function () {
            const relationshipAttributeParams = {
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    owner: testAccount.identity.address,
                    confidentiality: RelationshipAttributeConfidentiality.Private
                }),
                sourceReference: CoreId.from("aSourceReferenceId"),
                peer: CoreAddress.from("peer")
            };
            await consumptionController.attributes.createOwnRelationshipAttribute(relationshipAttributeParams);

            const query: IRelationshipAttributeQuery = {
                key: "customerId",
                owner: testAccount.identity.address,
                attributeCreationHints: {
                    valueType: "ProprietaryString",
                    title: "someHintTitle",
                    confidentiality: RelationshipAttributeConfidentiality.Private
                }
            };

            const attribute = await consumptionController.attributes.executeRelationshipAttributeQuery(query);
            expect(attribute).toBeUndefined();
        });

        test("should query RelationshipAttributes using the ThirdPartyRelationshipAttributeQuery", async function () {
            const relationshipAttribute = await consumptionController.attributes.createPeerRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    owner: CoreAddress.from("peerAddress"),
                    confidentiality: RelationshipAttributeConfidentiality.Protected
                }),
                peer: CoreAddress.from("peerAddress"),
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            const attributes = await consumptionController.attributes.executeThirdPartyRelationshipAttributeQuery({
                key: "customerId",
                owner: ThirdPartyRelationshipAttributeQueryOwner.ThirdParty,
                thirdParty: [CoreAddress.from("peerAddress")]
            });
            expect(attributes).toHaveLength(1);
            expect(attributes[0].id.toString()).toStrictEqual(relationshipAttribute.id.toString());
        });

        test("should not query RelationshipAttributes with confidentiality set to `Private` using the ThirdPartyRelationshipAttributeQuery", async function () {
            await consumptionController.attributes.createPeerRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    owner: CoreAddress.from("peerAddress"),
                    confidentiality: RelationshipAttributeConfidentiality.Private
                }),
                peer: CoreAddress.from("peerAddress"),
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            const attributes = await consumptionController.attributes.executeThirdPartyRelationshipAttributeQuery({
                key: "customerId",
                owner: ThirdPartyRelationshipAttributeQueryOwner.Empty,
                thirdParty: [CoreAddress.from("peerAddress")]
            });
            expect(attributes).toHaveLength(0);
        });

        test("should not query RelationshipAttributes with not matching key using the ThirdPartyRelationshipAttributeQuery", async function () {
            await consumptionController.attributes.createPeerRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    owner: CoreAddress.from("peerAddress"),
                    confidentiality: RelationshipAttributeConfidentiality.Private
                }),
                peer: CoreAddress.from("peerAddress"),
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            const attributes = await consumptionController.attributes.executeThirdPartyRelationshipAttributeQuery({
                key: "notMatchingKey",
                owner: ThirdPartyRelationshipAttributeQueryOwner.Empty,
                thirdParty: [CoreAddress.from("peerAddress")]
            });
            expect(attributes).toHaveLength(0);
        });

        test("can call executeThirdPartyRelationshipAttributeQuery with ThirdPartyRelationshipAttributeQueryOwner.Recipient", async function () {
            const recipient = testAccount.identity.address;
            await consumptionController.attributes.createOwnRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "aKey",
                    value: {
                        "@type": "ProprietaryString",
                        value: "aStringValue",
                        title: "aTitle"
                    },
                    owner: recipient,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                peer: CoreAddress.from("thirdPartyAddress"),
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            const attributes = await consumptionController.attributes.executeThirdPartyRelationshipAttributeQuery({
                key: "aKey",
                owner: ThirdPartyRelationshipAttributeQueryOwner.Recipient,
                thirdParty: [CoreAddress.from("thirdPartyAddress")]
            });
            expect(attributes).toHaveLength(1);
        });

        test("can call executeThirdPartyRelationshipAttributeQuery with ThirdPartyRelationshipAttributeQueryOwner.ThirdParty", async function () {
            await consumptionController.attributes.createPeerRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "aKey",
                    value: {
                        "@type": "ProprietaryString",
                        value: "aStringValue",
                        title: "aTitle"
                    },
                    owner: CoreAddress.from("thirdPartyAddress"),
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                peer: CoreAddress.from("thirdPartyAddress"),
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            const attributes = await consumptionController.attributes.executeThirdPartyRelationshipAttributeQuery({
                key: "aKey",
                owner: ThirdPartyRelationshipAttributeQueryOwner.ThirdParty,
                thirdParty: [CoreAddress.from("thirdPartyAddress")]
            });
            expect(attributes).toHaveLength(1);
        });

        test("can call executeThirdPartyRelationshipAttributeQuery with ThirdPartyRelationshipAttributeQueryOwner.Empty", async function () {
            const recipient = testAccount.identity.address;
            await consumptionController.attributes.createOwnRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "aKey",
                    value: {
                        "@type": "ProprietaryString",
                        value: "aStringValue",
                        title: "aTitle"
                    },
                    owner: recipient,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                peer: CoreAddress.from("thirdPartyAddress"),
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            await consumptionController.attributes.createThirdPartyRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "aKey",
                    value: {
                        "@type": "ProprietaryString",
                        value: "aStringValue",
                        title: "aTitle"
                    },
                    owner: CoreAddress.from("thirdPartyAddress"),
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                peer: CoreAddress.from("anotherThirdPartyAddress"),
                sourceReference: CoreId.from("aSourceReferenceId"),
                initialAttributePeer: CoreAddress.from("thirdPartyAddress"),
                id: CoreId.from("aThirdPartyRelationshipAttributeId")
            });

            await consumptionController.attributes.createThirdPartyRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "aKey",
                    value: {
                        "@type": "ProprietaryString",
                        value: "aStringValue",
                        title: "aTitle"
                    },
                    owner: CoreAddress.from("uninvolvedThirdPartyAddress"),
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                peer: CoreAddress.from("thirdPartyAddress"),
                sourceReference: CoreId.from("aSourceReferenceId"),
                initialAttributePeer: CoreAddress.from("uninvolvedThirdPartyAddress"),
                id: CoreId.from("anotherThirdPartyRelationshipAttributeId")
            });

            const attributes = await consumptionController.attributes.executeThirdPartyRelationshipAttributeQuery({
                key: "aKey",
                owner: ThirdPartyRelationshipAttributeQueryOwner.Empty,
                thirdParty: [CoreAddress.from("thirdPartyAddress"), CoreAddress.from("anotherThirdPartyAddress")]
            });
            expect(attributes).toHaveLength(2);
        });

        test("should allow to query IdentityAttributes", async function () {
            const ownIdentityAttributeParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: testAccount.identity.address
                })
            };
            const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute(ownIdentityAttributeParams);

            const relationshipAttributeParams = {
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer Id"
                    },
                    owner: testAccount.identity.address,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                sourceReference: CoreId.from("aSourceReferenceId"),
                peer: CoreAddress.from("peer")
            };
            const relationshipAttribute = await consumptionController.attributes.createOwnRelationshipAttribute(relationshipAttributeParams);

            const query: IIdentityAttributeQuery = {
                valueType: "Nationality"
            };

            const attributes = await consumptionController.attributes.executeIdentityAttributeQuery(query);
            const attributesId = attributes.map((v) => v.id.toString());
            expect(attributesId).not.toContain(relationshipAttribute.id.toString());
            expect(attributesId).toContain(ownIdentityAttribute.id.toString());
        });

        test("should successfully execute IQL queries only with OwnIdentityAttributes", async function () {
            const ownIdentityAttributeParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: testAccount.identity.address
                })
            };
            const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute(ownIdentityAttributeParams);
            await consumptionController.attributes.addForwardingDetailsToAttribute(ownIdentityAttribute, CoreAddress.from("a-fake-peer"), CoreId.from("a-fake-reference"));

            const iqlQuery: IIQLQuery = { queryString: "Nationality=DE" };
            const matchedAttributes = await consumptionController.attributes.executeIQLQuery(iqlQuery);
            expect(matchedAttributes).toHaveLength(1);
            const matchedAttributeIds = matchedAttributes.map((v) => v.id.toString());
            expect(matchedAttributeIds).toContain(ownIdentityAttribute.id.toString());
        });

        test("should only return OwnIdentityAttributes on IdentityAttributeQuery", async function () {
            const ownIdentityAttributeParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "DisplayName",
                        value: "Dis Play"
                    },
                    owner: testAccount.identity.address
                })
            };
            const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute(ownIdentityAttributeParams);

            const relationshipAttributeParams = {
                content: RelationshipAttribute.from({
                    key: "displayName",
                    value: {
                        "@type": "ProprietaryString",
                        title: "aTitle",
                        value: "DE"
                    },
                    owner: testAccount.identity.address,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                sourceReference: CoreId.from("aSourceReferenceId"),
                peer: CoreAddress.from("peer")
            };
            const relationshipAttribute = await consumptionController.attributes.createOwnRelationshipAttribute(relationshipAttributeParams);

            const peerIdentityAttributeParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "DisplayName",
                        value: "DE"
                    },
                    owner: CoreAddress.from("peer")
                }),
                sourceReference: CoreId.from("aSourceReferenceId"),
                peer: CoreAddress.from("peer"),
                id: CoreId.from("aPeerIdentityAttributeId")
            };
            const peerAttribute = await consumptionController.attributes.createPeerIdentityAttribute(peerIdentityAttributeParams);

            const query: IIdentityAttributeQuery = {
                valueType: "DisplayName"
            };

            const attributes = await consumptionController.attributes.executeIdentityAttributeQuery(query);
            const attributesId = attributes.map((v) => v.id.toString());
            expect(attributes).toHaveLength(1);
            expect(attributesId).not.toContain(relationshipAttribute.id.toString());
            expect(attributesId).not.toContain(peerAttribute.id.toString());
            expect(attributesId).toContain(ownIdentityAttribute.id.toString());
        });
    });

    describe("delete Attributes", function () {
        test("should delete an OwnIdentityAttribute", async function () {
            const attributeParams = {
                content: IdentityAttribute.from({
                    value: EMailAddress.from({
                        value: "my@email.address"
                    }),
                    owner: consumptionController.accountController.identity.address
                })
            };
            const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute(attributeParams);

            const createdAttribute = await consumptionController.attributes.getLocalAttribute(ownIdentityAttribute.id);
            expect(createdAttribute).toBeDefined();
            expect(createdAttribute).toStrictEqual(ownIdentityAttribute);

            await consumptionController.attributes.deleteAttribute(ownIdentityAttribute.id);

            const deletedAttribute = await consumptionController.attributes.getLocalAttribute(ownIdentityAttribute.id);
            expect(deletedAttribute).toBeUndefined();

            mockEventBus.expectLastPublishedEvent(AttributeDeletedEvent);
        });

        test("should delete RelationshipAttributes exchanged with peer", async function () {
            const ownRelationshipAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "aKey",
                    value: {
                        "@type": "ProprietaryString",
                        value: "Some value",
                        title: "Some title"
                    },
                    owner: consumptionController.accountController.identity.address,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                peer: CoreAddress.from("peerAddress"),
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            const peerRelationshipAttribute = await consumptionController.attributes.createPeerRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "aKey",
                    value: {
                        "@type": "ProprietaryString",
                        value: "Some value",
                        title: "Some title"
                    },
                    owner: CoreAddress.from("peerAddress"),
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                peer: CoreAddress.from("peerAddress"),
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            await consumptionController.attributes.deleteAttributesExchangedWithPeer(CoreAddress.from("peerAddress"));
            const ownAttribute = await consumptionController.attributes.getLocalAttribute(ownRelationshipAttribute.id);
            const peerAttribute = await consumptionController.attributes.getLocalAttribute(peerRelationshipAttribute.id);
            expect(ownAttribute).toBeUndefined();
            expect(peerAttribute).toBeUndefined();
        });

        describe("should validate and execute full Attribute deletion process", function () {
            let predecessorOwnIdentityAttribute: OwnIdentityAttribute;
            let successorOwnIdentityAttribute: OwnIdentityAttribute;

            beforeEach(async () => {
                predecessorOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: EMailAddress.from({
                            value: "my@email.address"
                        }),
                        owner: consumptionController.accountController.identity.address
                    })
                });

                const ownIdentityAttributeSuccessorParams = OwnIdentityAttributeSuccessorParams.from({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "EMailAddress",
                            value: "my-new@email.address"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                ({ predecessor: predecessorOwnIdentityAttribute, successor: successorOwnIdentityAttribute } = await consumptionController.attributes.succeedOwnIdentityAttribute(
                    predecessorOwnIdentityAttribute,
                    ownIdentityAttributeSuccessorParams
                ));
            });

            test("should return validation success for full attribute deletion process of valid succeeded OwnIdentityAttribute", async function () {
                const result = await consumptionController.attributes.validateFullAttributeDeletionProcess(successorOwnIdentityAttribute.id);
                expect(result.isSuccess()).toBe(true);
            });

            test("should return validation error for full attribute deletion process of Attribute with invalid succeededBy field", async function () {
                const invalidPredecessor = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: EMailAddress.from({
                            value: "my@email.address"
                        }),
                        owner: consumptionController.accountController.identity.address
                    })
                });
                invalidPredecessor.succeededBy = CoreId.from("invalidSuccessorId");
                await consumptionController.attributes.updateAttributeUnsafe(invalidPredecessor);

                const result = await consumptionController.attributes.validateFullAttributeDeletionProcess(invalidPredecessor.id);
                expect(result).errorValidationResult({ message: "The successor does not exist.", code: "error.consumption.attributes.successorDoesNotExist" });
            });

            test("should delete an Attribute", async function () {
                const attributeBeforeDeletion = await consumptionController.attributes.getLocalAttribute(successorOwnIdentityAttribute.id);
                expect(attributeBeforeDeletion).toBeDefined();

                await consumptionController.attributes.executeFullAttributeDeletionProcess(successorOwnIdentityAttribute);
                const result = await consumptionController.attributes.getLocalAttribute(successorOwnIdentityAttribute.id);
                expect(result).toBeUndefined();
            });

            test("should detach successor of deleted Attribute", async function () {
                const successorBeforeDeletion = await consumptionController.attributes.getLocalAttribute(successorOwnIdentityAttribute.id);
                expect(successorBeforeDeletion!.succeeds).toStrictEqual(predecessorOwnIdentityAttribute.id);

                await consumptionController.attributes.executeFullAttributeDeletionProcess(predecessorOwnIdentityAttribute);
                const updatedSuccessorOwnIdentityAttribute = await consumptionController.attributes.getLocalAttribute(successorOwnIdentityAttribute.id);
                expect(updatedSuccessorOwnIdentityAttribute!.succeeds).toBeUndefined();
            });

            test("should delete predecessors of deleted Attribute", async function () {
                const predecessorBeforeDeletion = await consumptionController.attributes.getLocalAttribute(predecessorOwnIdentityAttribute.id);
                expect(JSON.stringify(predecessorBeforeDeletion)).toStrictEqual(JSON.stringify(predecessorOwnIdentityAttribute));

                await consumptionController.attributes.executeFullAttributeDeletionProcess(successorOwnIdentityAttribute);
                const result = await consumptionController.attributes.getLocalAttribute(predecessorOwnIdentityAttribute.id);
                expect(result).toBeUndefined();
            });

            test("should change default from deleted Attribute to newest of the same value type if another exists and setDefaultOwnIdentityAttributes is true", async function () {
                const defaultOwnIdentityAttribute = await appConsumptionController.attributes.createOwnIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: EMailAddress.from({
                            value: "my@email.address"
                        }),
                        owner: appConsumptionController.accountController.identity.address
                    })
                });

                const otherOwnIdentityAttribute = await appConsumptionController.attributes.createOwnIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: EMailAddress.from({
                            value: "my2@email.address"
                        }),
                        owner: appConsumptionController.accountController.identity.address
                    })
                });

                const otherNewerOwnIdentityAttribute = await appConsumptionController.attributes.createOwnIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: EMailAddress.from({
                            value: "my3@email.address"
                        }),
                        owner: appConsumptionController.accountController.identity.address
                    })
                });

                expect(defaultOwnIdentityAttribute.isDefault).toBe(true);
                expect(otherOwnIdentityAttribute.isDefault).toBeUndefined();
                expect(otherNewerOwnIdentityAttribute.isDefault).toBeUndefined();

                await appConsumptionController.attributes.executeFullAttributeDeletionProcess(defaultOwnIdentityAttribute);
                const updatedOtherNewerOwnIdentityAttribute = await appConsumptionController.attributes.getLocalAttribute(otherNewerOwnIdentityAttribute.id);
                expect((updatedOtherNewerOwnIdentityAttribute as OwnIdentityAttribute).isDefault).toBe(true);
            });

            test("should not set a default if the deleted default Attribute had predecessors but no other candidate exists and setDefaultOwnIdentityAttributes is true", async function () {
                const predecessorOwnIdentityAttribute = await appConsumptionController.attributes.createOwnIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: EMailAddress.from({
                            value: "my@email.address"
                        }),
                        owner: appConsumptionController.accountController.identity.address
                    })
                });

                const ownIdentityAttributeSuccessorParams = OwnIdentityAttributeSuccessorParams.from({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "EMailAddress",
                            value: "my-new@email.address"
                        },
                        owner: appConsumptionController.accountController.identity.address
                    })
                });
                const successionResult = await appConsumptionController.attributes.succeedOwnIdentityAttribute(
                    predecessorOwnIdentityAttribute,
                    ownIdentityAttributeSuccessorParams
                );
                const { successor: successorOwnIdentityAttribute } = successionResult;

                expect(successorOwnIdentityAttribute.isDefault).toBe(true);
                await appConsumptionController.attributes.executeFullAttributeDeletionProcess(successorOwnIdentityAttribute);

                const defaultAttributes = await appConsumptionController.attributes.getLocalAttributes({ isDefault: "true" });
                expect(defaultAttributes).toHaveLength(0);
            });
        });
    });

    describe("succeed Attributes", function () {
        describe("Common validator", function () {
            test("should catch a forbidden character in the successor", async function () {
                const predecessor = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "GivenName",
                            value: "aGivenName"
                        },
                        owner: consumptionController.accountController.identity.address,
                        tags: ["x:aTag"]
                    })
                });

                const successorData = OwnIdentityAttributeSuccessorParams.from({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "GivenName",
                            value: "aGivenName😀"
                        },
                        owner: consumptionController.accountController.identity.address,
                        tags: ["x:aTag"]
                    })
                });

                const validationResult = await consumptionController.attributes.validateOwnIdentityAttributeSuccession(predecessor, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.forbiddenCharactersInAttribute"
                });
            });

            test("should catch if content doesn't change", async function () {
                const predecessor = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address,
                        tags: ["x:aTag"]
                    })
                });

                const successorData = OwnIdentityAttributeSuccessorParams.from({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address,
                        tags: ["x:aTag"]
                    })
                });

                const validationResult = await consumptionController.attributes.validateOwnIdentityAttributeSuccession(predecessor, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.successionMustChangeContent"
                });
            });

            test("should catch if the successor attribute already exist if an explicit id is provided", async function () {
                const predecessor = await consumptionController.attributes.createPeerIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("peer")
                    }),
                    sourceReference: CoreId.from("aSourceReferenceId"),
                    peer: CoreAddress.from("peer"),
                    id: CoreId.from("aPredecessorId")
                });
                await consumptionController.attributes.createPeerIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: CoreAddress.from("peer")
                    }),
                    sourceReference: CoreId.from("anotherSourceReferenceId"),
                    peer: CoreAddress.from("peer"),
                    id: CoreId.from("aSuccessorId")
                });
                const successorData = PeerIdentityAttributeSuccessorParams.from({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: consumptionController.accountController.identity.address
                    }),
                    sourceReference: CoreId.from("aFurtherSourceReferenceId"),
                    id: CoreId.from("aSuccessorId")
                });

                const validationResult = await consumptionController.attributes.validatePeerIdentityAttributeSuccession(predecessor, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.successorMustNotYetExist"
                });
            });

            test("should catch if the predecessor does not exist", async function () {
                const notExistingPredecessor = OwnIdentityAttribute.from({
                    id: CoreId.from("notExistingPredecessorId"),
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address
                    }),
                    createdAt: CoreDate.utc()
                });

                const successorData = OwnIdentityAttributeSuccessorParams.from({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });

                const validationResult = await consumptionController.attributes.validateOwnIdentityAttributeSuccession(notExistingPredecessor, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.predecessorDoesNotExist"
                });
            });

            test("should catch if the predecessor already has a successor", async function () {
                const predecessor = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                predecessor.succeededBy = CoreId.from("successorId");
                await consumptionController.attributes.updateAttributeUnsafe(predecessor);

                const successorData = OwnIdentityAttributeSuccessorParams.from({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });

                const validationResult = await consumptionController.attributes.validateOwnIdentityAttributeSuccession(predecessor, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.cannotSucceedAttributesWithASuccessor"
                });
            });

            test("should catch attempted change of owner", async function () {
                const predecessor = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                const successorData = OwnIdentityAttributeSuccessorParams.from({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: CoreAddress.from("differentAddress")
                    })
                });

                const validationResult = await consumptionController.attributes.validateOwnIdentityAttributeSuccession(predecessor, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.successionMustNotChangeOwner"
                });
            });

            test("should catch attempted change of value type", async function () {
                const predecessor = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "BirthName",
                            value: "aBirthName"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                const successorData = OwnIdentityAttributeSuccessorParams.from({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "BirthPlace",
                            city: "aCity",
                            country: "DE"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });

                const validationResult = await consumptionController.attributes.validateOwnIdentityAttributeSuccession(predecessor, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.successionMustNotChangeValueType"
                });
            });

            test("should catch if the predecessor is a PeerIdentityAttribute with deletion status DeletedByEmitter", async function () {
                const predecessor = await consumptionController.attributes.createPeerIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("peer")
                    }),
                    peer: CoreAddress.from("peer"),
                    sourceReference: CoreId.from("aSourceReferenceId"),
                    id: CoreId.from("aPredecessorId")
                });
                await consumptionController.attributes.setPeerDeletionInfoOfReceivedAttribute(
                    predecessor,
                    ReceivedAttributeDeletionInfo.from({
                        deletionStatus: ReceivedAttributeDeletionStatus.DeletedByEmitter,
                        deletionDate: CoreDate.utc().subtract({ days: 1 })
                    })
                );

                const successorData = PeerIdentityAttributeSuccessorParams.from({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: CoreAddress.from("peer")
                    }),
                    sourceReference: CoreId.from("anotherSourceReferenceId"),
                    id: CoreId.from("aSuccessorId")
                });

                const validationResult = await consumptionController.attributes.validatePeerIdentityAttributeSuccession(predecessor, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.cannotSucceedSharedAttributesDeletedByPeer"
                });
            });

            test("should allow succession if the predecessor is a PeerIdentityAttribute with deletion status ToBeDeleted", async function () {
                const predecessor = await consumptionController.attributes.createPeerIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("peer")
                    }),
                    peer: CoreAddress.from("peer"),
                    sourceReference: CoreId.from("aSourceReferenceId"),
                    id: CoreId.from("aPredecessorId")
                });
                await consumptionController.attributes.setPeerDeletionInfoOfReceivedAttribute(
                    predecessor,
                    ReceivedAttributeDeletionInfo.from({
                        deletionStatus: ReceivedAttributeDeletionStatus.ToBeDeleted,
                        deletionDate: CoreDate.utc().add({ days: 1 })
                    })
                );

                const successorData = PeerIdentityAttributeSuccessorParams.from({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: CoreAddress.from("peer")
                    }),
                    sourceReference: CoreId.from("anotherSourceReferenceId"),
                    id: CoreId.from("aSuccessorId")
                });

                const validationResult = await consumptionController.attributes.validatePeerIdentityAttributeSuccession(predecessor, successorData);
                expect(validationResult.isSuccess()).toBe(true);
            });

            test("should allow succession if the predecessor is an OwnIdentityAttribute and has a deletionInfo", async function () {
                const predecessor = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                await consumptionController.attributes.addForwardingDetailsToAttribute(predecessor, CoreAddress.from("peer"), CoreId.from("aSourceReferenceId"));
                await consumptionController.attributes.setForwardedDeletionInfoOfAttribute(
                    predecessor,
                    EmittedAttributeDeletionInfo.from({
                        deletionStatus: EmittedAttributeDeletionStatus.ToBeDeletedByRecipient,
                        deletionDate: CoreDate.utc().subtract({ days: 1 })
                    }),
                    CoreAddress.from("peer")
                );

                const successorData = OwnIdentityAttributeSuccessorParams.from({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });

                const validationResult = await consumptionController.attributes.validateOwnIdentityAttributeSuccession(predecessor, successorData);
                expect(validationResult.isSuccess()).toBe(true);
            });
        });

        describe("Happy paths for Attribute successions", function () {
            test("should succeed an OwnIdentityAttribute", async function () {
                const predecessor = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                const successorParams = OwnIdentityAttributeSuccessorParams.from({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });

                const { predecessor: updatedPredecessor, successor } = await consumptionController.attributes.succeedOwnIdentityAttribute(predecessor, successorParams);
                expect(successor).toBeDefined();
                expect(updatedPredecessor).toBeDefined();
                expect(predecessor.id.equals(updatedPredecessor.id)).toBe(true);
                expect(updatedPredecessor.succeededBy!.equals(successor.id)).toBe(true);
                expect(successor.succeeds!.equals(updatedPredecessor.id)).toBe(true);
                expect((predecessor.content.value.toJSON() as any).value).toBe("DE");
                expect((successor.content.value.toJSON() as any).value).toBe("US");
            });

            test("should trim whitespace when succeeding an OwnIdentityAttribute", async function () {
                const predecessor = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "GivenName",
                            value: "    aGivenName  "
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                const successorParams = OwnIdentityAttributeSuccessorParams.from({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "GivenName",
                            value: "    anotherGivenName    "
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });

                const { successor } = await consumptionController.attributes.succeedOwnIdentityAttribute(predecessor, successorParams);
                expect(successor).toBeDefined();
                expect((successor.content.value.toJSON() as any).value).toBe("anotherGivenName");
            });

            test("should succeed an OwnIdentityAttribute updating tags but not the value", async function () {
                const predecessor = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address,
                        tags: ["x:aTag"]
                    })
                });

                const successorParams = OwnIdentityAttributeSuccessorParams.from({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address,
                        tags: ["x:aTag", "x:anotherTag"]
                    })
                });

                const { predecessor: updatedPredecessor, successor } = await consumptionController.attributes.succeedOwnIdentityAttribute(predecessor, successorParams);
                expect(successor).toBeDefined();
                expect(updatedPredecessor).toBeDefined();
                expect(predecessor.id.equals(updatedPredecessor.id)).toBe(true);
                expect(updatedPredecessor.succeededBy!.equals(successor.id)).toBe(true);
                expect(successor.succeeds!.equals(updatedPredecessor.id)).toBe(true);
                expect((updatedPredecessor.content.value.toJSON() as any).value).toBe("DE");
                expect((successor.content.value.toJSON() as any).value).toBe("DE");
                expect(updatedPredecessor.content.tags).toStrictEqual(["x:aTag"]);
                expect(successor.content.tags).toStrictEqual(["x:aTag", "x:anotherTag"]);
            });

            test("should make successor default succeeding a default OwnIdentityAttribute", async function () {
                const predecessor = await appConsumptionController.attributes.createOwnIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: appConsumptionController.accountController.identity.address
                    })
                });
                expect(predecessor.isDefault).toBe(true);

                const successorParams = OwnIdentityAttributeSuccessorParams.from({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: appConsumptionController.accountController.identity.address
                    })
                });

                const { predecessor: updatedPredecessor, successor } = await appConsumptionController.attributes.succeedOwnIdentityAttribute(predecessor, successorParams);
                expect(successor.isDefault).toBe(true);
                expect(updatedPredecessor.isDefault).toBeUndefined();
            });

            test("should succeed a forwarded OwnIdentityAttribute", async function () {
                const predecessorOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                const predecessorForwardedOwnIdentityAttribute = await consumptionController.attributes.addForwardingDetailsToAttribute(
                    predecessorOwnIdentityAttribute,
                    CoreAddress.from("peer"),
                    CoreId.from("aSourceReferenceId")
                );
                const successorOwnIdentityAttributeParams = OwnIdentityAttributeSuccessorParams.from({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                const { successor: successorOwnIdentityAttribute } = await consumptionController.attributes.succeedOwnIdentityAttribute(
                    predecessorForwardedOwnIdentityAttribute,
                    successorOwnIdentityAttributeParams
                );

                expect(predecessorForwardedOwnIdentityAttribute).toBeDefined();
                expect(successorOwnIdentityAttribute).toBeDefined();
                expect(predecessorForwardedOwnIdentityAttribute.succeededBy!.equals(successorOwnIdentityAttribute.id)).toBe(true);
                expect(successorOwnIdentityAttribute.succeeds!.equals(predecessorForwardedOwnIdentityAttribute.id)).toBe(true);
                expect((successorOwnIdentityAttribute.content.value.toJSON() as any).value).toBe("US");
            });

            test("should succeed a PeerIdentityAttribute", async function () {
                const predecessor = await consumptionController.attributes.createPeerIdentityAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("peer")
                    }),
                    peer: CoreAddress.from("peer"),
                    sourceReference: CoreId.from("aSourceReferenceId"),
                    id: CoreId.from("aPeerIdentityAttributeId")
                });
                const successorParams: IPeerIdentityAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: CoreAddress.from("peer")
                    }),
                    id: CoreId.from("aPeerIdentityAttributeSuccessorId"),
                    sourceReference: CoreId.from("anotherSourceReferenceId")
                };

                const { predecessor: updatedPredecessor, successor } = await consumptionController.attributes.succeedPeerIdentityAttribute(predecessor, successorParams);
                expect(successor).toBeDefined();
                expect(updatedPredecessor).toBeDefined();
                expect(predecessor.id.equals(updatedPredecessor.id)).toBe(true);
                expect(updatedPredecessor.succeededBy!.equals(successor.id)).toBe(true);
                expect(successor.succeeds!.equals(updatedPredecessor.id)).toBe(true);
                expect((predecessor.content.value.toJSON() as any).value).toBe("DE");
                expect((successor.content.value.toJSON() as any).value).toBe("US");
            });

            test("should succeed an OwnRelationshipAttribute", async function () {
                const predecessor = await consumptionController.attributes.createOwnRelationshipAttribute({
                    content: RelationshipAttribute.from({
                        key: "customerId",
                        value: {
                            "@type": "ProprietaryString",
                            value: "0815",
                            title: "Customer ID"
                        },
                        owner: consumptionController.accountController.identity.address,
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }),
                    peer: CoreAddress.from("peerAddress"),
                    sourceReference: CoreId.from("aSourceReferenceId")
                });
                const successorParams: IOwnRelationshipAttributeSuccessorParams = {
                    content: RelationshipAttribute.from({
                        key: "customerId",
                        value: {
                            "@type": "ProprietaryString",
                            value: "1337",
                            title: "Customer ID"
                        },
                        owner: consumptionController.accountController.identity.address,
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }),
                    sourceReference: CoreId.from("anotherSourceReferenceId")
                };

                const { predecessor: updatedPredecessor, successor } = await consumptionController.attributes.succeedOwnRelationshipAttribute(predecessor, successorParams);
                expect(successor).toBeDefined();
                expect(updatedPredecessor).toBeDefined();
                expect(predecessor.id.equals(updatedPredecessor.id)).toBe(true);
                expect(updatedPredecessor.succeededBy!.equals(successor.id)).toBe(true);
                expect(successor.succeeds!.equals(updatedPredecessor.id)).toBe(true);
                expect((predecessor.content.value.toJSON() as any).value).toBe("0815");
                expect((successor.content.value.toJSON() as any).value).toBe("1337");
            });

            test("should succeed a PeerRelationshipAttribute", async function () {
                const predecessor = await consumptionController.attributes.createPeerRelationshipAttribute({
                    content: RelationshipAttribute.from({
                        key: "customerId",
                        value: {
                            "@type": "ProprietaryString",
                            value: "0815",
                            title: "Customer ID"
                        },
                        owner: CoreAddress.from("peerAddress"),
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }),
                    peer: CoreAddress.from("peerAddress"),
                    sourceReference: CoreId.from("aSourceReferenceId")
                });
                const successorParams: IPeerRelationshipAttributeSuccessorParams = {
                    content: RelationshipAttribute.from({
                        key: "customerId",
                        value: {
                            "@type": "ProprietaryString",
                            value: "1337",
                            title: "Customer ID"
                        },
                        owner: CoreAddress.from("peerAddress"),
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }),
                    sourceReference: CoreId.from("anotherSourceReferenceId"),

                    id: CoreId.from("aPeerRelationshipAttributeSuccessorId")
                };

                const { predecessor: updatedPredecessor, successor } = await consumptionController.attributes.succeedPeerRelationshipAttribute(predecessor, successorParams);
                expect(successor).toBeDefined();
                expect(updatedPredecessor).toBeDefined();
                expect(predecessor.id.equals(updatedPredecessor.id)).toBe(true);
                expect(updatedPredecessor.succeededBy!.equals(successor.id)).toBe(true);
                expect(successor.succeeds!.equals(updatedPredecessor.id)).toBe(true);
                expect((predecessor.content.value.toJSON() as any).value).toBe("0815");
                expect((successor.content.value.toJSON() as any).value).toBe("1337");
            });

            test("should succeed a ThirdPartyRelationshipAttribute", async function () {
                const predecessor = await consumptionController.attributes.createThirdPartyRelationshipAttribute({
                    content: RelationshipAttribute.from({
                        key: "customerId",
                        value: {
                            "@type": "ProprietaryString",
                            value: "0815",
                            title: "Customer ID"
                        },
                        owner: CoreAddress.from("thirdPartyAddress"),
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }),
                    peer: CoreAddress.from("peerAddress"),
                    sourceReference: CoreId.from("aSourceReferenceId"),
                    initialAttributePeer: CoreAddress.from("thirdPartyAddress"),
                    id: CoreId.from("aThirdPartyRelationshipAttributeId")
                });
                const successorParams: IThirdPartyRelationshipAttributeSuccessorParams = {
                    content: RelationshipAttribute.from({
                        key: "customerId",
                        value: {
                            "@type": "ProprietaryString",
                            value: "1337",
                            title: "Customer ID"
                        },
                        owner: CoreAddress.from("thirdPartyAddress"),
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }),
                    sourceReference: CoreId.from("anotherSourceReferenceId"),
                    id: CoreId.from("aThirdPartyRelationshipAttributeSuccessorId")
                };

                const { predecessor: updatedPredecessor, successor } = await consumptionController.attributes.succeedThirdPartyRelationshipAttribute(predecessor, successorParams);
                expect(successor).toBeDefined();
                expect(updatedPredecessor).toBeDefined();
                expect(predecessor.id.equals(updatedPredecessor.id)).toBe(true);
                expect(updatedPredecessor.succeededBy!.equals(successor.id)).toBe(true);
                expect(successor.succeeds!.equals(updatedPredecessor.id)).toBe(true);
                expect((predecessor.content.value.toJSON() as any).value).toBe("0815");
                expect((successor.content.value.toJSON() as any).value).toBe("1337");
            });
        });
    });

    describe("change default Attributes", function () {
        test("should change default OwnIdentityAttribute if setDefaultOwnIdentityAttributes is true", async function () {
            const firstAttribute = await appConsumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "My default given name"
                    },
                    owner: appConsumptionController.accountController.identity.address
                })
            });

            const secondAttribute = await appConsumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "My other given name"
                    },
                    owner: appConsumptionController.accountController.identity.address
                })
            });
            expect(secondAttribute.isDefault).toBeUndefined();

            const updatedSecondAttribute = await appConsumptionController.attributes.setAsDefaultOwnIdentityAttribute(secondAttribute);
            expect(updatedSecondAttribute.isDefault).toBe(true);

            const updatedFirstAttribute = await appConsumptionController.attributes.getLocalAttribute(firstAttribute.id);
            expect((updatedFirstAttribute as OwnIdentityAttribute).isDefault).toBeUndefined();
        });

        test("should not change default OwnIdentityAttribute if candidate is already default and setDefaultOwnIdentityAttributes is true", async function () {
            const firstAttribute = await appConsumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "My default given name"
                    },
                    owner: appConsumptionController.accountController.identity.address
                })
            });
            expect(firstAttribute.isDefault).toBe(true);
            const updatedFirstAttribute = await appConsumptionController.attributes.setAsDefaultOwnIdentityAttribute(firstAttribute);
            expect(updatedFirstAttribute.isDefault).toBe(true);
        });

        test("should throw an error trying to change the default OwnIdentityAttribute if setDefaultOwnIdentityAttributes is false", async function () {
            const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "My default given name"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            });
            expect(ownIdentityAttribute.isDefault).toBeUndefined();

            await expect(consumptionController.attributes.setAsDefaultOwnIdentityAttribute(ownIdentityAttribute)).rejects.toThrow(
                "error.consumption.attributes.setDefaultOwnIdentityAttributesIsDisabled"
            );
        });
    });

    describe("mark Attributes as read", () => {
        test("should mark an Attribute as read", async () => {
            const attributeParams = {
                content: IdentityAttribute.from({
                    value: DisplayName.from({ value: "aDisplayName" }),
                    owner: consumptionController.accountController.identity.address
                })
            };
            const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute(attributeParams);
            expect(ownIdentityAttribute.wasViewedAt).toBeUndefined();

            const timeBeforeRead = CoreDate.utc();
            const updatedOwnIdentityAttribute = await consumptionController.attributes.markAttributeAsViewed(ownIdentityAttribute.id);
            const timeAfterRead = CoreDate.utc();

            expect(updatedOwnIdentityAttribute.wasViewedAt).toBeDefined();
            expect(updatedOwnIdentityAttribute.wasViewedAt!.isSameOrAfter(timeBeforeRead)).toBe(true);
            expect(updatedOwnIdentityAttribute.wasViewedAt!.isSameOrBefore(timeAfterRead)).toBe(true);
        });

        test("should not change wasViewedAt of a viewed Attribute", async function () {
            const attributeParams = {
                content: IdentityAttribute.from({
                    value: DisplayName.from({ value: "aDisplayName" }),
                    owner: consumptionController.accountController.identity.address
                })
            };
            const ownIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute(attributeParams);

            const updatedOwnIdentityAttribute = await consumptionController.attributes.markAttributeAsViewed(ownIdentityAttribute.id);
            const firstViewedAt = updatedOwnIdentityAttribute.wasViewedAt;

            const unchangedOwnIdentityAttribute = await consumptionController.attributes.markAttributeAsViewed(ownIdentityAttribute.id);
            expect(unchangedOwnIdentityAttribute.wasViewedAt).toBeDefined();
            expect(unchangedOwnIdentityAttribute.wasViewedAt!.equals(firstViewedAt!)).toBe(true);
        });
    });

    describe("get Attributes", function () {
        beforeEach(async function () {
            await consumptionController.attributes.createOwnRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "notTechnical",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    isTechnical: false,
                    owner: testAccount.identity.address,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                sourceReference: CoreId.from("aSourceReferenceId"),
                peer: CoreAddress.from("peer")
            });

            await consumptionController.attributes.createOwnRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "isTechnicalNotDefined",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    owner: testAccount.identity.address,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                sourceReference: CoreId.from("aSourceReferenceId"),
                peer: CoreAddress.from("peer")
            });

            await consumptionController.attributes.createOwnRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "technical",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    isTechnical: true,
                    owner: testAccount.identity.address,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                sourceReference: CoreId.from("aSourceReferenceId"),
                peer: CoreAddress.from("peer")
            });
        });

        test("should list all attributes", async function () {
            const attributes = await consumptionController.attributes.getLocalAttributes();
            expect(attributes).toHaveLength(3);
        });

        test("should hide technical attributes when no query is given", async function () {
            const attributes = await consumptionController.attributes.getLocalAttributes(undefined, true);
            expect(attributes).toHaveLength(2);
        });

        test("should hide technical attributes when empty query is given", async function () {
            const attributes = await consumptionController.attributes.getLocalAttributes({}, true);
            expect(attributes).toHaveLength(2);
        });
    });

    describe("get versions of an Attribute", function () {
        let ownIdentityAttributeVersion0: OwnIdentityAttribute;
        let ownIdentityAttributeVersion1: OwnIdentityAttribute;
        let ownIdentityAttributeVersion2: OwnIdentityAttribute;
        beforeEach(async function () {
            ownIdentityAttributeVersion0 = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            });
            const successorParams1 = OwnIdentityAttributeSuccessorParams.from({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "US"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            });
            const successorParams2 = OwnIdentityAttributeSuccessorParams.from({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "CZ"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            });

            ({ predecessor: ownIdentityAttributeVersion0, successor: ownIdentityAttributeVersion1 } = await consumptionController.attributes.succeedOwnIdentityAttribute(
                ownIdentityAttributeVersion0,
                successorParams1
            ));
            ({ predecessor: ownIdentityAttributeVersion1, successor: ownIdentityAttributeVersion2 } = await consumptionController.attributes.succeedOwnIdentityAttribute(
                ownIdentityAttributeVersion1,
                successorParams2
            ));
        });

        test("should return all predecessors of a succeeded OwnIdentityAttribute", async function () {
            const result0 = await consumptionController.attributes.getPredecessorsOfAttribute(ownIdentityAttributeVersion0);
            expect(result0).toStrictEqual([]);

            const result1 = await consumptionController.attributes.getPredecessorsOfAttribute(ownIdentityAttributeVersion1);
            expect(JSON.stringify(result1)).toStrictEqual(JSON.stringify([ownIdentityAttributeVersion0]));

            const result2 = await consumptionController.attributes.getPredecessorsOfAttribute(ownIdentityAttributeVersion2);
            expect(JSON.stringify(result2)).toStrictEqual(JSON.stringify([ownIdentityAttributeVersion1, ownIdentityAttributeVersion0]));
        });

        test("should return all successors of a succeeded OwnIdentityAttribute", async function () {
            const result0 = await consumptionController.attributes.getSuccessorsOfAttribute(ownIdentityAttributeVersion0);
            expect(JSON.stringify(result0)).toStrictEqual(JSON.stringify([ownIdentityAttributeVersion1, ownIdentityAttributeVersion2]));

            const result1 = await consumptionController.attributes.getSuccessorsOfAttribute(ownIdentityAttributeVersion1);
            expect(JSON.stringify(result1)).toStrictEqual(JSON.stringify([ownIdentityAttributeVersion2]));

            const result2 = await consumptionController.attributes.getSuccessorsOfAttribute(ownIdentityAttributeVersion2);
            expect(result2).toStrictEqual([]);
        });

        test("should return all versions of a succeeded OwnIdentityAttribute", async function () {
            const allVersions = [ownIdentityAttributeVersion2, ownIdentityAttributeVersion1, ownIdentityAttributeVersion0];
            for (const version of allVersions) {
                const result = await consumptionController.attributes.getVersionsOfAttribute(version);
                expect(JSON.stringify(result)).toStrictEqual(JSON.stringify([ownIdentityAttributeVersion2, ownIdentityAttributeVersion1, ownIdentityAttributeVersion0]));
            }
        });

        test("should return only input Attribute if no successions were performed", async function () {
            const version0 = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            });

            const onlyVersion0 = await consumptionController.attributes.getVersionsOfAttribute(version0);
            expect(onlyVersion0).toStrictEqual([version0]);
        });

        test("should return all versions of a possibly succeeded forwarded OwnIdentityAttribute", async function () {
            const forwardedOwnIdentityAttributeVersion0 = await consumptionController.attributes.addForwardingDetailsToAttribute(
                ownIdentityAttributeVersion0,
                CoreAddress.from("peerA"),
                CoreId.from("aSourceReferenceId")
            );

            const forwardedOwnIdentityAttributeVersions = await consumptionController.attributes.getVersionsOfAttribute(forwardedOwnIdentityAttributeVersion0);
            expect(JSON.stringify(forwardedOwnIdentityAttributeVersions)).toStrictEqual(
                JSON.stringify([ownIdentityAttributeVersion2, ownIdentityAttributeVersion1, forwardedOwnIdentityAttributeVersion0])
            );

            const forwardedOwnIdentityAttributeVersion1 = await consumptionController.attributes.addForwardingDetailsToAttribute(
                ownIdentityAttributeVersion1,
                CoreAddress.from("peerB"),
                CoreId.from("anotherSourceReferenceId")
            );

            const allVersions = [ownIdentityAttributeVersion2, forwardedOwnIdentityAttributeVersion1, forwardedOwnIdentityAttributeVersion0];
            for (const version of allVersions) {
                const result = await consumptionController.attributes.getVersionsOfAttribute(version);
                expect(JSON.stringify(result)).toStrictEqual(JSON.stringify(allVersions));
            }
        });

        test("should return all versions of a possibly succeeded PeerIdentityAttribute", async function () {
            const version0 = await consumptionController.attributes.createPeerIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: CoreAddress.from("peer")
                }),
                peer: CoreAddress.from("peer"),
                sourceReference: CoreId.from("aSourceReferenceId"),
                id: CoreId.from("aPeerIdentityAttributeId")
            });
            const successorParams1: IPeerIdentityAttributeSuccessorParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "US"
                    },
                    owner: CoreAddress.from("peer")
                }),
                sourceReference: CoreId.from("notRefB"),
                id: CoreId.from("aPeerIdentityAttributeSuccessorId1")
            };
            const successorParams2: IPeerIdentityAttributeSuccessorParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "CZ"
                    },
                    owner: CoreAddress.from("peer")
                }),
                sourceReference: CoreId.from("notRefC"),
                id: CoreId.from("anotherPeerIdentityAttributeSuccessorId")
            };

            const onlyVersion0 = await consumptionController.attributes.getVersionsOfAttribute(version0);
            expect(JSON.stringify(onlyVersion0)).toStrictEqual(JSON.stringify([version0]));

            const { predecessor: updatedVersion0, successor: version1 } = await consumptionController.attributes.succeedPeerIdentityAttribute(version0, successorParams1);
            const { predecessor: updatedVersion1, successor: version2 } = await consumptionController.attributes.succeedPeerIdentityAttribute(version1, successorParams2);

            const allVersions = [version2, updatedVersion1, updatedVersion0];

            for (const version of allVersions) {
                const result = await consumptionController.attributes.getVersionsOfAttribute(version);
                expect(JSON.stringify(result)).toStrictEqual(JSON.stringify(allVersions));
            }
        });

        test("should return all versions of a possibly succeeded OwnRelationshipAttribute", async function () {
            const version0 = await consumptionController.attributes.createOwnRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    owner: consumptionController.accountController.identity.address,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                peer: CoreAddress.from("peerAddress"),
                sourceReference: CoreId.from("aSourceReferenceId")
            });
            const successorParams1: IOwnRelationshipAttributeSuccessorParams = {
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "1337",
                        title: "Customer ID"
                    },
                    owner: consumptionController.accountController.identity.address,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                sourceReference: CoreId.from("anotherSourceReferenceId")
            };
            const successorParams2: IOwnRelationshipAttributeSuccessorParams = {
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "9999",
                        title: "Customer ID"
                    },
                    owner: consumptionController.accountController.identity.address,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                sourceReference: CoreId.from("aFurtherSourceReferenceId")
            };

            const onlyVersion0 = await consumptionController.attributes.getVersionsOfAttribute(version0);
            expect(JSON.stringify(onlyVersion0)).toStrictEqual(JSON.stringify([version0]));

            const { predecessor: updatedVersion0, successor: version1 } = await consumptionController.attributes.succeedOwnRelationshipAttribute(version0, successorParams1);
            const { predecessor: updatedVersion1, successor: version2 } = await consumptionController.attributes.succeedOwnRelationshipAttribute(version1, successorParams2);

            const allVersions = [version2, updatedVersion1, updatedVersion0];
            for (const version of allVersions) {
                const result = await consumptionController.attributes.getVersionsOfAttribute(version);
                expect(JSON.stringify(result)).toStrictEqual(JSON.stringify(allVersions));
            }
        });

        test("should return all versions of a possibly succeeded PeerRelationshipAttribute", async function () {
            const version0 = await consumptionController.attributes.createPeerRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    owner: CoreAddress.from("peerAddress"),
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                peer: CoreAddress.from("peerAddress"),
                sourceReference: CoreId.from("aSourceReferenceId")
            });
            const successorParams1: IPeerRelationshipAttributeSuccessorParams = {
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "1337",
                        title: "Customer ID"
                    },
                    owner: CoreAddress.from("peerAddress"),
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                sourceReference: CoreId.from("anotherSourceReferenceId"),
                id: CoreId.from("aPeerRelationshipAttributeSuccessorId")
            };
            const successorParams2: IPeerRelationshipAttributeSuccessorParams = {
                content: RelationshipAttribute.from({
                    key: "customerId",
                    value: {
                        "@type": "ProprietaryString",
                        value: "9999",
                        title: "Customer ID"
                    },
                    owner: CoreAddress.from("peerAddress"),
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                sourceReference: CoreId.from("aFurtherSourceReferenceId"),
                id: CoreId.from("anotherPeerRelationshipAttributeSuccessorId")
            };

            const onlyVersion0 = await consumptionController.attributes.getVersionsOfAttribute(version0);
            expect(JSON.stringify(onlyVersion0)).toStrictEqual(JSON.stringify([version0]));

            const { predecessor: updatedVersion0, successor: version1 } = await consumptionController.attributes.succeedPeerRelationshipAttribute(version0, successorParams1);
            const { predecessor: updatedVersion1, successor: version2 } = await consumptionController.attributes.succeedPeerRelationshipAttribute(version1, successorParams2);

            const allVersions = [version2, updatedVersion1, updatedVersion0];
            for (const version of allVersions) {
                const result = await consumptionController.attributes.getVersionsOfAttribute(version);
                expect(JSON.stringify(result)).toStrictEqual(JSON.stringify(allVersions));
            }
        });

        test("should throw if an unassigned Attribute is queried", async function () {
            const notExistingAttribute = OwnIdentityAttribute.from({
                id: CoreId.from("notExistingAttributeId"),
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: consumptionController.accountController.identity.address
                }),
                createdAt: CoreDate.utc()
            });

            await expect(consumptionController.attributes.getVersionsOfAttribute(notExistingAttribute)).rejects.toThrow("error.transport.recordNotFound");
        });

        test("should check if two Attributes are subsequent in succession", async function () {
            const version0 = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            });
            const successorParams1 = OwnIdentityAttributeSuccessorParams.from({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "US"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            });
            const successorParams2 = OwnIdentityAttributeSuccessorParams.from({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "CZ"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            });

            const { predecessor: updatedVersion0, successor: version1 } = await consumptionController.attributes.succeedOwnIdentityAttribute(version0, successorParams1);
            const { predecessor: updatedVersion1, successor: version2 } = await consumptionController.attributes.succeedOwnIdentityAttribute(version1, successorParams2);

            expect(await consumptionController.attributes.isSubsequentInSuccession(updatedVersion0.id, updatedVersion1.id)).toBe(true);
            expect(await consumptionController.attributes.isSubsequentInSuccession(updatedVersion0.id, version2.id)).toBe(true);

            expect(await consumptionController.attributes.isSubsequentInSuccession(updatedVersion0.id, updatedVersion0.id)).toBe(false);
            expect(await consumptionController.attributes.isSubsequentInSuccession(updatedVersion1.id, updatedVersion0.id)).toBe(false);
            expect(await consumptionController.attributes.isSubsequentInSuccession(version2.id, updatedVersion0.id)).toBe(false);
        });
    });

    describe("get shared versions of an Attribute", function () {
        let ownIdentityAttributeV0: OwnIdentityAttribute;
        let ownIdentityAttributeV1: OwnIdentityAttribute;
        let ownIdentityAttributeV2: OwnIdentityAttribute;
        let forwardedOwnIdentityAttributeV1PeerAAndPeerB: OwnIdentityAttribute;
        let forwardedOwnIdentityAttributeV2PeerB: OwnIdentityAttribute;
        beforeEach(async function () {
            ownIdentityAttributeV0 = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            });
            const ownIdentityAttributeParamsV1 = OwnIdentityAttributeSuccessorParams.from({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "US"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            });
            const ownIdentityAttributeParamsV2 = OwnIdentityAttributeSuccessorParams.from({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "CZ"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            });

            ({ predecessor: ownIdentityAttributeV0, successor: ownIdentityAttributeV1 } = await consumptionController.attributes.succeedOwnIdentityAttribute(
                ownIdentityAttributeV0,
                ownIdentityAttributeParamsV1
            ));
            ({ predecessor: ownIdentityAttributeV1, successor: ownIdentityAttributeV2 } = await consumptionController.attributes.succeedOwnIdentityAttribute(
                ownIdentityAttributeV1,
                ownIdentityAttributeParamsV2
            ));

            const forwardedOwnIdentityAttributeV1PeerA = await consumptionController.attributes.addForwardingDetailsToAttribute(
                ownIdentityAttributeV1,
                CoreAddress.from("peerA"),
                CoreId.from("aSourceReferenceId")
            );

            forwardedOwnIdentityAttributeV1PeerAAndPeerB = await consumptionController.attributes.addForwardingDetailsToAttribute(
                forwardedOwnIdentityAttributeV1PeerA,
                CoreAddress.from("peerB"),
                CoreId.from("anotherSourceReferenceId")
            );

            forwardedOwnIdentityAttributeV2PeerB = await consumptionController.attributes.addForwardingDetailsToAttribute(
                ownIdentityAttributeV2,
                CoreAddress.from("peerB"),
                CoreId.from("aPeerBSourceReferenceId")
            );
        });

        test("should return all shared predecessors for a single peer", async function () {
            const result = await consumptionController.attributes.getPredecessorsOfAttributeSharedWithPeer(ownIdentityAttributeV2, CoreAddress.from("peerB"));
            expect(JSON.stringify(result)).toStrictEqual(JSON.stringify([forwardedOwnIdentityAttributeV1PeerAAndPeerB]));
        });

        test("should return all shared successors for a single peer", async function () {
            const result = await consumptionController.attributes.getSuccessorsOfAttributeSharedWithPeer(ownIdentityAttributeV0, CoreAddress.from("peerB"));
            expect(JSON.stringify(result)).toStrictEqual(JSON.stringify([forwardedOwnIdentityAttributeV1PeerAAndPeerB, forwardedOwnIdentityAttributeV2PeerB]));
        });

        test("should return all shared versions for a single peer", async function () {
            const allVersions = [ownIdentityAttributeV0, forwardedOwnIdentityAttributeV1PeerAAndPeerB, forwardedOwnIdentityAttributeV2PeerB];
            const allforwardedOwnAttributeVersionsPeerB = [forwardedOwnIdentityAttributeV2PeerB, forwardedOwnIdentityAttributeV1PeerAAndPeerB];
            for (const version of allVersions) {
                const resultA = await consumptionController.attributes.getVersionsOfAttributeSharedWithPeer(version, CoreAddress.from("peerA"), false);
                expect(JSON.stringify(resultA)).toStrictEqual(JSON.stringify([forwardedOwnIdentityAttributeV1PeerAAndPeerB]));

                const resultB = await consumptionController.attributes.getVersionsOfAttributeSharedWithPeer(version, CoreAddress.from("peerB"), false);
                expect(JSON.stringify(resultB)).toStrictEqual(JSON.stringify(allforwardedOwnAttributeVersionsPeerB));
            }
        });

        test("should return only latest shared version for a single peer", async function () {
            const allVersions = [ownIdentityAttributeV0, forwardedOwnIdentityAttributeV1PeerAAndPeerB, forwardedOwnIdentityAttributeV2PeerB];
            for (const version of allVersions) {
                const resultA = await consumptionController.attributes.getVersionsOfAttributeSharedWithPeer(version, CoreAddress.from("peerA"));
                expect(resultA).toStrictEqual([forwardedOwnIdentityAttributeV1PeerAAndPeerB]);

                const resultB = await consumptionController.attributes.getVersionsOfAttributeSharedWithPeer(version, CoreAddress.from("peerB"));
                expect(resultB).toStrictEqual([forwardedOwnIdentityAttributeV2PeerB]);
            }
        });

        test("should throw if an unassigned Attribute is queried", async function () {
            const notExistingAttribute = OwnIdentityAttribute.from({
                id: CoreId.from("notExistingAttributeId"),
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: consumptionController.accountController.identity.address
                }),
                createdAt: CoreDate.utc()
            });

            await expect(consumptionController.attributes.getVersionsOfAttributeSharedWithPeer(notExistingAttribute, CoreAddress.from("peerAddress"))).rejects.toThrow(
                "error.transport.recordNotFound"
            );
        });

        test("should return an empty list if an OwnRelationshipAttribute without associated ThirdPartyRelationshipAttributes is queried", async function () {
            const ownRelationshipAttribute = await consumptionController.attributes.createOwnRelationshipAttribute({
                content: RelationshipAttribute.from({
                    key: "aKey",
                    value: {
                        "@type": "ProprietaryString",
                        value: "Some value",
                        title: "Some title"
                    },
                    owner: consumptionController.accountController.identity.address,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                peer: CoreAddress.from("peerAddress"),
                sourceReference: CoreId.from("aSourceReferenceId")
            });

            const result = await consumptionController.attributes.getVersionsOfAttributeSharedWithPeer(ownRelationshipAttribute, CoreAddress.from("thirdPartyAddress"));
            expect(result).toHaveLength(0);
        });
    });

    describe("get peers with exclusiverly forwareded predecessors", function () {
        test("should return empty list if Attribute has no predecessor", async function () {
            const attribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName"
                    },
                    owner: testAccount.identity.address
                })
            });
            await consumptionController.attributes.addForwardingDetailsToAttribute(attribute, CoreAddress.from("peer1"), CoreId.from("aSourceReference"));

            const peersWithPredecessors = await consumptionController.attributes.getPeersWithExclusivelyForwardedPredecessors(attribute.id);
            expect(peersWithPredecessors).toHaveLength(0);
        });

        test("should return empty list if peers of predecessor are also peers of Attribute", async function () {
            const predecessor = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName"
                    },
                    owner: testAccount.identity.address
                })
            });

            const successor = (
                await consumptionController.attributes.succeedOwnIdentityAttribute(
                    predecessor,
                    OwnIdentityAttributeSuccessorParams.from({
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "GivenName",
                                value: "anotherGivenName"
                            },
                            owner: testAccount.identity.address
                        })
                    })
                )
            ).successor;

            await consumptionController.attributes.addForwardingDetailsToAttribute(predecessor, CoreAddress.from("peer1"), CoreId.from("sourceReferenceA"));
            await consumptionController.attributes.addForwardingDetailsToAttribute(successor, CoreAddress.from("peer1"), CoreId.from("sourceReferenceC"));
            await consumptionController.attributes.addForwardingDetailsToAttribute(successor, CoreAddress.from("peer2"), CoreId.from("sourceReferenceB"));

            const peersWithPredecessors = await consumptionController.attributes.getPeersWithExclusivelyForwardedPredecessors(successor.id);
            expect(peersWithPredecessors).toHaveLength(0);
        });

        test("should return peer of predecessor and predecessor id if peer is not peer of Attribute", async function () {
            const predecessor = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName"
                    },
                    owner: testAccount.identity.address
                })
            });

            const successor = (
                await consumptionController.attributes.succeedOwnIdentityAttribute(
                    predecessor,
                    OwnIdentityAttributeSuccessorParams.from({
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "GivenName",
                                value: "anotherGivenName"
                            },
                            owner: testAccount.identity.address
                        })
                    })
                )
            ).successor;

            await consumptionController.attributes.addForwardingDetailsToAttribute(predecessor, CoreAddress.from("peer1"), CoreId.from("sourceReferenceA"));
            await consumptionController.attributes.addForwardingDetailsToAttribute(predecessor, CoreAddress.from("peer2"), CoreId.from("sourceReferenceB"));
            await consumptionController.attributes.addForwardingDetailsToAttribute(successor, CoreAddress.from("peer1"), CoreId.from("sourceReferenceC"));

            const peersWithPredecessors = await consumptionController.attributes.getPeersWithExclusivelyForwardedPredecessors(successor.id);
            expect(peersWithPredecessors).toHaveLength(1);
            expect(peersWithPredecessors[0]).toStrictEqual([CoreAddress.from("peer2"), predecessor.id]);
        });
    });

    describe("get Attribute with same value", function () {
        test("should return an existing OwnIdentityAttribute duplicate", async function () {
            const existingOwnIdentityAttribute = await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName"
                    },
                    owner: testAccount.identity.address
                })
            });

            const duplicate = await consumptionController.attributes.getOwnIdentityAttributeWithSameValue({
                "@type": "GivenName",
                value: "aGivenName"
            });

            expect(duplicate).toStrictEqual(existingOwnIdentityAttribute);
        });

        test("should return undefined if no OwnIdentityAttribute duplicate exists", async function () {
            await consumptionController.attributes.createOwnIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName"
                    },
                    owner: testAccount.identity.address
                })
            });

            const duplicate = await consumptionController.attributes.getOwnIdentityAttributeWithSameValue({
                "@type": "GivenName",
                value: "anotherGivenName"
            });

            expect(duplicate).toBeUndefined();
        });

        test("should return an existing PeerIdentityAttribute duplicate", async function () {
            const existingPeerIdentityAttribute = await consumptionController.attributes.createPeerIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName"
                    },
                    owner: CoreAddress.from("peer")
                }),
                sourceReference: CoreId.from("aSourceReferenceId"),
                peer: CoreAddress.from("peer"),
                id: CoreId.from("aPeerIdentityAttributeId")
            });

            const duplicate = await consumptionController.attributes.getPeerIdentityAttributeWithSameValue(
                {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                "peer"
            );

            expect(duplicate).toStrictEqual(existingPeerIdentityAttribute);
        });

        test("should return undefined if no PeerIdentityAttribute duplicate exists", async function () {
            await consumptionController.attributes.createPeerIdentityAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName"
                    },
                    owner: CoreAddress.from("peer")
                }),
                peer: CoreAddress.from("peer"),
                sourceReference: CoreId.from("aSourceReferenceId"),
                id: CoreId.from("aPeerIdentityAttributeId")
            });

            const duplicate = await consumptionController.attributes.getPeerIdentityAttributeWithSameValue(
                {
                    "@type": "GivenName",
                    value: "anotherGivenName"
                },
                "peer"
            );

            expect(duplicate).toBeUndefined();
        });
    });

    describe("validate tags", function () {
        /* eslint-disable @typescript-eslint/naming-convention */
        const mockedTagCollection: AttributeTagCollection = AttributeTagCollection.from({
            supportedLanguages: ["de", "en"],
            tagsForAttributeValueTypes: {
                PhoneNumber: {
                    emergency: {
                        displayNames: {
                            de: "Notfallkontakt",
                            en: "Emergency Contact"
                        },
                        children: {
                            first: {
                                displayNames: {
                                    de: "Erster Notfallkontakt",
                                    en: "First Emergency Contact"
                                }
                            },
                            second: {
                                displayNames: {
                                    de: "Zweiter Notfallkontakt",
                                    en: "Second Emergency Contact"
                                }
                            }
                        }
                    },
                    private: {
                        displayNames: {
                            de: "Privat",
                            en: "Private"
                        }
                    }
                }
            }
        });
        /* eslint-enable @typescript-eslint/naming-convention */

        test("should validate valid tags", function () {
            expect(consumptionController.attributes["isValidTag"]("bkb:private", mockedTagCollection.tagsForAttributeValueTypes["PhoneNumber"])).toBe(true);
            expect(consumptionController.attributes["isValidTag"]("bkb:emergency:first", mockedTagCollection.tagsForAttributeValueTypes["PhoneNumber"])).toBe(true);
            expect(consumptionController.attributes["isValidTag"]("bkb:emergency:second", mockedTagCollection.tagsForAttributeValueTypes["PhoneNumber"])).toBe(true);
            expect(consumptionController.attributes["isValidTag"]("x:my:custom:tag", mockedTagCollection.tagsForAttributeValueTypes["PhoneNumber"])).toBe(true);
            expect(consumptionController.attributes["isValidTag"]("X:my:custom:tag", mockedTagCollection.tagsForAttributeValueTypes["PhoneNumber"])).toBe(true);
            expect(consumptionController.attributes["isValidTag"]("mimetype:x/x", {})).toBe(true);
            expect(consumptionController.attributes["isValidTag"]("urn:aUrnTag", {})).toBe(true);
            expect(consumptionController.attributes["isValidTag"]("language:de", {})).toBe(true);
        });

        test("should validate invalid tags", function () {
            expect(consumptionController.attributes["isValidTag"]("bkb:nonexistent", mockedTagCollection.tagsForAttributeValueTypes["PhoneNumber"])).toBe(false);
            expect(consumptionController.attributes["isValidTag"]("bkb:emergency", mockedTagCollection.tagsForAttributeValueTypes["PhoneNumber"])).toBe(false);
            expect(consumptionController.attributes["isValidTag"]("bkb:private", mockedTagCollection.tagsForAttributeValueTypes["nonexistent"])).toBe(false);
            expect(consumptionController.attributes["isValidTag"]("bkb:emergency:nonexistent", mockedTagCollection.tagsForAttributeValueTypes["PhoneNumber"])).toBe(false);
            expect(consumptionController.attributes["isValidTag"]("bkb:emergency:first:nonexistent", mockedTagCollection.tagsForAttributeValueTypes["PhoneNumber"])).toBe(false);
            expect(consumptionController.attributes["isValidTag"]("mimetype:/x", {})).toBe(false);
            expect(consumptionController.attributes["isValidTag"]("Urn:invalidUrn", {})).toBe(false);
            expect(consumptionController.attributes["isValidTag"]("language:invalid", {})).toBe(false);
            expect(consumptionController.attributes["isValidTag"]("unsupportedPrefix:invalid", {})).toBe(false);
        });
    });

    describe("tag definition caching by time", function () {
        let connection: IDatabaseConnection;
        let transport: Transport;
        let testAccount: AccountController;
        let consumptionController: ConsumptionController;
        let attributeTagClientSpy: TagClient;
        beforeEach(async function () {
            connection = await TestUtil.createConnection();
            transport = TestUtil.createTransport(mockEventBus, {
                tagCacheLifetimeInMinutes: 1 / 60
            });
            await transport.init();

            const connectorAccount = (await TestUtil.provideAccounts(transport, connection, 1))[0];
            ({ accountController: testAccount, consumptionController } = connectorAccount);
            const attributeTagClient = consumptionController.attributes["attributeTagClient"];

            attributeTagClientSpy = spy(attributeTagClient);
            when(attributeTagClientSpy.get("/api/v2/Tags", anything(), anything())).thenResolve(
                ClientResult.ok(
                    AttributeTagCollection.from({
                        supportedLanguages: ["en"],
                        tagsForAttributeValueTypes: {}
                    }).toJSON(),
                    {
                        etag: "some-e-tag"
                    }
                )
            );
        });

        afterEach(async function () {
            await testAccount.close();
            await connection.close();
            reset(attributeTagClientSpy);
        });

        test("should cache the tag definitions when called twice within tagCachingDurationInMinutes", async function () {
            await consumptionController.attributes.getAttributeTagCollection();
            await consumptionController.attributes.getAttributeTagCollection();

            verify(attributeTagClientSpy.getTagCollection(anything())).once();
            reset(attributeTagClientSpy);
        });

        test("should not cache the tag definitions when the tagCachingDurationInMinutes was reached", async function () {
            await consumptionController.attributes.getAttributeTagCollection();
            await sleep(1100);
            await consumptionController.attributes.getAttributeTagCollection();

            verify(attributeTagClientSpy.getTagCollection(anything())).twice();
            reset(attributeTagClientSpy);
        });
    });

    describe("tag definition caching by e-tag", function () {
        let connection: IDatabaseConnection;
        let transport: Transport;
        let testAccount: AccountController;
        let consumptionController: ConsumptionController;
        let attributeTagClientSpy: TagClient;
        let attributesControllerSpy: AttributesController;
        let etag: string;
        beforeEach(async function () {
            connection = await TestUtil.createConnection();
            transport = TestUtil.createTransport(mockEventBus, {
                tagCacheLifetimeInMinutes: 0
            });
            await transport.init();

            const connectorAccount = (await TestUtil.provideAccounts(transport, connection, 1))[0];
            ({ accountController: testAccount, consumptionController } = connectorAccount);
            const attributeTagClient = consumptionController.attributes["attributeTagClient"];

            attributeTagClientSpy = spy(attributeTagClient);
            attributesControllerSpy = spy(consumptionController.attributes);

            etag = "some-e-tag";
            when(attributeTagClientSpy.get("/api/v2/Tags", anything(), anything())).thenCall((_path, _params, config) => {
                const etagMatched = etag === config?.headers?.["if-none-match"];
                const platformParameters = {
                    etag,
                    responseStatus: etagMatched ? 304 : 200
                };
                return Promise.resolve(
                    ClientResult.ok(
                        etagMatched
                            ? undefined
                            : AttributeTagCollection.from({
                                  supportedLanguages: ["en"],
                                  tagsForAttributeValueTypes: {}
                              }).toJSON(),
                        platformParameters
                    )
                );
            });
        });

        afterEach(async function () {
            await testAccount.close();
            await connection.close();
            reset(attributeTagClientSpy);
            reset(attributesControllerSpy);
        });

        test("should cache the tag definitions when called twice without new etag", async function () {
            await consumptionController.attributes.getAttributeTagCollection();
            await sleep(100);
            await consumptionController.attributes.getAttributeTagCollection();

            verify(attributeTagClientSpy.getTagCollection(anything())).twice();
            verify(attributesControllerSpy["setTagCollection"](anything())).once();
        });

        test("should not cache the tag definitions when called twice with new etag", async function () {
            await consumptionController.attributes.getAttributeTagCollection();
            await sleep(100);
            etag = "some-other-e-tag";
            await consumptionController.attributes.getAttributeTagCollection();

            verify(attributeTagClientSpy.getTagCollection(anything())).twice();
            verify(attributesControllerSpy["setTagCollection"](anything())).twice();
        });
    });

    describe("validate attribute values", function () {
        test("should catch forbidden characters in an IdentityAttribute", function () {
            expect(
                consumptionController.attributes.validateAttributeCharacters(
                    IdentityAttribute.from({
                        owner: CoreAddress.from("anAddress"),
                        value: BirthPlace.from({ city: "aCity😀", country: "DE" })
                    })
                )
            ).toBe(false);
        });

        test("should catch forbidden characters in a RelationshipAttribute", function () {
            expect(
                consumptionController.attributes.validateAttributeCharacters(
                    RelationshipAttribute.from({
                        key: "aKey",
                        owner: CoreAddress.from("anAddress"),
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        value: ProprietaryString.from({ title: "aTitle", value: "aProprietaryStringValue😀" })
                    })
                )
            ).toBe(false);
        });

        test("should allow all characters in a RelationshipAttribute's title and description", function () {
            expect(
                consumptionController.attributes.validateAttributeCharacters(
                    RelationshipAttribute.from({
                        key: "aKey",
                        owner: CoreAddress.from("anAddress"),
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        value: ProprietaryString.from({ title: "aTitle😀", value: "aProprietaryStringValue", description: "aDescription😀" })
                    })
                )
            ).toBe(true);
        });
    });
});
