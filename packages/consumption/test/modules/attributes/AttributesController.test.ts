import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import {
    BirthDate,
    BirthYear,
    City,
    Country,
    DisplayName,
    EMailAddress,
    HouseNumber,
    IdentityAttribute,
    IIdentityAttributeQuery,
    IIQLQuery,
    IRelationshipAttributeQuery,
    Nationality,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    Street,
    StreetAddress,
    ThirdPartyRelationshipAttributeQueryOwner,
    ZipCode
} from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import {
    AttributeCreatedEvent,
    AttributeDeletedEvent,
    AttributeTagCollection,
    ConsumptionController,
    IAttributeSuccessorParams,
    ICreateRepositoryAttributeParams,
    ICreateSharedLocalAttributeCopyParams,
    ICreateSharedLocalAttributeParams,
    LocalAttribute,
    LocalAttributeDeletionInfo,
    LocalAttributeDeletionStatus,
    LocalAttributeShareInfo,
    SharedAttributeCopyCreatedEvent
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
        transport = TestUtil.createTransport(connection, mockEventBus);
        await transport.init();

        const connectorAccount = (await TestUtil.provideAccounts(transport, 1))[0];
        ({ accountController: testAccount, consumptionController } = connectorAccount);

        const appAccount = (await TestUtil.provideAccounts(transport, 1, undefined, undefined, { setDefaultRepositoryAttributes: true }))[0];
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
            await consumptionController.attributes.deleteAttribute(attribute);
        }

        const appAttributes = await appConsumptionController.attributes.getLocalAttributes();
        for (const attribute of appAttributes) {
            await appConsumptionController.attributes.deleteAttribute(attribute);
        }
    });

    describe("create Attributes", function () {
        test("should create a new attribute", async function () {
            const params: ICreateRepositoryAttributeParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "DisplayName",
                        value: "aDisplayName"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            };

            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute(params);
            expect(repositoryAttribute).toBeInstanceOf(LocalAttribute);
            expect(repositoryAttribute.content).toBeInstanceOf(IdentityAttribute);

            const attributesAfterCreate = await consumptionController.attributes.getLocalAttributes();
            expect(attributesAfterCreate).toHaveLength(1);

            mockEventBus.expectPublishedEvents(AttributeCreatedEvent);
        });

        test("should trim whitespace for a RepositoryAttribute", async function () {
            const params: ICreateRepositoryAttributeParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "DisplayName",
                        value: "  aDisplayName\n"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            };

            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute(params);
            expect((repositoryAttribute.content.value as DisplayName).value).toBe("aDisplayName");
        });

        test("should create a new attribute of type SchematizedXML", async function () {
            const params: ICreateRepositoryAttributeParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "SchematizedXML",
                        title: "aTitle",
                        value: "aValue"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            };

            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute(params);
            expect(repositoryAttribute).toBeInstanceOf(LocalAttribute);
            expect(repositoryAttribute.content).toBeInstanceOf(IdentityAttribute);

            const attributesAfterCreate = await consumptionController.attributes.getLocalAttributes();
            expect(attributesAfterCreate).toHaveLength(1);

            mockEventBus.expectPublishedEvents(AttributeCreatedEvent);
        });

        test("should create LocalAttributes for each property of a complex Identity Attribute", async function () {
            const identityAttribute = IdentityAttribute.from({
                value: {
                    "@type": "StreetAddress",
                    recipient: "aRecipient",
                    street: "aStreet",
                    houseNo: "aHouseNo",
                    zipCode: "aZipCode",
                    city: "aCity",
                    country: "DE"
                },
                owner: consumptionController.accountController.identity.address
            });

            const address = await consumptionController.attributes.createRepositoryAttribute({
                content: identityAttribute
            });

            expect(address).toBeInstanceOf(LocalAttribute);
            expect(address.content).toBeInstanceOf(IdentityAttribute);

            const childAttributes = await consumptionController.attributes.getLocalAttributes({
                parentId: address.id.toString()
            });
            expect(childAttributes).toHaveLength(5);
            expect(childAttributes[0].content.value).toBeInstanceOf(Street);
            expect(childAttributes[1].content.value).toBeInstanceOf(HouseNumber);
            expect(childAttributes[2].content.value).toBeInstanceOf(ZipCode);
            expect(childAttributes[3].content.value).toBeInstanceOf(City);
            expect(childAttributes[4].content.value).toBeInstanceOf(Country);

            const attributesAfterCreate = await consumptionController.attributes.getLocalAttributes();
            expect(attributesAfterCreate).toHaveLength(6);
        });

        test("should trim whitespace when creating a complex RepositoryAttribute and its children", async function () {
            const identityAttribute = IdentityAttribute.from({
                value: {
                    "@type": "StreetAddress",
                    recipient: "\taRecipient\r",
                    street: "\vaStreet\f",
                    houseNo: " aHouseNo\u00a0",
                    zipCode: "  aZipCode\u2028",
                    city: " aCity  ",
                    country: "DE"
                },
                owner: consumptionController.accountController.identity.address
            });

            const address = await consumptionController.attributes.createRepositoryAttribute({
                content: identityAttribute
            });

            expect((address.content.value as StreetAddress).recipient).toBe("aRecipient");
            expect((address.content.value as StreetAddress).street.value).toBe("aStreet");
            expect((address.content.value as StreetAddress).houseNo.value).toBe("aHouseNo");
            expect((address.content.value as StreetAddress).zipCode.value).toBe("aZipCode");
            expect((address.content.value as StreetAddress).city.value).toBe("aCity");

            const childAttributes = await consumptionController.attributes.getLocalAttributes({
                parentId: address.id.toString()
            });
            expect((childAttributes[0].content.value as Street).value).toBe("aStreet");
            expect((childAttributes[1].content.value as HouseNumber).value).toBe("aHouseNo");
            expect((childAttributes[2].content.value as ZipCode).value).toBe("aZipCode");
            expect((childAttributes[3].content.value as City).value).toBe("aCity");
        });

        test("should trigger an AttributeCreatedEvent for each created child Attribute of a complex Attribute", async function () {
            await consumptionController.attributes.getLocalAttributes();

            const identityAttribute = IdentityAttribute.from({
                value: {
                    "@type": "StreetAddress",
                    recipient: "aRecipient",
                    street: "aStreet",
                    houseNo: "aHouseNo",
                    zipCode: "aZipCode",
                    city: "aCity",
                    country: "DE"
                },
                owner: consumptionController.accountController.identity.address
            });

            await consumptionController.attributes.createRepositoryAttribute({ content: identityAttribute });

            mockEventBus.expectPublishedEvents(
                AttributeCreatedEvent,
                AttributeCreatedEvent,
                AttributeCreatedEvent,
                AttributeCreatedEvent,
                AttributeCreatedEvent,
                AttributeCreatedEvent
            );
        });

        test("should set an Attribute as default if it is the only of its value type and setDefaultRepositoryAttributes is true", async function () {
            const attributeParams: ICreateRepositoryAttributeParams = {
                content: IdentityAttribute.from({
                    value: EMailAddress.from({
                        value: "my@email.address"
                    }),
                    owner: appConsumptionController.accountController.identity.address
                })
            };
            const attribute = await appConsumptionController.attributes.createRepositoryAttribute(attributeParams);
            expect(attribute.isDefault).toBe(true);
        });

        test("should not set an Attribute as default if already another exists with that value type and setDefaultRepositoryAttributes is true", async function () {
            const attributeParams: ICreateRepositoryAttributeParams = {
                content: IdentityAttribute.from({
                    value: EMailAddress.from({
                        value: "my@email.address"
                    }),
                    owner: appConsumptionController.accountController.identity.address
                })
            };
            const firstAttribute = await appConsumptionController.attributes.createRepositoryAttribute(attributeParams);
            expect(firstAttribute.isDefault).toBe(true);

            const secondAttribute = await appConsumptionController.attributes.createRepositoryAttribute(attributeParams);
            expect(secondAttribute.isDefault).toBeUndefined();
        });

        test("should not set an Attribute as default if it is the only of its value type but setDefaultRepositoryAttributes is false", async function () {
            const attributeParams: ICreateRepositoryAttributeParams = {
                content: IdentityAttribute.from({
                    value: EMailAddress.from({
                        value: "my@email.address"
                    }),
                    owner: consumptionController.accountController.identity.address
                })
            };
            const attribute = await consumptionController.attributes.createRepositoryAttribute(attributeParams);
            expect(attribute.isDefault).toBeUndefined();
        });

        test("should set a child Attribute of a complex default attribute as default if setDefaultRepositoryAttributes is true", async function () {
            const complexBirthDate = await appConsumptionController.attributes.createRepositoryAttribute({
                content: IdentityAttribute.from({
                    value: BirthDate.from({
                        day: 28,
                        month: 2,
                        year: 2000
                    }),
                    owner: appConsumptionController.accountController.identity.address
                })
            });
            expect(complexBirthDate.isDefault).toBe(true);

            const childBirthYear = await appConsumptionController.attributes.getLocalAttributes({
                parentId: complexBirthDate.id.toString(),
                "content.value.@type": "BirthYear"
            });
            expect(childBirthYear).toHaveLength(1);
            expect(childBirthYear[0].isDefault).toBe(true);
        });

        test("should set a child Attribute of a complex default attribute as default if setDefaultRepositoryAttributes is true, even if already another attribute with that value type exists", async function () {
            const independentBirthYear = await appConsumptionController.attributes.createRepositoryAttribute({
                content: IdentityAttribute.from({
                    value: BirthYear.from({
                        value: 2000
                    }),
                    owner: appConsumptionController.accountController.identity.address
                })
            });
            expect(independentBirthYear.isDefault).toBe(true);

            const complexBirthDate = await appConsumptionController.attributes.createRepositoryAttribute({
                content: IdentityAttribute.from({
                    value: BirthDate.from({
                        day: 28,
                        month: 2,
                        year: 2000
                    }),
                    owner: appConsumptionController.accountController.identity.address
                })
            });
            expect(complexBirthDate.isDefault).toBe(true);

            const childBirthYear = await appConsumptionController.attributes.getLocalAttributes({
                parentId: complexBirthDate.id.toString(),
                "content.value.@type": "BirthYear"
            });
            expect(childBirthYear).toHaveLength(1);
            expect(childBirthYear[0].isDefault).toBe(true);

            const updatedIndependentBirthYear = await appConsumptionController.attributes.getLocalAttribute(independentBirthYear.id);
            expect(updatedIndependentBirthYear!.isDefault).toBeUndefined();
        });

        test("should allow to create a shared attribute copy", async function () {
            const nationalityParams: ICreateRepositoryAttributeParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: testAccount.identity.address
                })
            };
            const nationalityAttribute = await consumptionController.attributes.createRepositoryAttribute(nationalityParams);

            const peer = CoreAddress.from("address");
            const createSharedAttributesParams: ICreateSharedLocalAttributeCopyParams = {
                sourceAttributeId: nationalityAttribute.id,
                peer: peer,
                requestReference: CoreId.from("requestId")
            };

            const sharedNationalityAttribute = await consumptionController.attributes.createSharedLocalAttributeCopy(createSharedAttributesParams);
            expect(sharedNationalityAttribute).toBeInstanceOf(LocalAttribute);
            expect(sharedNationalityAttribute.shareInfo?.peer).toStrictEqual(peer);

            mockEventBus.expectLastPublishedEvent(SharedAttributeCopyCreatedEvent);
        });

        test("should allow to create a shared attribute", async function () {
            const content = IdentityAttribute.from({
                value: {
                    "@type": "Nationality",
                    value: "DE"
                },
                owner: CoreAddress.from("address")
            });
            const createPeerAttributeParams: ICreateSharedLocalAttributeParams = {
                content: content,
                requestReference: CoreId.from("requestId"),
                peer: CoreAddress.from("address")
            };
            const peerLocalAttribute = await consumptionController.attributes.createSharedLocalAttribute(createPeerAttributeParams);
            expect(peerLocalAttribute.content.toJSON()).toStrictEqual(content.toJSON());
            expect(peerLocalAttribute.content.value).toBeInstanceOf(Nationality);
            expect(createPeerAttributeParams.peer.address).toStrictEqual(CoreAddress.from("address").toString());
            expect(createPeerAttributeParams.requestReference.toString()).toStrictEqual(CoreId.from("requestId").toString());

            mockEventBus.expectLastPublishedEvent(AttributeCreatedEvent);
        });

        test("should allow to create an attribute shared by a peer", async function () {
            const content = IdentityAttribute.from({
                value: {
                    "@type": "Nationality",
                    value: "DE"
                },
                owner: CoreAddress.from("address")
            });
            const createSharedAttributeParams: ICreateSharedLocalAttributeParams = {
                content: content,
                requestReference: CoreId.from("requestId"),
                peer: CoreAddress.from("address")
            };
            const peerLocalAttribute = await consumptionController.attributes.createSharedLocalAttribute(createSharedAttributeParams);
            expect(peerLocalAttribute.content.toJSON()).toStrictEqual(content.toJSON());
            expect(peerLocalAttribute.content.value).toBeInstanceOf(Nationality);
            expect(createSharedAttributeParams.peer.address).toStrictEqual(CoreAddress.from("address").toString());
            expect(createSharedAttributeParams.requestReference.toString()).toStrictEqual(CoreId.from("requestId").toString());

            mockEventBus.expectLastPublishedEvent(AttributeCreatedEvent);
        });

        test("should add a third party address when creating a shared copy of a relationship attribute", async function () {
            const thirdPartyAddress = CoreAddress.from("thirdParty");
            const peerAddress = CoreAddress.from("peerAddress");

            const relationshipAttribute = await consumptionController.attributes.createAttributeUnsafe({
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
                shareInfo: {
                    peer: thirdPartyAddress,
                    requestReference: CoreId.from("reqRefA")
                }
            });

            const thirdPartyLocalAttributeCopy = await consumptionController.attributes.createSharedLocalAttributeCopy({
                peer: peerAddress,
                requestReference: CoreId.from("reqRefB"),
                sourceAttributeId: relationshipAttribute.id,
                attributeId: CoreId.from("ATTthirdParty")
            });

            expect(thirdPartyLocalAttributeCopy.shareInfo?.thirdPartyAddress?.toString()).toBe(thirdPartyAddress.toString());
        });
    });
    describe("query Attributes", function () {
        test("should allow to query relationship attributes with empty owner", async function () {
            const relationshipAttributeParams: ICreateSharedLocalAttributeParams = {
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
                requestReference: CoreId.from("reqRef"),
                peer: CoreAddress.from("peer")
            };
            await consumptionController.attributes.createSharedLocalAttribute(relationshipAttributeParams);

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

        test("should allow to query public relationship attributes", async function () {
            const relationshipAttributeParams: ICreateSharedLocalAttributeParams = {
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
                requestReference: CoreId.from("reqRef"),
                peer: CoreAddress.from("peer")
            };
            await consumptionController.attributes.createSharedLocalAttribute(relationshipAttributeParams);

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

        test("should allow to query protected relationship attributes", async function () {
            const relationshipAttributeParams: ICreateSharedLocalAttributeParams = {
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
                requestReference: CoreId.from("reqRef"),
                peer: CoreAddress.from("peer")
            };
            await consumptionController.attributes.createSharedLocalAttribute(relationshipAttributeParams);

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

        test("should not allow to query private relationship attributes", async function () {
            const relationshipAttributeParams: ICreateSharedLocalAttributeParams = {
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
                requestReference: CoreId.from("reqRef"),
                peer: CoreAddress.from("peer")
            };
            await consumptionController.attributes.createSharedLocalAttribute(relationshipAttributeParams);

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

        test("should query relationship attributes using the ThirdPartyRelationshipAttributeQuery", async function () {
            const relationshipAttribute = await consumptionController.attributes.createSharedLocalAttribute({
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
                requestReference: CoreId.from("requestId")
            });

            const attributes = await consumptionController.attributes.executeThirdPartyRelationshipAttributeQuery({
                key: "customerId",
                owner: ThirdPartyRelationshipAttributeQueryOwner.ThirdParty,
                thirdParty: [CoreAddress.from("peerAddress")]
            });
            expect(attributes).toHaveLength(1);
            expect(attributes[0].id.toString()).toStrictEqual(relationshipAttribute.id.toString());
        });

        test("should not query relationship attributes with confidentiality set to `Private` using the ThirdPartyRelationshipAttributeQuery", async function () {
            await consumptionController.attributes.createSharedLocalAttribute({
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
                requestReference: CoreId.from("requestId")
            });

            const attributes = await consumptionController.attributes.executeThirdPartyRelationshipAttributeQuery({
                key: "customerId",
                owner: ThirdPartyRelationshipAttributeQueryOwner.Empty,
                thirdParty: [CoreAddress.from("peerAddress")]
            });
            expect(attributes).toHaveLength(0);
        });

        test("should not query relationship attributes with not matching key using the ThirdPartyRelationshipAttributeQuery", async function () {
            await consumptionController.attributes.createSharedLocalAttribute({
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
                requestReference: CoreId.from("requestId")
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
            await consumptionController.attributes.createSharedLocalAttribute({
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
                requestReference: CoreId.from("requestId")
            });

            const attributes = await consumptionController.attributes.executeThirdPartyRelationshipAttributeQuery({
                key: "aKey",
                owner: ThirdPartyRelationshipAttributeQueryOwner.Recipient,
                thirdParty: [CoreAddress.from("thirdPartyAddress")]
            });
            expect(attributes).toHaveLength(1);
        });

        test("can call executeThirdPartyRelationshipAttributeQuery with ThirdPartyRelationshipAttributeQueryOwner.ThirdParty", async function () {
            await consumptionController.attributes.createSharedLocalAttribute({
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
                requestReference: CoreId.from("requestId")
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
            await consumptionController.attributes.createSharedLocalAttribute({
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
                requestReference: CoreId.from("requestId")
            });

            await consumptionController.attributes.createSharedLocalAttribute({
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
                requestReference: CoreId.from("requestId")
            });

            await consumptionController.attributes.createSharedLocalAttribute({
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
                requestReference: CoreId.from("requestId")
            });

            const attributes = await consumptionController.attributes.executeThirdPartyRelationshipAttributeQuery({
                key: "aKey",
                owner: ThirdPartyRelationshipAttributeQueryOwner.Empty,
                thirdParty: [CoreAddress.from("thirdPartyAddress"), CoreAddress.from("anotherThirdPartyAddress")]
            });
            expect(attributes).toHaveLength(2);
        });

        test("should allow to query identity attributes", async function () {
            const repositoryAttributeParams: ICreateRepositoryAttributeParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: testAccount.identity.address
                })
            };
            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute(repositoryAttributeParams);

            const relationshipAttributeParams: ICreateSharedLocalAttributeParams = {
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
                requestReference: CoreId.from("reqRef"),
                peer: CoreAddress.from("peer")
            };
            const relationshipAttribute = await consumptionController.attributes.createSharedLocalAttribute(relationshipAttributeParams);

            const query: IIdentityAttributeQuery = {
                valueType: "Nationality"
            };

            const attributes = await consumptionController.attributes.executeIdentityAttributeQuery(query);
            const attributesId = attributes.map((v) => v.id.toString());
            expect(attributesId).not.toContain(relationshipAttribute.id.toString());
            expect(attributesId).toContain(repositoryAttribute.id.toString());
        });

        test("should successfully execute IQL queries only with repository attributes", async function () {
            const repositoryAttributeParams: ICreateRepositoryAttributeParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: testAccount.identity.address
                })
            };
            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute(repositoryAttributeParams);
            await consumptionController.attributes.createSharedLocalAttributeCopy({
                peer: CoreAddress.from("a-fake-peer"),
                requestReference: CoreId.from("a-fake-reference"),
                sourceAttributeId: repositoryAttribute.id,
                attributeId: CoreId.from("fake-attribute-id")
            });

            const iqlQuery: IIQLQuery = { queryString: "Nationality=DE" };
            const matchedAttributes = await consumptionController.attributes.executeIQLQuery(iqlQuery);
            expect(matchedAttributes).toHaveLength(1);
            const matchedAttributeIds = matchedAttributes.map((v) => v.id.toString());
            expect(matchedAttributeIds).toContain(repositoryAttribute.id.toString());
        });

        test("should only return repository attributes on IdentityAttributeQuery", async function () {
            const repositoryAttributeParams: ICreateRepositoryAttributeParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "DisplayName",
                        value: "Dis Play"
                    },
                    owner: testAccount.identity.address
                })
            };
            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute(repositoryAttributeParams);

            const relationshipAttributeParams: ICreateSharedLocalAttributeParams = {
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
                requestReference: CoreId.from("reqRef"),
                peer: CoreAddress.from("peer")
            };
            const relationshipAttribute = await consumptionController.attributes.createSharedLocalAttribute(relationshipAttributeParams);

            const peerSharedIdentityAttributeParams: ICreateSharedLocalAttributeParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "DisplayName",
                        value: "DE"
                    },
                    owner: CoreAddress.from("peer")
                }),
                requestReference: CoreId.from("reqRef"),
                peer: CoreAddress.from("peer")
            };
            const peerAttribute = await consumptionController.attributes.createSharedLocalAttribute(peerSharedIdentityAttributeParams);

            const query: IIdentityAttributeQuery = {
                valueType: "DisplayName"
            };

            const attributes = await consumptionController.attributes.executeIdentityAttributeQuery(query);
            const attributesId = attributes.map((v) => v.id.toString());
            expect(attributes).toHaveLength(1);
            expect(attributesId).not.toContain(relationshipAttribute.id.toString());
            expect(attributesId).not.toContain(peerAttribute.id.toString());
            expect(attributesId).toContain(repositoryAttribute.id.toString());
        });
    });

    describe("delete Attributes", function () {
        test("should delete a simple attribute", async function () {
            const attributeParams: ICreateRepositoryAttributeParams = {
                content: IdentityAttribute.from({
                    value: EMailAddress.from({
                        value: "my@email.address"
                    }),
                    owner: consumptionController.accountController.identity.address
                })
            };
            const simpleAttribute = await consumptionController.attributes.createRepositoryAttribute(attributeParams);

            const createdAttribute = await consumptionController.attributes.getLocalAttribute(simpleAttribute.id);
            expect(createdAttribute).toBeDefined();
            expect(createdAttribute).toStrictEqual(simpleAttribute);

            await consumptionController.attributes.deleteAttribute(simpleAttribute);

            const deletedAttribute = await consumptionController.attributes.getLocalAttribute(simpleAttribute.id);
            expect(deletedAttribute).toBeUndefined();

            mockEventBus.expectLastPublishedEvent(AttributeDeletedEvent);
        });

        test("should delete a complex attribute", async function () {
            const attributeParams: ICreateRepositoryAttributeParams = {
                content: IdentityAttribute.from({
                    value: BirthDate.from({
                        day: 24,
                        month: 12,
                        year: 2000
                    }),
                    owner: consumptionController.accountController.identity.address
                })
            };
            const complexAttribute = await consumptionController.attributes.createRepositoryAttribute(attributeParams);
            mockEventBus.clearPublishedEvents();

            const createdAttribute = await consumptionController.attributes.getLocalAttribute(complexAttribute.id);
            expect(createdAttribute).toBeDefined();
            expect(createdAttribute).toStrictEqual(complexAttribute);

            const childAttributes = await consumptionController.attributes.getLocalAttributes({ parentId: complexAttribute.id.toString() });
            expect(childAttributes).toHaveLength(3);

            await consumptionController.attributes.deleteAttribute(complexAttribute);
            expect(mockEventBus.publishedEvents).toHaveLength(1 + childAttributes.length);
            for (const event of mockEventBus.publishedEvents) {
                expect(event.namespace).toBe(AttributeDeletedEvent.namespace);
            }

            const deletedAttribute = await consumptionController.attributes.getLocalAttribute(complexAttribute.id);
            expect(deletedAttribute).toBeUndefined();

            for (const childAttribute of childAttributes) {
                const deletedChildAttribute = await consumptionController.attributes.getLocalAttribute(childAttribute.id);
                expect(deletedChildAttribute).toBeUndefined();
            }
        });

        describe("should validate and execute full attribute deletion process", function () {
            let predecessorRepositoryAttribute: LocalAttribute;
            let successorRepositoryAttribute: LocalAttribute;
            let predecessorOwnSharedIdentityAttribute: LocalAttribute;

            beforeEach(async () => {
                predecessorRepositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                    content: IdentityAttribute.from({
                        value: EMailAddress.from({
                            value: "my@email.address"
                        }),
                        owner: consumptionController.accountController.identity.address
                    })
                });

                const repositorySuccessorParams: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "EMailAddress",
                            value: "my-new@email.address"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                };
                ({ predecessor: predecessorRepositoryAttribute, successor: successorRepositoryAttribute } = await consumptionController.attributes.succeedRepositoryAttribute(
                    predecessorRepositoryAttribute.id,
                    repositorySuccessorParams
                ));

                predecessorOwnSharedIdentityAttribute = await consumptionController.attributes.createSharedLocalAttributeCopy({
                    sourceAttributeId: predecessorRepositoryAttribute.id,
                    peer: CoreAddress.from("peer"),
                    requestReference: CoreId.from("reqRef")
                });

                const sharedSuccessorParams: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "EMailAddress",
                            value: "my-new@email.address"
                        },
                        owner: consumptionController.accountController.identity.address
                    }),
                    shareInfo: {
                        peer: CoreAddress.from("peer"),
                        requestReference: CoreId.from("reqRef2"),
                        sourceAttribute: successorRepositoryAttribute.id
                    }
                };
                ({ predecessor: predecessorOwnSharedIdentityAttribute } = await consumptionController.attributes.succeedOwnSharedIdentityAttribute(
                    predecessorOwnSharedIdentityAttribute.id,
                    sharedSuccessorParams
                ));
            });

            test("should return validation success for full attribute deletion process of valid succeeded shared attribute", async function () {
                const result = await consumptionController.attributes.validateFullAttributeDeletionProcess(successorRepositoryAttribute);
                expect(result.isSuccess()).toBe(true);
            });

            test("should return validation error for full attribute deletion process of attribute with invalid succeededBy field", async function () {
                const invalidPredecessor = await consumptionController.attributes.createAttributeUnsafe({
                    content: IdentityAttribute.from({
                        value: EMailAddress.from({
                            value: "my@email.address"
                        }),
                        owner: consumptionController.accountController.identity.address
                    }),
                    succeededBy: CoreId.from("invalidSuccessorId")
                });

                const result = await consumptionController.attributes.validateFullAttributeDeletionProcess(invalidPredecessor);
                expect(result).errorValidationResult({ message: "The successor does not exist.", code: "error.consumption.attributes.successorDoesNotExist" });
            });

            test("should delete an attribute", async function () {
                const attributeBeforeDeletion = await consumptionController.attributes.getLocalAttribute(successorRepositoryAttribute.id);
                expect(attributeBeforeDeletion).toStrictEqual(successorRepositoryAttribute);

                await consumptionController.attributes.executeFullAttributeDeletionProcess(successorRepositoryAttribute);
                const result = await consumptionController.attributes.getLocalAttribute(successorRepositoryAttribute.id);
                expect(result).toBeUndefined();
            });

            test("should detach successor of deleted attribute", async function () {
                const successorBeforeDeletion = await consumptionController.attributes.getLocalAttribute(successorRepositoryAttribute.id);
                expect(successorBeforeDeletion!.succeeds).toStrictEqual(predecessorRepositoryAttribute.id);

                await consumptionController.attributes.executeFullAttributeDeletionProcess(predecessorRepositoryAttribute);
                const updatedSuccessorRepositoryAttribute = await consumptionController.attributes.getLocalAttribute(successorRepositoryAttribute.id);
                expect(updatedSuccessorRepositoryAttribute!.succeeds).toBeUndefined();
            });

            test("should detach shared attribute copies of deleted attribute", async function () {
                const sharedAttributeBeforeDeletion = await consumptionController.attributes.getLocalAttribute(predecessorOwnSharedIdentityAttribute.id);
                expect(sharedAttributeBeforeDeletion!.shareInfo!.sourceAttribute).toStrictEqual(predecessorRepositoryAttribute.id);

                await consumptionController.attributes.executeFullAttributeDeletionProcess(predecessorRepositoryAttribute);
                const updatedPredecessorOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute(predecessorOwnSharedIdentityAttribute.id);
                expect(updatedPredecessorOwnSharedIdentityAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
            });

            test("should delete predecessors of deleted attribute", async function () {
                const predecessorBeforeDeletion = await consumptionController.attributes.getLocalAttribute(predecessorRepositoryAttribute.id);
                expect(JSON.stringify(predecessorBeforeDeletion)).toStrictEqual(JSON.stringify(predecessorRepositoryAttribute));

                await consumptionController.attributes.executeFullAttributeDeletionProcess(successorRepositoryAttribute);
                const result = await consumptionController.attributes.getLocalAttribute(predecessorRepositoryAttribute.id);
                expect(result).toBeUndefined();
            });

            test("should detach shared attribute copies of predecessors of deleted attribute", async function () {
                const sharedPredecessorBeforeDeletion = await consumptionController.attributes.getLocalAttribute(predecessorOwnSharedIdentityAttribute.id);
                expect(sharedPredecessorBeforeDeletion!.shareInfo!.sourceAttribute).toStrictEqual(predecessorRepositoryAttribute.id);

                await consumptionController.attributes.executeFullAttributeDeletionProcess(successorRepositoryAttribute);
                const updatedPredecessorOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute(predecessorOwnSharedIdentityAttribute.id);
                expect(updatedPredecessorOwnSharedIdentityAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
            });

            test("should change default from deleted attribute to newest of the same value type if another exists and setDefaultRepositoryAttributes is true", async function () {
                const defaultRepositoryAttribute = await appConsumptionController.attributes.createRepositoryAttribute({
                    content: IdentityAttribute.from({
                        value: EMailAddress.from({
                            value: "my@email.address"
                        }),
                        owner: appConsumptionController.accountController.identity.address
                    })
                });

                const otherRepositoryAttribute = await appConsumptionController.attributes.createRepositoryAttribute({
                    content: IdentityAttribute.from({
                        value: EMailAddress.from({
                            value: "my2@email.address"
                        }),
                        owner: appConsumptionController.accountController.identity.address
                    })
                });

                const otherNewerRepositoryAttribute = await appConsumptionController.attributes.createRepositoryAttribute({
                    content: IdentityAttribute.from({
                        value: EMailAddress.from({
                            value: "my3@email.address"
                        }),
                        owner: appConsumptionController.accountController.identity.address
                    })
                });

                expect(defaultRepositoryAttribute.isDefault).toBe(true);
                expect(otherRepositoryAttribute.isDefault).toBeUndefined();
                expect(otherNewerRepositoryAttribute.isDefault).toBeUndefined();

                await appConsumptionController.attributes.executeFullAttributeDeletionProcess(defaultRepositoryAttribute);
                const updatedOtherRepositoryAttribute = await appConsumptionController.attributes.getLocalAttribute(otherNewerRepositoryAttribute.id);
                expect(updatedOtherRepositoryAttribute!.isDefault).toBe(true);
            });

            test("should not set a default if the deleted default attribute had predecessors but no other candidate exists and setDefaultRepositoryAttributes is true", async function () {
                const predecessorRepositoryAttribute = await appConsumptionController.attributes.createRepositoryAttribute({
                    content: IdentityAttribute.from({
                        value: EMailAddress.from({
                            value: "my@email.address"
                        }),
                        owner: appConsumptionController.accountController.identity.address
                    })
                });

                const repositorySuccessorParams: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "EMailAddress",
                            value: "my-new@email.address"
                        },
                        owner: appConsumptionController.accountController.identity.address
                    })
                };
                const successionResult = await appConsumptionController.attributes.succeedRepositoryAttribute(predecessorRepositoryAttribute.id, repositorySuccessorParams);
                const { successor: successorRepositoryAttribute } = successionResult;

                expect(successorRepositoryAttribute.isDefault).toBe(true);
                await appConsumptionController.attributes.executeFullAttributeDeletionProcess(successorRepositoryAttribute);

                const defaultAttributes = await appConsumptionController.attributes.getLocalAttributes({ isDefault: "true" });
                expect(defaultAttributes).toHaveLength(0);
            });
        });

        describe("should validate and execute full attribute deletion process for child attribute", function () {
            let predecessorComplexAttribute: LocalAttribute;
            let successorComplexAttribute: LocalAttribute;

            let predecessorChildAttribute: LocalAttribute;
            let successorChildAttribute: LocalAttribute;

            let predecessorChildOwnSharedIdentityAttribute: LocalAttribute;

            beforeEach(async () => {
                predecessorComplexAttribute = await consumptionController.attributes.createRepositoryAttribute({
                    content: IdentityAttribute.from({
                        value: BirthDate.from({
                            day: 29,
                            month: 2,
                            year: 2000
                        }),
                        owner: consumptionController.accountController.identity.address
                    })
                });

                const successorParams: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: BirthDate.from({
                            day: 28,
                            month: 2,
                            year: 2000
                        }),
                        owner: consumptionController.accountController.identity.address
                    })
                };
                ({ predecessor: predecessorComplexAttribute, successor: successorComplexAttribute } = await consumptionController.attributes.succeedRepositoryAttribute(
                    predecessorComplexAttribute.id,
                    successorParams
                ));

                predecessorChildAttribute = (
                    await consumptionController.attributes.getLocalAttributes({
                        parentId: predecessorComplexAttribute.id.toString(),
                        "content.value.@type": "BirthDay"
                    })
                )[0];
                successorChildAttribute = (
                    await consumptionController.attributes.getLocalAttributes({
                        parentId: successorComplexAttribute.id.toString(),
                        "content.value.@type": "BirthDay"
                    })
                )[0];

                predecessorChildOwnSharedIdentityAttribute = await consumptionController.attributes.createSharedLocalAttributeCopy({
                    sourceAttributeId: predecessorChildAttribute.id,
                    peer: CoreAddress.from("peer"),
                    requestReference: CoreId.from("reqRef")
                });
            });

            test("should return validation success for full attribute deletion process of valid succeeded child attribute", async function () {
                const result = await consumptionController.attributes.validateFullAttributeDeletionProcess(successorComplexAttribute);
                expect(result.isSuccess()).toBe(true);
            });

            test("should return validation error for full attribute deletion process of child attribute with invalid succeededBy field", async function () {
                const invalidChildPredecessor = await consumptionController.attributes.createAttributeUnsafe({
                    content: IdentityAttribute.from({
                        value: BirthDate.from({
                            day: 28,
                            month: 2,
                            year: 2000
                        }),
                        owner: consumptionController.accountController.identity.address
                    }),
                    parentId: predecessorComplexAttribute.id,
                    succeededBy: CoreId.from("invalidSuccessorId")
                });

                const result = await consumptionController.attributes.validateFullAttributeDeletionProcess(invalidChildPredecessor);
                expect(result).errorValidationResult({ message: "The successor does not exist.", code: "error.consumption.attributes.successorDoesNotExist" });
            });

            test("should delete the child attribute", async function () {
                const childAttributeBeforeDeletion = await consumptionController.attributes.getLocalAttribute(successorChildAttribute.id);
                expect(childAttributeBeforeDeletion).toStrictEqual(successorChildAttribute);

                await consumptionController.attributes.executeFullAttributeDeletionProcess(successorComplexAttribute);
                const result = await consumptionController.attributes.getLocalAttribute(successorChildAttribute.id);
                expect(result).toBeUndefined();
            });

            test("should detach successor of deleted child attribute", async function () {
                const childSuccessorBeforeDeletion = await consumptionController.attributes.getLocalAttribute(successorChildAttribute.id);
                expect(childSuccessorBeforeDeletion!.succeeds).toStrictEqual(predecessorChildAttribute.id);

                await consumptionController.attributes.executeFullAttributeDeletionProcess(predecessorComplexAttribute);
                const updatedSuccessorChildAttribute = await consumptionController.attributes.getLocalAttribute(successorChildAttribute.id);
                expect(updatedSuccessorChildAttribute!.succeeds).toBeUndefined();
            });

            test("should detach shared attribute copies of deleted child attribute", async function () {
                const sharedChildAttributeBeforeDeletion = await consumptionController.attributes.getLocalAttribute(predecessorChildOwnSharedIdentityAttribute.id);
                expect(sharedChildAttributeBeforeDeletion!.shareInfo!.sourceAttribute).toStrictEqual(predecessorChildAttribute.id);

                await consumptionController.attributes.executeFullAttributeDeletionProcess(predecessorComplexAttribute);
                const updatedChildPredecessorOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute(predecessorChildOwnSharedIdentityAttribute.id);
                expect(updatedChildPredecessorOwnSharedIdentityAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
            });

            test("should delete predecessors of deleted child attribute", async function () {
                const predecessorBeforeDeletion = await consumptionController.attributes.getLocalAttribute(predecessorChildAttribute.id);
                expect(JSON.stringify(predecessorBeforeDeletion)).toStrictEqual(JSON.stringify(predecessorChildAttribute));

                await consumptionController.attributes.executeFullAttributeDeletionProcess(successorComplexAttribute);
                const result = await consumptionController.attributes.getLocalAttribute(predecessorChildAttribute.id);
                expect(result).toBeUndefined();
            });

            test("should detach shared attribute copies of predecessors of deleted child attribute", async function () {
                const sharedChildPredecessorBeforeDeletion = await consumptionController.attributes.getLocalAttribute(predecessorChildOwnSharedIdentityAttribute.id);
                expect(sharedChildPredecessorBeforeDeletion!.shareInfo!.sourceAttribute).toStrictEqual(predecessorChildAttribute.id);

                await consumptionController.attributes.executeFullAttributeDeletionProcess(successorComplexAttribute);
                const updatedChildPredecessorOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute(predecessorChildOwnSharedIdentityAttribute.id);
                expect(updatedChildPredecessorOwnSharedIdentityAttribute!.shareInfo!.sourceAttribute).toBeUndefined();
            });
        });
    });

    describe("succeed Attributes", function () {
        describe("Common validator", function () {
            test("should catch if content doesn't change", async function () {
                const predecessor = await consumptionController.attributes.createRepositoryAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address,
                        tags: ["x+%+aTag"]
                    })
                });

                const successorData: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address,
                        tags: ["x+%+aTag"]
                    })
                };

                const validationResult = await consumptionController.attributes.validateAttributeSuccessionCommon(predecessor.id, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.successionMustChangeContent"
                });
            });

            test("should catch if the successor attribute already exist, if an explicit id is provided", async function () {
                const predecessor = await consumptionController.attributes.createRepositoryAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                const successorData = {
                    id: CoreId.from("successorId"),
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                };
                await consumptionController.attributes.createRepositoryAttribute(successorData);

                const validationResult = await consumptionController.attributes.validateAttributeSuccessionCommon(predecessor.id, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.successorMustNotYetExist"
                });
            });

            test("should catch if the successor is not linked to predecessor, if succeeds is explicitly set", async function () {
                const predecessor = await consumptionController.attributes.createRepositoryAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                const successorData: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: consumptionController.accountController.identity.address
                    }),
                    succeeds: CoreId.from("differentAttributeId")
                };

                const validationResult = await consumptionController.attributes.validateAttributeSuccessionCommon(predecessor.id, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.setPredecessorIdDoesNotMatchActualPredecessorId"
                });
            });

            test("should catch if the successor already has a successor itself", async function () {
                const predecessor = await consumptionController.attributes.createRepositoryAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                const successorData: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: consumptionController.accountController.identity.address
                    }),
                    succeededBy: CoreId.from("differentAttributeId")
                };

                const validationResult = await consumptionController.attributes.validateAttributeSuccessionCommon(predecessor.id, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.successorMustNotHaveASuccessor"
                });
            });

            test("should catch if the successor has parent", async function () {
                const predecessor = await consumptionController.attributes.createRepositoryAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                const successorData: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: consumptionController.accountController.identity.address
                    }),
                    parentId: CoreId.from("parentId")
                };

                const validationResult = await consumptionController.attributes.validateAttributeSuccessionCommon(predecessor.id, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.cannotSucceedChildOfComplexAttribute"
                });
            });

            test("should catch if the predecessor does not exist", async function () {
                const successorData: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                };

                const validationResult = await consumptionController.attributes.validateAttributeSuccessionCommon(CoreId.from("doesntExist"), successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.predecessorDoesNotExist"
                });
            });

            test("should catch if the predecessor already has a successor", async function () {
                const predecessor = await consumptionController.attributes.createAttributeUnsafe({
                    succeededBy: CoreId.from("successorId"),
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                const successorData: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                };

                const validationResult = await consumptionController.attributes.validateAttributeSuccessionCommon(predecessor.id, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.cannotSucceedAttributesWithASuccessor"
                });
            });

            test("should catch if the predecessor has parent", async function () {
                const predecessor = await consumptionController.attributes.createAttributeUnsafe({
                    parentId: CoreId.from("parentId"),
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                const successorData: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                };

                const validationResult = await consumptionController.attributes.validateAttributeSuccessionCommon(predecessor.id, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.cannotSucceedChildOfComplexAttribute"
                });
            });

            test("should catch attempted change of owner", async function () {
                const predecessor = await consumptionController.attributes.createRepositoryAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                const successorData: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: CoreAddress.from("differentAddress")
                    })
                };

                const validationResult = await consumptionController.attributes.validateAttributeSuccessionCommon(predecessor.id, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.successionMustNotChangeOwner"
                });
            });

            test("should catch attempted change of content type", async function () {
                const predecessor = await consumptionController.attributes.createRepositoryAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                const successorData: IAttributeSuccessorParams = {
                    content: RelationshipAttribute.from({
                        key: "DisplayName",
                        value: {
                            "@type": "ProprietaryString",
                            value: "aDisplayName",
                            title: "Display Name"
                        },
                        owner: consumptionController.accountController.identity.address,
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    })
                };

                const validationResult = await consumptionController.attributes.validateAttributeSuccessionCommon(predecessor.id, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.successionMustNotChangeContentType"
                });
            });

            test("should catch attempted change of value type", async function () {
                const predecessor = await consumptionController.attributes.createRepositoryAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "BirthName",
                            value: "aBirthName"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                const successorData: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "BirthCountry",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                };

                const validationResult = await consumptionController.attributes.validateAttributeSuccessionCommon(predecessor.id, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.successionMustNotChangeValueType"
                });
            });

            test("should catch if the predecessor has a deletionInfo", async function () {
                const predecessor = await consumptionController.attributes.createAttributeUnsafe({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address
                    }),
                    deletionInfo: LocalAttributeDeletionInfo.from({
                        deletionStatus: LocalAttributeDeletionStatus.ToBeDeleted,
                        deletionDate: CoreDate.utc().add({ days: 1 })
                    })
                });
                const successorData: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                };

                const validationResult = await consumptionController.attributes.validateAttributeSuccessionCommon(predecessor.id, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.cannotSucceedAttributesWithDeletionInfo"
                });
            });

            test("should allow succession if the predecessor has a deletionInfo with status DeletionRequestRejected", async function () {
                const predecessor = await consumptionController.attributes.createAttributeUnsafe({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address")
                    }),
                    deletionInfo: LocalAttributeDeletionInfo.from({
                        deletionStatus: LocalAttributeDeletionStatus.DeletionRequestRejected,
                        deletionDate: CoreDate.utc().subtract({ days: 1 })
                    })
                });
                const successorData: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: CoreAddress.from("address")
                    })
                };

                const validationResult = await consumptionController.attributes.validateAttributeSuccessionCommon(predecessor.id, successorData);
                expect(validationResult.isSuccess()).toBe(true);
            });
        });

        describe("Validator for own shared identity attribute successions", function () {
            let predecessorRepositoryAttribute: LocalAttribute;
            let successorRepositoryAttribute: LocalAttribute;
            let predecessorOwnSharedIdentityAttribute: LocalAttribute;
            let successorOwnSharedIdentityAttributeParams: IAttributeSuccessorParams;
            beforeEach(async function () {
                predecessorRepositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Citizenship",
                            value: "AF"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });

                ({ successor: successorRepositoryAttribute } = await consumptionController.attributes.succeedRepositoryAttribute(predecessorRepositoryAttribute.id, {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Citizenship",
                            value: "US"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                }));

                predecessorOwnSharedIdentityAttribute = await consumptionController.attributes.createSharedLocalAttributeCopy({
                    sourceAttributeId: predecessorRepositoryAttribute.id,
                    peer: CoreAddress.from("peer"),
                    requestReference: CoreId.from("reqRef")
                });

                successorOwnSharedIdentityAttributeParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Citizenship",
                            value: "US"
                        },
                        owner: consumptionController.accountController.identity.address
                    }),
                    shareInfo: {
                        peer: CoreAddress.from("peer"),
                        notificationReference: CoreId.from("notRef"),
                        sourceAttribute: successorRepositoryAttribute.id
                    }
                };
            });

            test("should catch if the source attributes do not succeed one another", async function () {
                predecessorRepositoryAttribute.succeededBy = undefined;
                await consumptionController.attributes.updateAttributeUnsafe(predecessorRepositoryAttribute);

                successorRepositoryAttribute.succeeds = undefined;
                await consumptionController.attributes.updateAttributeUnsafe(successorRepositoryAttribute);

                const validationResult = await consumptionController.attributes.validateOwnSharedIdentityAttributeSuccession(
                    predecessorOwnSharedIdentityAttribute.id,
                    successorOwnSharedIdentityAttributeParams
                );
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.successorSourceDoesNotSucceedPredecessorSource"
                });
            });

            test("should catch if the predecessor is not an own shared IdentityAttribute", async function () {
                predecessorOwnSharedIdentityAttribute.shareInfo = undefined;
                await consumptionController.attributes.updateAttributeUnsafe(predecessorOwnSharedIdentityAttribute);

                const validationResult = await consumptionController.attributes.validateOwnSharedIdentityAttributeSuccession(
                    predecessorOwnSharedIdentityAttribute.id,
                    successorOwnSharedIdentityAttributeParams
                );
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.predecessorIsNotOwnSharedIdentityAttribute"
                });
            });

            test("should catch if the successor is not an own shared IdentityAttribute", async function () {
                successorOwnSharedIdentityAttributeParams.shareInfo = undefined;

                const validationResult = await consumptionController.attributes.validateOwnSharedIdentityAttributeSuccession(
                    predecessorOwnSharedIdentityAttribute.id,
                    successorOwnSharedIdentityAttributeParams
                );
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.successorIsNotOwnSharedIdentityAttribute"
                });
            });

            test("should catch if the peer is changed during succession", async function () {
                successorOwnSharedIdentityAttributeParams.shareInfo!.peer = CoreAddress.from("falsyPeer");

                const validationResult = await consumptionController.attributes.validateOwnSharedIdentityAttributeSuccession(
                    predecessorOwnSharedIdentityAttribute.id,
                    successorOwnSharedIdentityAttributeParams
                );
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.successionMustNotChangePeer"
                });
            });

            test("should catch if the predecessor source attribute is not a repository attribute", async function () {
                predecessorOwnSharedIdentityAttribute.shareInfo!.sourceAttribute = predecessorOwnSharedIdentityAttribute.id;
                await consumptionController.attributes.updateAttributeUnsafe(predecessorOwnSharedIdentityAttribute);

                const validationResult = await consumptionController.attributes.validateOwnSharedIdentityAttributeSuccession(
                    predecessorOwnSharedIdentityAttribute.id,
                    successorOwnSharedIdentityAttributeParams
                );
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.predecessorSourceAttributeIsNotRepositoryAttribute"
                });
            });

            test("should catch if the successor source attribute is not a repository attribute", async function () {
                successorRepositoryAttribute.shareInfo = LocalAttributeShareInfo.from({
                    peer: CoreAddress.from("peer"),
                    requestReference: CoreId.from("reqRef")
                });
                await consumptionController.attributes.updateAttributeUnsafe(successorRepositoryAttribute);

                successorOwnSharedIdentityAttributeParams.shareInfo!.sourceAttribute = successorRepositoryAttribute.id;

                const validationResult = await consumptionController.attributes.validateOwnSharedIdentityAttributeSuccession(
                    predecessorOwnSharedIdentityAttribute.id,
                    successorOwnSharedIdentityAttributeParams
                );
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.successorSourceAttributeIsNotRepositoryAttribute"
                });
            });

            test("should catch if the predecessor source attribute's content doesn't match the own shared identity attribute content", async function () {
                predecessorOwnSharedIdentityAttribute.content = IdentityAttribute.from({
                    value: {
                        "@type": "Citizenship",
                        value: "DK"
                    },
                    owner: consumptionController.accountController.identity.address
                });
                await consumptionController.attributes.updateAttributeUnsafe(predecessorOwnSharedIdentityAttribute);

                const validationResult = await consumptionController.attributes.validateOwnSharedIdentityAttributeSuccession(
                    predecessorOwnSharedIdentityAttribute.id,
                    successorOwnSharedIdentityAttributeParams
                );
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.predecessorSourceContentIsNotEqualToCopyContent"
                });
            });

            test("should catch if the successor source attribute's content doesn't match the own shared identity attribute content", async function () {
                successorOwnSharedIdentityAttributeParams.content = IdentityAttribute.from({
                    value: {
                        "@type": "Citizenship",
                        value: "DK"
                    },
                    owner: consumptionController.accountController.identity.address
                });
                const validationResult = await consumptionController.attributes.validateOwnSharedIdentityAttributeSuccession(
                    predecessorOwnSharedIdentityAttribute.id,
                    successorOwnSharedIdentityAttributeParams
                );
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.successorSourceContentIsNotEqualToCopyContent"
                });
            });

            test("should catch if no source attribute is specified for the successor", async function () {
                successorOwnSharedIdentityAttributeParams.shareInfo!.sourceAttribute = undefined;

                const validationResult = await consumptionController.attributes.validateOwnSharedIdentityAttributeSuccession(
                    predecessorOwnSharedIdentityAttribute.id,
                    successorOwnSharedIdentityAttributeParams
                );
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.successorSourceAttributeIsNotSpecified"
                });
            });

            test("should catch if successor source attribute doesn't exist", async function () {
                await consumptionController.attributes.deleteAttributeUnsafe(successorRepositoryAttribute.id);

                const validationResult = await consumptionController.attributes.validateOwnSharedIdentityAttributeSuccession(
                    predecessorOwnSharedIdentityAttribute.id,
                    successorOwnSharedIdentityAttributeParams
                );
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.successorSourceAttributeDoesNotExist"
                });
            });

            test("should allow to succeed an own shared identity attribute whose predecessor source attribute was deleted", async function () {
                await consumptionController.attributes.deleteAttributeUnsafe(predecessorRepositoryAttribute.id);

                predecessorOwnSharedIdentityAttribute.shareInfo!.sourceAttribute = undefined;
                await consumptionController.attributes.updateAttributeUnsafe(predecessorOwnSharedIdentityAttribute);

                successorRepositoryAttribute.succeeds = undefined;
                await consumptionController.attributes.updateAttributeUnsafe(successorRepositoryAttribute);

                const validationResult = await consumptionController.attributes.validateOwnSharedIdentityAttributeSuccession(
                    predecessorOwnSharedIdentityAttribute.id,
                    successorOwnSharedIdentityAttributeParams
                );
                expect(validationResult).successfulValidationResult();
            });
        });

        describe("Happy paths for attribute successions", function () {
            test("should succeed a repository attribute", async function () {
                const predecessor = await consumptionController.attributes.createRepositoryAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                const successorParams: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                };

                const { predecessor: updatedPredecessor, successor } = await consumptionController.attributes.succeedRepositoryAttribute(predecessor.id, successorParams);
                expect(successor).toBeDefined();
                expect(updatedPredecessor).toBeDefined();
                expect(predecessor.id.equals(updatedPredecessor.id)).toBe(true);
                expect(updatedPredecessor.succeededBy!.equals(successor.id)).toBe(true);
                expect(successor.succeeds!.equals(updatedPredecessor.id)).toBe(true);
                expect((predecessor.content.value.toJSON() as any).value).toBe("DE");
                expect((successor.content.value.toJSON() as any).value).toBe("US");
            });

            test("should trim whitespace when succeeding a repository attribute", async function () {
                const predecessor = await consumptionController.attributes.createRepositoryAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "GivenName",
                            value: "    aGivenName  "
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                const successorParams: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "GivenName",
                            value: "    anotherGivenName    "
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                };

                const { successor } = await consumptionController.attributes.succeedRepositoryAttribute(predecessor.id, successorParams);
                expect(successor).toBeDefined();
                expect((successor.content.value.toJSON() as any).value).toBe("anotherGivenName");
            });

            test("should succeed a repository attribute updating tags but not the value", async function () {
                const predecessor = await consumptionController.attributes.createRepositoryAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address,
                        tags: ["x+%+aTag"]
                    })
                });

                const successorParams: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address,
                        tags: ["x+%+aTag", "x+%+anotherTag"]
                    })
                };

                const { predecessor: updatedPredecessor, successor } = await consumptionController.attributes.succeedRepositoryAttribute(predecessor.id, successorParams);
                expect(successor).toBeDefined();
                expect(updatedPredecessor).toBeDefined();
                expect(predecessor.id.equals(updatedPredecessor.id)).toBe(true);
                expect(updatedPredecessor.succeededBy!.equals(successor.id)).toBe(true);
                expect(successor.succeeds!.equals(updatedPredecessor.id)).toBe(true);
                expect((updatedPredecessor.content.value.toJSON() as any).value).toBe("DE");
                expect((successor.content.value.toJSON() as any).value).toBe("DE");
                expect((updatedPredecessor.content as IdentityAttribute).tags).toStrictEqual(["x+%+aTag"]);
                expect((successor.content as IdentityAttribute).tags).toStrictEqual(["x+%+aTag", "x+%+anotherTag"]);
            });

            test("should make successor default succeeding a default repository attribute", async function () {
                const predecessor = await appConsumptionController.attributes.createRepositoryAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: appConsumptionController.accountController.identity.address
                    })
                });
                expect(predecessor.isDefault).toBe(true);

                const successorParams: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: appConsumptionController.accountController.identity.address
                    })
                };

                const { predecessor: updatedPredecessor, successor } = await appConsumptionController.attributes.succeedRepositoryAttribute(predecessor.id, successorParams);
                expect(successor.isDefault).toBe(true);
                expect(updatedPredecessor.isDefault).toBeUndefined();
            });

            test("should succeed an own shared identity attribute", async function () {
                const predecessorRepo = await consumptionController.attributes.createRepositoryAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                const successorRepoParams: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                };
                const { successor: successorRepo } = await consumptionController.attributes.succeedRepositoryAttribute(predecessorRepo.id, successorRepoParams);

                const predecessor = await consumptionController.attributes.createSharedLocalAttributeCopy({
                    sourceAttributeId: predecessorRepo.id,
                    peer: CoreAddress.from("peer"),
                    requestReference: CoreId.from("reqRef")
                });

                const successorParams: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: consumptionController.accountController.identity.address
                    }),
                    shareInfo: {
                        peer: CoreAddress.from("peer"),
                        requestReference: CoreId.from("reqRef2"),
                        sourceAttribute: successorRepo.id
                    }
                };
                const { predecessor: updatedPredecessor, successor } = await consumptionController.attributes.succeedOwnSharedIdentityAttribute(predecessor.id, successorParams);
                expect(successor).toBeDefined();
                expect(updatedPredecessor).toBeDefined();
                expect(predecessor.id.equals(updatedPredecessor.id)).toBe(true);
                expect(updatedPredecessor.succeededBy!.equals(successor.id)).toBe(true);
                expect(successor.succeeds!.equals(updatedPredecessor.id)).toBe(true);
                expect(successor.succeeds!.equals(predecessor.id)).toBe(true);
                expect((successor.content.value.toJSON() as any).value).toBe("US");
            });

            test("should succeed an own shared identity attribute skipping one version", async function () {
                const predecessorRepo = await consumptionController.attributes.createRepositoryAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });
                const interimRepoParams: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                };
                const successorRepoParams: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "CZ"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                };
                const { successor: interimRepo } = await consumptionController.attributes.succeedRepositoryAttribute(predecessorRepo.id, interimRepoParams);
                const { successor: successorRepo } = await consumptionController.attributes.succeedRepositoryAttribute(interimRepo.id, successorRepoParams);

                const predecessor = await consumptionController.attributes.createSharedLocalAttributeCopy({
                    sourceAttributeId: predecessorRepo.id,
                    peer: CoreAddress.from("peer"),
                    requestReference: CoreId.from("reqRef")
                });

                const successorParams: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "CZ"
                        },
                        owner: consumptionController.accountController.identity.address
                    }),
                    shareInfo: {
                        peer: CoreAddress.from("peer"),
                        requestReference: CoreId.from("reqRef2"),
                        sourceAttribute: successorRepo.id
                    }
                };
                const { predecessor: updatedPredecessor, successor } = await consumptionController.attributes.succeedOwnSharedIdentityAttribute(predecessor.id, successorParams);
                expect(successor).toBeDefined();
                expect(updatedPredecessor).toBeDefined();
                expect(predecessor.id.equals(updatedPredecessor.id)).toBe(true);
                expect(updatedPredecessor.succeededBy!.equals(successor.id)).toBe(true);
                expect(successor.succeeds!.equals(updatedPredecessor.id)).toBe(true);
                expect(successor.succeeds!.equals(predecessor.id)).toBe(true);
                expect((successor.content.value.toJSON() as any).value).toBe("CZ");
            });

            describe("Complex attribute successions", function () {
                let version0ChildValues: string[];
                let version1ChildValues: string[];
                let repoVersion0: LocalAttribute;
                let repoVersion1Params: IAttributeSuccessorParams;
                beforeEach(async function () {
                    version0ChildValues = ["aStreet", "aHouseNo", "aZipCode", "aCity", "DE"];

                    const identityAttribute = IdentityAttribute.from({
                        value: {
                            "@type": "StreetAddress",
                            recipient: "aRecipient",
                            street: version0ChildValues[0],
                            houseNo: version0ChildValues[1],
                            zipCode: version0ChildValues[2],
                            city: version0ChildValues[3],
                            country: version0ChildValues[4]
                        },
                        owner: consumptionController.accountController.identity.address
                    });

                    repoVersion0 = await consumptionController.attributes.createRepositoryAttribute({
                        content: identityAttribute
                    });

                    version1ChildValues = ["aNewStreet", "aNewHouseNo", "aNewZipCode", "aNewCity", "DE"];

                    repoVersion1Params = {
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "StreetAddress",
                                recipient: "aNewRecipient",
                                street: version1ChildValues[0],
                                houseNo: version1ChildValues[1],
                                zipCode: version1ChildValues[2],
                                city: version1ChildValues[3],
                                country: version1ChildValues[4]
                            },
                            owner: consumptionController.accountController.identity.address
                        })
                    };
                });

                test("should succeed a complex repository attribute", async function () {
                    const { predecessor: updatedRepoVersion0, successor: repoVersion1 } = await consumptionController.attributes.succeedRepositoryAttribute(
                        repoVersion0.id,
                        repoVersion1Params
                    );
                    expect(repoVersion1).toBeDefined();
                    expect(updatedRepoVersion0).toBeDefined();
                    expect(repoVersion0.id.equals(updatedRepoVersion0.id)).toBe(true);
                    expect(updatedRepoVersion0.succeededBy!.equals(repoVersion1.id)).toBe(true);
                    expect(repoVersion1.succeeds!.equals(updatedRepoVersion0.id)).toBe(true);

                    expect((updatedRepoVersion0.content.value as StreetAddress).recipient).toBe("aRecipient");
                    expect((repoVersion1.content.value as StreetAddress).recipient).toBe("aNewRecipient");

                    const repoVersion0ChildAttributes = await consumptionController.attributes.getLocalAttributes({
                        parentId: repoVersion0.id.toString()
                    });
                    const repoVersion1ChildAttributes = await consumptionController.attributes.getLocalAttributes({
                        parentId: repoVersion1.id.toString()
                    });

                    const numberOfChildAttributes = version0ChildValues.length;
                    expect(repoVersion0ChildAttributes).toHaveLength(numberOfChildAttributes);
                    expect(repoVersion1ChildAttributes).toHaveLength(numberOfChildAttributes);

                    for (let i = 0; i < numberOfChildAttributes; i++) {
                        expect(repoVersion0ChildAttributes[i].succeededBy).toStrictEqual(repoVersion1ChildAttributes[i].id);
                        expect(repoVersion1ChildAttributes[i].succeeds).toStrictEqual(repoVersion0ChildAttributes[i].id);

                        expect(repoVersion0ChildAttributes[i].parentId).toStrictEqual(repoVersion0.id);
                        expect(repoVersion1ChildAttributes[i].parentId).toStrictEqual(repoVersion1.id);

                        expect(repoVersion0ChildAttributes[i].content.value.toString()).toStrictEqual(version0ChildValues[i]);
                        expect(repoVersion1ChildAttributes[i].content.value.toString()).toStrictEqual(version1ChildValues[i]);
                    }
                });

                test("should trim whitespace when succeeding a complex repository attribute", async function () {
                    const version1ChildValues = ["  aNewStreet  ", "  aNewHouseNo ", "    aNewZipCode ", "    aNewCity    ", "DE"];
                    const trimmedVersion1ChildValues = version1ChildValues.map((value) => value.trim());

                    const repoVersion1Params = {
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "StreetAddress",
                                recipient: "    aNewRecipient   ",
                                street: version1ChildValues[0],
                                houseNo: version1ChildValues[1],
                                zipCode: version1ChildValues[2],
                                city: version1ChildValues[3],
                                country: version1ChildValues[4]
                            },
                            owner: consumptionController.accountController.identity.address
                        })
                    };

                    const { successor: repoVersion1 } = await consumptionController.attributes.succeedRepositoryAttribute(repoVersion0.id, repoVersion1Params);
                    expect((repoVersion1.content.value as StreetAddress).recipient).toBe("aNewRecipient");
                    expect((repoVersion1.content.value as StreetAddress).street.value).toBe("aNewStreet");
                    expect((repoVersion1.content.value as StreetAddress).houseNo.value).toBe("aNewHouseNo");
                    expect((repoVersion1.content.value as StreetAddress).zipCode.value).toBe("aNewZipCode");
                    expect((repoVersion1.content.value as StreetAddress).city.value).toBe("aNewCity");
                    expect((repoVersion1.content.value as StreetAddress).country.value).toBe("DE");

                    const repoVersion1ChildAttributes = await consumptionController.attributes.getLocalAttributes({
                        parentId: repoVersion1.id.toString()
                    });

                    const numberOfChildAttributes = version0ChildValues.length;
                    expect(repoVersion1ChildAttributes).toHaveLength(numberOfChildAttributes);

                    for (let i = 0; i < numberOfChildAttributes; i++) {
                        expect(repoVersion1ChildAttributes[i].content.value.toString()).toStrictEqual(trimmedVersion1ChildValues[i]);
                    }
                });

                test("should succeed a complex repository attribute adding an optional child", async function () {
                    repoVersion1Params = {
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "StreetAddress",
                                recipient: "aNewRecipient",
                                street: version1ChildValues[0],
                                houseNo: version1ChildValues[1],
                                zipCode: version1ChildValues[2],
                                city: version1ChildValues[3],
                                country: version1ChildValues[4],
                                state: "Berlin"
                            },
                            owner: consumptionController.accountController.identity.address
                        })
                    };

                    const { predecessor: updatedRepoVersion0, successor: repoVersion1 } = await consumptionController.attributes.succeedRepositoryAttribute(
                        repoVersion0.id,
                        repoVersion1Params
                    );
                    expect(repoVersion1).toBeDefined();
                    expect(updatedRepoVersion0).toBeDefined();
                    expect(repoVersion0.id.equals(updatedRepoVersion0.id)).toBe(true);
                    expect(updatedRepoVersion0.succeededBy!.equals(repoVersion1.id)).toBe(true);
                    expect(repoVersion1.succeeds!.equals(updatedRepoVersion0.id)).toBe(true);

                    const repoVersion0ChildAttributes = await consumptionController.attributes.getLocalAttributes({
                        parentId: repoVersion0.id.toString()
                    });
                    const repoVersion1ChildAttributes = await consumptionController.attributes.getLocalAttributes({
                        parentId: repoVersion1.id.toString()
                    });

                    const minNumberOfChildAttributes = version0ChildValues.length;
                    expect(repoVersion0ChildAttributes).toHaveLength(minNumberOfChildAttributes);
                    expect(repoVersion1ChildAttributes).toHaveLength(minNumberOfChildAttributes + 1);

                    expect(repoVersion1ChildAttributes[minNumberOfChildAttributes].content.value.toString()).toBe("Berlin");
                    expect(repoVersion1ChildAttributes[minNumberOfChildAttributes].parentId).toStrictEqual(repoVersion1.id);
                    expect(repoVersion1ChildAttributes[minNumberOfChildAttributes].succeeds).toBeUndefined();
                });

                test("should succeed a complex repository attribute omitting an optional child", async function () {
                    const identityAttribute = IdentityAttribute.from({
                        value: {
                            "@type": "StreetAddress",
                            recipient: "aRecipient",
                            street: version0ChildValues[0],
                            houseNo: version0ChildValues[1],
                            zipCode: version0ChildValues[2],
                            city: version0ChildValues[3],
                            country: version0ChildValues[4],
                            state: "Berlin"
                        },
                        owner: consumptionController.accountController.identity.address
                    });

                    repoVersion0 = await consumptionController.attributes.createRepositoryAttribute({
                        content: identityAttribute
                    });

                    const { predecessor: updatedRepoVersion0, successor: repoVersion1 } = await consumptionController.attributes.succeedRepositoryAttribute(
                        repoVersion0.id,
                        repoVersion1Params
                    );
                    expect(repoVersion1).toBeDefined();
                    expect(updatedRepoVersion0).toBeDefined();
                    expect(repoVersion0.id.equals(updatedRepoVersion0.id)).toBe(true);
                    expect(updatedRepoVersion0.succeededBy!.equals(repoVersion1.id)).toBe(true);
                    expect(repoVersion1.succeeds!.equals(updatedRepoVersion0.id)).toBe(true);

                    const repoVersion0ChildAttributes = await consumptionController.attributes.getLocalAttributes({
                        parentId: repoVersion0.id.toString()
                    });
                    const repoVersion1ChildAttributes = await consumptionController.attributes.getLocalAttributes({
                        parentId: repoVersion1.id.toString()
                    });

                    const minNumberOfChildAttributes = version0ChildValues.length;
                    expect(repoVersion0ChildAttributes).toHaveLength(minNumberOfChildAttributes + 1);
                    expect(repoVersion1ChildAttributes).toHaveLength(minNumberOfChildAttributes);

                    expect(repoVersion0ChildAttributes[minNumberOfChildAttributes].content.value.toString()).toBe("Berlin");
                    expect(repoVersion0ChildAttributes[minNumberOfChildAttributes].parentId).toStrictEqual(repoVersion0.id);
                    expect(repoVersion0ChildAttributes[minNumberOfChildAttributes].succeededBy).toBeUndefined();
                });

                test("should succeed a complex repository attribute re-adding an optional child", async function () {
                    const identityAttribute = IdentityAttribute.from({
                        value: {
                            "@type": "StreetAddress",
                            recipient: "aRecipient",
                            street: version0ChildValues[0],
                            houseNo: version0ChildValues[1],
                            zipCode: version0ChildValues[2],
                            city: version0ChildValues[3],
                            country: version0ChildValues[4],
                            state: "Berlin"
                        },
                        owner: consumptionController.accountController.identity.address
                    });
                    repoVersion0 = await consumptionController.attributes.createRepositoryAttribute({
                        content: identityAttribute
                    });

                    const { successor: repoVersion1 } = await consumptionController.attributes.succeedRepositoryAttribute(repoVersion0.id, repoVersion1Params);

                    const repoVersion2Params = {
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "StreetAddress",
                                recipient: "aNewRecipient",
                                street: version1ChildValues[0],
                                houseNo: version1ChildValues[1],
                                zipCode: version1ChildValues[2],
                                city: version1ChildValues[3],
                                country: version1ChildValues[4],
                                state: "Berlin"
                            },
                            owner: consumptionController.accountController.identity.address
                        })
                    };
                    const { successor: repoVersion2 } = await consumptionController.attributes.succeedRepositoryAttribute(repoVersion1.id, repoVersion2Params);

                    const repoVersion0ChildAttributes = await consumptionController.attributes.getLocalAttributes({
                        parentId: repoVersion0.id.toString()
                    });
                    const repoVersion1ChildAttributes = await consumptionController.attributes.getLocalAttributes({
                        parentId: repoVersion1.id.toString()
                    });
                    const repoVersion2ChildAttributes = await consumptionController.attributes.getLocalAttributes({
                        parentId: repoVersion2.id.toString()
                    });

                    const minNumberOfChildAttributes = version0ChildValues.length;
                    expect(repoVersion0ChildAttributes).toHaveLength(minNumberOfChildAttributes + 1);
                    expect(repoVersion1ChildAttributes).toHaveLength(minNumberOfChildAttributes);
                    expect(repoVersion2ChildAttributes).toHaveLength(minNumberOfChildAttributes + 1);

                    expect(repoVersion2ChildAttributes[minNumberOfChildAttributes].content.value.toString()).toBe("Berlin");
                    expect(repoVersion2ChildAttributes[minNumberOfChildAttributes].parentId).toStrictEqual(repoVersion2.id);
                    expect(repoVersion2ChildAttributes[minNumberOfChildAttributes].succeeds).toStrictEqual(repoVersion0ChildAttributes[minNumberOfChildAttributes].id);
                });

                test("should succeed a complex own shared identity attribute", async function () {
                    const successionResultRepo = await consumptionController.attributes.succeedRepositoryAttribute(repoVersion0.id, repoVersion1Params);
                    repoVersion0 = successionResultRepo.predecessor;
                    const repoVersion1 = successionResultRepo.successor;

                    const ownSharedVersion0 = await consumptionController.attributes.createSharedLocalAttributeCopy({
                        sourceAttributeId: repoVersion0.id,
                        peer: CoreAddress.from("peer"),
                        requestReference: CoreId.from("reqRef")
                    });

                    const ownSharedVersion1Params: IAttributeSuccessorParams = {
                        ...repoVersion1Params,
                        shareInfo: {
                            peer: CoreAddress.from("peer"),
                            requestReference: CoreId.from("reqRef2"),
                            sourceAttribute: repoVersion1.id
                        }
                    };
                    const { predecessor: updatedOwnSharedVersion0, successor: ownSharedVersion1 } = await consumptionController.attributes.succeedOwnSharedIdentityAttribute(
                        ownSharedVersion0.id,
                        ownSharedVersion1Params
                    );

                    expect(ownSharedVersion1).toBeDefined();
                    expect(updatedOwnSharedVersion0).toBeDefined();
                    expect(ownSharedVersion0.id.equals(updatedOwnSharedVersion0.id)).toBe(true);
                    expect(updatedOwnSharedVersion0.succeededBy!.equals(ownSharedVersion1.id)).toBe(true);
                    expect(ownSharedVersion1.succeeds!.equals(updatedOwnSharedVersion0.id)).toBe(true);

                    expect((ownSharedVersion1.content.value as StreetAddress).recipient).toBe("aNewRecipient");
                    expect((ownSharedVersion1.content.value as StreetAddress).street.toString()).toBe(version1ChildValues[0]);
                    expect((ownSharedVersion1.content.value as StreetAddress).houseNo.toString()).toBe(version1ChildValues[1]);
                    expect((ownSharedVersion1.content.value as StreetAddress).zipCode.toString()).toBe(version1ChildValues[2]);
                    expect((ownSharedVersion1.content.value as StreetAddress).city.toString()).toBe(version1ChildValues[3]);
                    expect((ownSharedVersion1.content.value as StreetAddress).country.toString()).toBe(version1ChildValues[4]);
                });

                test("should succeed a complex own shared identity attribute skipping one version", async function () {
                    const interimSuccessionResult = await consumptionController.attributes.succeedRepositoryAttribute(repoVersion0.id, repoVersion1Params);
                    repoVersion0 = interimSuccessionResult.predecessor;
                    let repoVersion1 = interimSuccessionResult.successor;

                    const version2ChildValues = ["aNewNewStreet", "aNewNewHouseNo", "aNewNewZipCode", "aNewNewCity", "DE"];

                    const repoVersion2Params: IAttributeSuccessorParams = {
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "StreetAddress",
                                recipient: "aNewNewRecipient",
                                street: version2ChildValues[0],
                                houseNo: version2ChildValues[1],
                                zipCode: version2ChildValues[2],
                                city: version2ChildValues[3],
                                country: version2ChildValues[4]
                            },
                            owner: consumptionController.accountController.identity.address
                        })
                    };

                    const successionResultRepo = await consumptionController.attributes.succeedRepositoryAttribute(repoVersion1.id, repoVersion2Params);
                    repoVersion1 = successionResultRepo.predecessor;
                    const repoVersion2 = successionResultRepo.successor;

                    const ownSharedVersion0 = await consumptionController.attributes.createSharedLocalAttributeCopy({
                        sourceAttributeId: repoVersion0.id,
                        peer: CoreAddress.from("peer"),
                        requestReference: CoreId.from("reqRef")
                    });

                    const ownSharedVersion2Params: IAttributeSuccessorParams = {
                        ...repoVersion2Params,
                        shareInfo: {
                            peer: CoreAddress.from("peer"),
                            requestReference: CoreId.from("reqRef2"),
                            sourceAttribute: repoVersion2.id
                        }
                    };
                    const { predecessor: updatedOwnSharedVersion0, successor: ownSharedVersion2 } = await consumptionController.attributes.succeedOwnSharedIdentityAttribute(
                        ownSharedVersion0.id,
                        ownSharedVersion2Params
                    );

                    expect(ownSharedVersion2).toBeDefined();
                    expect(updatedOwnSharedVersion0).toBeDefined();
                    expect(ownSharedVersion0.id.equals(updatedOwnSharedVersion0.id)).toBe(true);
                    expect(updatedOwnSharedVersion0.succeededBy!.equals(ownSharedVersion2.id)).toBe(true);
                    expect(ownSharedVersion2.succeeds!.equals(updatedOwnSharedVersion0.id)).toBe(true);

                    expect((ownSharedVersion2.content.value as StreetAddress).recipient).toBe("aNewNewRecipient");
                    expect((ownSharedVersion2.content.value as StreetAddress).street.toString()).toBe(version2ChildValues[0]);
                    expect((ownSharedVersion2.content.value as StreetAddress).houseNo.toString()).toBe(version2ChildValues[1]);
                    expect((ownSharedVersion2.content.value as StreetAddress).zipCode.toString()).toBe(version2ChildValues[2]);
                    expect((ownSharedVersion2.content.value as StreetAddress).city.toString()).toBe(version2ChildValues[3]);
                    expect((ownSharedVersion2.content.value as StreetAddress).country.toString()).toBe(version2ChildValues[4]);
                });

                test("should succeed a complex peer shared identity attribute", async function () {
                    const identityAttribute = IdentityAttribute.from({
                        value: {
                            "@type": "StreetAddress",
                            recipient: "aRecipient",
                            street: version0ChildValues[0],
                            houseNo: version0ChildValues[1],
                            zipCode: version0ChildValues[2],
                            city: version0ChildValues[3],
                            country: version0ChildValues[4]
                        },
                        owner: CoreAddress.from("peer")
                    });

                    const peerSharedVersion0 = await consumptionController.attributes.createSharedLocalAttribute({
                        content: identityAttribute,
                        peer: CoreAddress.from("peer"),
                        requestReference: CoreId.from("reqRef2")
                    });

                    const peerSharedVersion1Params: IAttributeSuccessorParams = {
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "StreetAddress",
                                recipient: "aNewRecipient",
                                street: version1ChildValues[0],
                                houseNo: version1ChildValues[1],
                                zipCode: version1ChildValues[2],
                                city: version1ChildValues[3],
                                country: version1ChildValues[4]
                            },
                            owner: CoreAddress.from("peer")
                        }),
                        shareInfo: {
                            peer: CoreAddress.from("peer"),
                            requestReference: CoreId.from("reqRef2")
                        }
                    };

                    const { predecessor: updatedPeerSharedVersion0, successor: peerSharedVersion1 } = await consumptionController.attributes.succeedPeerSharedIdentityAttribute(
                        peerSharedVersion0.id,
                        peerSharedVersion1Params
                    );

                    expect(peerSharedVersion1).toBeDefined();
                    expect(updatedPeerSharedVersion0).toBeDefined();
                    expect(peerSharedVersion0.id.equals(updatedPeerSharedVersion0.id)).toBe(true);
                    expect(updatedPeerSharedVersion0.succeededBy!.equals(peerSharedVersion1.id)).toBe(true);
                    expect(peerSharedVersion1.succeeds!.equals(updatedPeerSharedVersion0.id)).toBe(true);

                    expect((peerSharedVersion1.content.value as StreetAddress).recipient).toBe("aNewRecipient");
                    expect((peerSharedVersion1.content.value as StreetAddress).street.toString()).toBe(version1ChildValues[0]);
                    expect((peerSharedVersion1.content.value as StreetAddress).houseNo.toString()).toBe(version1ChildValues[1]);
                    expect((peerSharedVersion1.content.value as StreetAddress).zipCode.toString()).toBe(version1ChildValues[2]);
                    expect((peerSharedVersion1.content.value as StreetAddress).city.toString()).toBe(version1ChildValues[3]);
                    expect((peerSharedVersion1.content.value as StreetAddress).country.toString()).toBe(version1ChildValues[4]);
                });
            });

            test("should succeed a peer shared identity attribute", async function () {
                const predecessor = await consumptionController.attributes.createAttributeUnsafe({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("peer")
                    }),
                    shareInfo: {
                        requestReference: CoreId.from("reqRefA"),
                        peer: CoreAddress.from("peer")
                    }
                });
                const successorParams: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "US"
                        },
                        owner: CoreAddress.from("peer")
                    }),
                    shareInfo: {
                        requestReference: CoreId.from("reqRefB"),
                        peer: CoreAddress.from("peer")
                    }
                };

                const { predecessor: updatedPredecessor, successor } = await consumptionController.attributes.succeedPeerSharedIdentityAttribute(predecessor.id, successorParams);
                expect(successor).toBeDefined();
                expect(updatedPredecessor).toBeDefined();
                expect(predecessor.id.equals(updatedPredecessor.id)).toBe(true);
                expect(updatedPredecessor.succeededBy!.equals(successor.id)).toBe(true);
                expect(successor.succeeds!.equals(updatedPredecessor.id)).toBe(true);
                expect((predecessor.content.value.toJSON() as any).value).toBe("DE");
                expect((successor.content.value.toJSON() as any).value).toBe("US");
            });

            test("should succeed an own shared relationship attribute", async function () {
                const predecessor = await consumptionController.attributes.createSharedLocalAttribute({
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
                    requestReference: CoreId.from("reqRefA")
                });
                const successorParams: IAttributeSuccessorParams = {
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
                    shareInfo: {
                        peer: CoreAddress.from("peerAddress"),
                        requestReference: CoreId.from("reqRefB")
                    }
                };

                const { predecessor: updatedPredecessor, successor } = await consumptionController.attributes.succeedOwnSharedRelationshipAttribute(
                    predecessor.id,
                    successorParams
                );
                expect(successor).toBeDefined();
                expect(updatedPredecessor).toBeDefined();
                expect(predecessor.id.equals(updatedPredecessor.id)).toBe(true);
                expect(updatedPredecessor.succeededBy!.equals(successor.id)).toBe(true);
                expect(successor.succeeds!.equals(updatedPredecessor.id)).toBe(true);
                expect((predecessor.content.value.toJSON() as any).value).toBe("0815");
                expect((successor.content.value.toJSON() as any).value).toBe("1337");
            });

            test("should succeed a peer shared relationship attribute", async function () {
                const predecessor = await consumptionController.attributes.createSharedLocalAttribute({
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
                    requestReference: CoreId.from("reqRefA")
                });
                const successorParams: IAttributeSuccessorParams = {
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
                    shareInfo: {
                        peer: CoreAddress.from("peerAddress"),
                        requestReference: CoreId.from("reqRefB")
                    }
                };

                const { predecessor: updatedPredecessor, successor } = await consumptionController.attributes.succeedPeerSharedRelationshipAttribute(
                    predecessor.id,
                    successorParams
                );
                expect(successor).toBeDefined();
                expect(updatedPredecessor).toBeDefined();
                expect(predecessor.id.equals(updatedPredecessor.id)).toBe(true);
                expect(updatedPredecessor.succeededBy!.equals(successor.id)).toBe(true);
                expect(successor.succeeds!.equals(updatedPredecessor.id)).toBe(true);
                expect((predecessor.content.value.toJSON() as any).value).toBe("0815");
                expect((successor.content.value.toJSON() as any).value).toBe("1337");
            });

            test("should succeed a ThirdPartyRelationshipAttribute", async function () {
                const predecessor = await consumptionController.attributes.createAttributeUnsafe({
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
                    shareInfo: {
                        peer: CoreAddress.from("peerAddress"),
                        requestReference: CoreId.from("reqRefA"),
                        sourceAttribute: CoreId.from("ATT0"),
                        thirdPartyAddress: CoreAddress.from("thirdPartyAddress")
                    }
                });
                const successorParams: IAttributeSuccessorParams = {
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
                    shareInfo: {
                        peer: CoreAddress.from("peerAddress"),
                        requestReference: CoreId.from("reqRefB"),
                        sourceAttribute: CoreId.from("ATT1"),
                        thirdPartyAddress: CoreAddress.from("thirdPartyAddress")
                    }
                };

                const { predecessor: updatedPredecessor, successor } = await consumptionController.attributes.succeedThirdPartyRelationshipAttribute(
                    predecessor.id,
                    successorParams
                );
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
        test("should change default RepositoryAttribute if setDefaultRepositoryAttributes is true", async function () {
            const firstAttribute = await appConsumptionController.attributes.createRepositoryAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "My default given name"
                    },
                    owner: appConsumptionController.accountController.identity.address
                })
            });

            const secondAttribute = await appConsumptionController.attributes.createRepositoryAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "My other given name"
                    },
                    owner: appConsumptionController.accountController.identity.address
                })
            });
            expect(secondAttribute.isDefault).toBeUndefined();

            const updatedSecondAttribute = await appConsumptionController.attributes.setAsDefaultRepositoryAttribute(secondAttribute);
            expect(updatedSecondAttribute.isDefault).toBe(true);

            const updatedFirstAttribute = await appConsumptionController.attributes.getLocalAttribute(firstAttribute.id);
            expect(updatedFirstAttribute!.isDefault).toBeUndefined();
        });

        test("should not change default RepositoryAttribute if candidate is already default and setDefaultRepositoryAttributes is true", async function () {
            const firstAttribute = await appConsumptionController.attributes.createRepositoryAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "My default given name"
                    },
                    owner: appConsumptionController.accountController.identity.address
                })
            });
            expect(firstAttribute.isDefault).toBe(true);
            const updatedFirstAttribute = await appConsumptionController.attributes.setAsDefaultRepositoryAttribute(firstAttribute);
            expect(updatedFirstAttribute.isDefault).toBe(true);
        });

        test("should throw an error if the new default Attribute is not a RepositoryAttribute and setDefaultRepositoryAttributes is true", async function () {
            const sharedAttribute = await appConsumptionController.attributes.createAttributeUnsafe({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "My shared given name"
                    },
                    owner: appConsumptionController.accountController.identity.address
                }),
                shareInfo: LocalAttributeShareInfo.from({
                    peer: CoreAddress.from("peer"),
                    requestReference: CoreId.from("reqRef")
                })
            });

            await expect(appConsumptionController.attributes.setAsDefaultRepositoryAttribute(sharedAttribute)).rejects.toThrow(
                "error.consumption.attributes.isNotRepositoryAttribute"
            );
        });

        test("should throw an error trying to change the default RepositoryAttribute if setDefaultRepositoryAttributes is false", async function () {
            const repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "GivenName",
                        value: "My default given name"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            });
            expect(repositoryAttribute.isDefault).toBeUndefined();

            await expect(consumptionController.attributes.setAsDefaultRepositoryAttribute(repositoryAttribute)).rejects.toThrow(
                "error.consumption.attributes.setDefaultRepositoryAttributesIsDisabled"
            );
        });
    });

    describe("get Attributes", function () {
        beforeEach(async function () {
            await consumptionController.attributes.createSharedLocalAttribute({
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
                requestReference: CoreId.from("reqRef"),
                peer: CoreAddress.from("peer")
            });

            await consumptionController.attributes.createSharedLocalAttribute({
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
                requestReference: CoreId.from("reqRef"),
                peer: CoreAddress.from("peer")
            });

            await consumptionController.attributes.createSharedLocalAttribute({
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
                requestReference: CoreId.from("reqRef"),
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
        let repositoryAttributeVersion0: LocalAttribute;
        let repositoryAttributeVersion1: LocalAttribute;
        let repositoryAttributeVersion2: LocalAttribute;
        beforeEach(async function () {
            repositoryAttributeVersion0 = await consumptionController.attributes.createRepositoryAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            });
            const successorParams1: IAttributeSuccessorParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "US"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            };
            const successorParams2: IAttributeSuccessorParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "CZ"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            };

            ({ predecessor: repositoryAttributeVersion0, successor: repositoryAttributeVersion1 } = await consumptionController.attributes.succeedRepositoryAttribute(
                repositoryAttributeVersion0.id,
                successorParams1
            ));
            ({ predecessor: repositoryAttributeVersion1, successor: repositoryAttributeVersion2 } = await consumptionController.attributes.succeedRepositoryAttribute(
                repositoryAttributeVersion1.id,
                successorParams2
            ));
        });

        test("should return all predecessors of a succeeded repository attribute", async function () {
            const result0 = await consumptionController.attributes.getPredecessorsOfAttribute(repositoryAttributeVersion0.id);
            expect(result0).toStrictEqual([]);

            const result1 = await consumptionController.attributes.getPredecessorsOfAttribute(repositoryAttributeVersion1.id);
            expect(JSON.stringify(result1)).toStrictEqual(JSON.stringify([repositoryAttributeVersion0]));

            const result2 = await consumptionController.attributes.getPredecessorsOfAttribute(repositoryAttributeVersion2.id);
            expect(JSON.stringify(result2)).toStrictEqual(JSON.stringify([repositoryAttributeVersion1, repositoryAttributeVersion0]));
        });

        test("should return all successors of a succeeded repository attribute", async function () {
            const result0 = await consumptionController.attributes.getSuccessorsOfAttribute(repositoryAttributeVersion0.id);
            expect(JSON.stringify(result0)).toStrictEqual(JSON.stringify([repositoryAttributeVersion1, repositoryAttributeVersion2]));

            const result1 = await consumptionController.attributes.getSuccessorsOfAttribute(repositoryAttributeVersion1.id);
            expect(JSON.stringify(result1)).toStrictEqual(JSON.stringify([repositoryAttributeVersion2]));

            const result2 = await consumptionController.attributes.getSuccessorsOfAttribute(repositoryAttributeVersion2.id);
            expect(result2).toStrictEqual([]);
        });

        test("should return all versions of a succeeded repository attribute", async function () {
            const allVersions = [repositoryAttributeVersion2, repositoryAttributeVersion1, repositoryAttributeVersion0];
            for (const version of allVersions) {
                const result = await consumptionController.attributes.getVersionsOfAttribute(version.id);
                expect(JSON.stringify(result)).toStrictEqual(JSON.stringify([repositoryAttributeVersion2, repositoryAttributeVersion1, repositoryAttributeVersion0]));
            }
        });

        test("should return only input attribute if no successions were performed", async function () {
            const version0 = await consumptionController.attributes.createRepositoryAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            });

            const onlyVersion0 = await consumptionController.attributes.getVersionsOfAttribute(version0.id);
            expect(onlyVersion0).toStrictEqual([version0]);
        });

        test("should return all versions of a possibly succeeded own shared identity attribute", async function () {
            const ownSharedIdentityAttributeVersion0 = await consumptionController.attributes.createSharedLocalAttributeCopy({
                sourceAttributeId: repositoryAttributeVersion0.id,
                peer: CoreAddress.from("peerA"),
                requestReference: CoreId.from("reqRef")
            });

            const ownSharedIdentityAttributeVersionsBeforeSuccession = await consumptionController.attributes.getVersionsOfAttribute(ownSharedIdentityAttributeVersion0.id);
            expect(JSON.stringify(ownSharedIdentityAttributeVersionsBeforeSuccession)).toStrictEqual(JSON.stringify([ownSharedIdentityAttributeVersion0]));

            const ownSharedIdentityAttributeVersion1 = await consumptionController.attributes.createSharedLocalAttributeCopy({
                sourceAttributeId: repositoryAttributeVersion1.id,
                peer: CoreAddress.from("peerB"),
                requestReference: CoreId.from("reqRef1")
            });

            const successorParams: IAttributeSuccessorParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "CZ"
                    },
                    owner: consumptionController.accountController.identity.address
                }),
                shareInfo: {
                    peer: CoreAddress.from("peerB"),
                    requestReference: CoreId.from("reqRef2"),
                    sourceAttribute: repositoryAttributeVersion2.id
                }
            };

            const { predecessor: updatedOwnSharedIdentityAttributeVersion1, successor: ownSharedIdentityAttributeVersion2 } =
                await consumptionController.attributes.succeedOwnSharedIdentityAttribute(ownSharedIdentityAttributeVersion1.id, successorParams);

            const allVersions = [ownSharedIdentityAttributeVersion2, updatedOwnSharedIdentityAttributeVersion1];
            for (const version of allVersions) {
                const result = await consumptionController.attributes.getVersionsOfAttribute(version.id);
                expect(JSON.stringify(result)).toStrictEqual(JSON.stringify(allVersions));
            }
        });

        test("should return all versions of a possibly succeeded peer shared identity attribute", async function () {
            const version0 = await consumptionController.attributes.createSharedLocalAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: CoreAddress.from("peer")
                }),
                peer: CoreAddress.from("peer"),
                requestReference: CoreId.from("reqRefA")
            });
            const successorParams1: IAttributeSuccessorParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "US"
                    },
                    owner: CoreAddress.from("peer")
                }),
                shareInfo: {
                    peer: CoreAddress.from("peer"),
                    notificationReference: CoreId.from("notRefB")
                }
            };
            const successorParams2: IAttributeSuccessorParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "CZ"
                    },
                    owner: CoreAddress.from("peer")
                }),
                shareInfo: {
                    peer: CoreAddress.from("peer"),
                    notificationReference: CoreId.from("notRefC")
                }
            };

            const onlyVersion0 = await consumptionController.attributes.getVersionsOfAttribute(version0.id);
            expect(JSON.stringify(onlyVersion0)).toStrictEqual(JSON.stringify([version0]));

            const { predecessor: updatedVersion0, successor: version1 } = await consumptionController.attributes.succeedPeerSharedIdentityAttribute(version0.id, successorParams1);
            const { predecessor: updatedVersion1, successor: version2 } = await consumptionController.attributes.succeedPeerSharedIdentityAttribute(version1.id, successorParams2);

            const allVersions = [version2, updatedVersion1, updatedVersion0];

            for (const version of allVersions) {
                const result = await consumptionController.attributes.getVersionsOfAttribute(version.id);
                expect(JSON.stringify(result)).toStrictEqual(JSON.stringify(allVersions));
            }
        });

        test("should return all versions of a possibly succeeded own shared relationship attribute", async function () {
            const version0 = await consumptionController.attributes.createSharedLocalAttribute({
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
                requestReference: CoreId.from("reqRefA")
            });
            const successorParams1: IAttributeSuccessorParams = {
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
                shareInfo: {
                    peer: CoreAddress.from("peerAddress"),
                    requestReference: CoreId.from("reqRefB")
                }
            };
            const successorParams2: IAttributeSuccessorParams = {
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
                shareInfo: {
                    peer: CoreAddress.from("peerAddress"),
                    requestReference: CoreId.from("reqRefC")
                }
            };

            const onlyVersion0 = await consumptionController.attributes.getVersionsOfAttribute(version0.id);
            expect(JSON.stringify(onlyVersion0)).toStrictEqual(JSON.stringify([version0]));

            const { predecessor: updatedVersion0, successor: version1 } = await consumptionController.attributes.succeedOwnSharedRelationshipAttribute(
                version0.id,
                successorParams1
            );
            const { predecessor: updatedVersion1, successor: version2 } = await consumptionController.attributes.succeedOwnSharedRelationshipAttribute(
                version1.id,
                successorParams2
            );

            const allVersions = [version2, updatedVersion1, updatedVersion0];
            for (const version of allVersions) {
                const result = await consumptionController.attributes.getVersionsOfAttribute(version.id);
                expect(JSON.stringify(result)).toStrictEqual(JSON.stringify(allVersions));
            }
        });

        test("should return all versions of a possibly succeeded peer shared relationship attribute", async function () {
            const version0 = await consumptionController.attributes.createSharedLocalAttribute({
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
                requestReference: CoreId.from("reqRefA")
            });
            const successorParams1: IAttributeSuccessorParams = {
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
                shareInfo: {
                    peer: CoreAddress.from("peerAddress"),
                    requestReference: CoreId.from("reqRefB")
                }
            };
            const successorParams2: IAttributeSuccessorParams = {
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
                shareInfo: {
                    peer: CoreAddress.from("peerAddress"),
                    requestReference: CoreId.from("reqRefC")
                }
            };

            const onlyVersion0 = await consumptionController.attributes.getVersionsOfAttribute(version0.id);
            expect(JSON.stringify(onlyVersion0)).toStrictEqual(JSON.stringify([version0]));

            const { predecessor: updatedVersion0, successor: version1 } = await consumptionController.attributes.succeedPeerSharedRelationshipAttribute(
                version0.id,
                successorParams1
            );
            const { predecessor: updatedVersion1, successor: version2 } = await consumptionController.attributes.succeedPeerSharedRelationshipAttribute(
                version1.id,
                successorParams2
            );

            const allVersions = [version2, updatedVersion1, updatedVersion0];
            for (const version of allVersions) {
                const result = await consumptionController.attributes.getVersionsOfAttribute(version.id);
                expect(JSON.stringify(result)).toStrictEqual(JSON.stringify(allVersions));
            }
        });

        test("should throw if an unassigned attribute id is queried", async function () {
            await expect(consumptionController.attributes.getVersionsOfAttribute(CoreId.from("ATTxxxxxxxxxxxxxxxxx"))).rejects.toThrow("error.transport.recordNotFound");
        });

        test("should check if two attributes are subsequent in succession", async function () {
            const version0 = await consumptionController.attributes.createRepositoryAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            });
            const successorParams1: IAttributeSuccessorParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "US"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            };
            const successorParams2: IAttributeSuccessorParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "CZ"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            };

            const { predecessor: updatedVersion0, successor: version1 } = await consumptionController.attributes.succeedRepositoryAttribute(version0.id, successorParams1);
            const { predecessor: updatedVersion1, successor: version2 } = await consumptionController.attributes.succeedRepositoryAttribute(version1.id, successorParams2);

            expect(await consumptionController.attributes.isSubsequentInSuccession(updatedVersion0, updatedVersion1)).toBe(true);
            expect(await consumptionController.attributes.isSubsequentInSuccession(updatedVersion0, version2)).toBe(true);

            expect(await consumptionController.attributes.isSubsequentInSuccession(updatedVersion0, updatedVersion0)).toBe(false);
            expect(await consumptionController.attributes.isSubsequentInSuccession(updatedVersion1, updatedVersion0)).toBe(false);
            expect(await consumptionController.attributes.isSubsequentInSuccession(version2, updatedVersion0)).toBe(false);
        });
    });

    describe("get shared versions of an Attribute", function () {
        let repositoryAttributeV0: LocalAttribute;
        let repositoryAttributeV1: LocalAttribute;
        let repositoryAttributeV2: LocalAttribute;
        let ownSharedIdentityAttributeV1PeerA: LocalAttribute;
        let ownSharedIdentityAttributeV1PeerB: LocalAttribute;
        let ownSharedIdentityAttributeV2PeerB: LocalAttribute;
        beforeEach(async function () {
            repositoryAttributeV0 = await consumptionController.attributes.createRepositoryAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            });
            const repositoryAttributeParamsV1: IAttributeSuccessorParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "US"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            };
            const repositoryAttributeParamsV2: IAttributeSuccessorParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "CZ"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            };

            ({ predecessor: repositoryAttributeV0, successor: repositoryAttributeV1 } = await consumptionController.attributes.succeedRepositoryAttribute(
                repositoryAttributeV0.id,
                repositoryAttributeParamsV1
            ));
            ({ predecessor: repositoryAttributeV1, successor: repositoryAttributeV2 } = await consumptionController.attributes.succeedRepositoryAttribute(
                repositoryAttributeV1.id,
                repositoryAttributeParamsV2
            ));

            ownSharedIdentityAttributeV1PeerA = await consumptionController.attributes.createSharedLocalAttributeCopy({
                sourceAttributeId: repositoryAttributeV1.id,
                peer: CoreAddress.from("peerA"),
                requestReference: CoreId.from("reqRef")
            });

            ownSharedIdentityAttributeV1PeerB = await consumptionController.attributes.createSharedLocalAttributeCopy({
                sourceAttributeId: repositoryAttributeV1.id,
                peer: CoreAddress.from("peerB"),
                requestReference: CoreId.from("reqRef1")
            });

            const ownSharedIdentityAttributeParamsV2PeerB: IAttributeSuccessorParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "CZ"
                    },
                    owner: consumptionController.accountController.identity.address
                }),
                shareInfo: {
                    peer: CoreAddress.from("peerB"),
                    requestReference: CoreId.from("reqRef2"),
                    sourceAttribute: repositoryAttributeV2.id
                }
            };

            ({ predecessor: ownSharedIdentityAttributeV1PeerB, successor: ownSharedIdentityAttributeV2PeerB } =
                await consumptionController.attributes.succeedOwnSharedIdentityAttribute(ownSharedIdentityAttributeV1PeerB.id, ownSharedIdentityAttributeParamsV2PeerB));
        });

        test("should return all shared predecessors for all peers", async function () {
            const result = await consumptionController.attributes.getSharedPredecessorsOfAttribute(repositoryAttributeV2);
            expect(result).toStrictEqual(expect.arrayContaining([ownSharedIdentityAttributeV1PeerA, ownSharedIdentityAttributeV1PeerB]));
        });

        test("should return all shared predecessors for a single peer", async function () {
            const result = await consumptionController.attributes.getSharedPredecessorsOfAttribute(repositoryAttributeV2, { "shareInfo.peer": "peerB" });
            expect(JSON.stringify(result)).toStrictEqual(JSON.stringify([ownSharedIdentityAttributeV1PeerB]));
        });

        test("should return all shared successors for all peers", async function () {
            const result = await consumptionController.attributes.getSharedSuccessorsOfAttribute(repositoryAttributeV0);
            expect(result).toStrictEqual(expect.arrayContaining([ownSharedIdentityAttributeV1PeerA, ownSharedIdentityAttributeV1PeerB, ownSharedIdentityAttributeV2PeerB]));
        });

        test("should return all shared successors for a single peer", async function () {
            const result = await consumptionController.attributes.getSharedSuccessorsOfAttribute(repositoryAttributeV0, { "shareInfo.peer": "peerB" });
            expect(JSON.stringify(result)).toStrictEqual(JSON.stringify([ownSharedIdentityAttributeV1PeerB, ownSharedIdentityAttributeV2PeerB]));
        });

        test("should return all shared versions for all peers", async function () {
            const allRepositoryAttributeVersions = [repositoryAttributeV0, repositoryAttributeV1, repositoryAttributeV2];
            const allOwnSharedAttributeVersions = [ownSharedIdentityAttributeV2PeerB, ownSharedIdentityAttributeV1PeerB, ownSharedIdentityAttributeV1PeerA];
            for (const repositoryAttributeVersion of allRepositoryAttributeVersions) {
                const result1 = await consumptionController.attributes.getSharedVersionsOfAttribute(repositoryAttributeVersion.id, undefined, false);
                expect(result1).toStrictEqual(expect.arrayContaining(allOwnSharedAttributeVersions));

                const result2 = await consumptionController.attributes.getSharedVersionsOfAttribute(
                    repositoryAttributeVersion.id,
                    [CoreAddress.from("peerA"), CoreAddress.from("peerB")],
                    false
                );
                expect(result2).toStrictEqual(expect.arrayContaining(allOwnSharedAttributeVersions));
            }
        });

        test("should return all shared versions that match query", async function () {
            const query = { "content.value.value": "US" };
            const ownSharedAttributeVersionsWithValueMatchingQuery = [ownSharedIdentityAttributeV1PeerA, ownSharedIdentityAttributeV1PeerB];

            const result = await consumptionController.attributes.getSharedVersionsOfAttribute(repositoryAttributeV2.id, undefined, false, query);
            expect(result).toHaveLength(2);
            expect(result).toStrictEqual(expect.arrayContaining(ownSharedAttributeVersionsWithValueMatchingQuery));
        });

        test("should return all shared versions for a single peer", async function () {
            const allRepositoryAttributeVersions = [repositoryAttributeV0, repositoryAttributeV1, repositoryAttributeV2];
            const allOwnSharedAttributeVersionsPeerB = [ownSharedIdentityAttributeV2PeerB, ownSharedIdentityAttributeV1PeerB];
            for (const repositoryAttributeVersion of allRepositoryAttributeVersions) {
                const resultA = await consumptionController.attributes.getSharedVersionsOfAttribute(repositoryAttributeVersion.id, [CoreAddress.from("peerA")], false);
                expect(JSON.stringify(resultA)).toStrictEqual(JSON.stringify([ownSharedIdentityAttributeV1PeerA]));

                const resultB = await consumptionController.attributes.getSharedVersionsOfAttribute(repositoryAttributeVersion.id, [CoreAddress.from("peerB")], false);
                expect(JSON.stringify(resultB)).toStrictEqual(JSON.stringify(allOwnSharedAttributeVersionsPeerB));
            }
        });

        test("should return only latest shared versions for all peers", async function () {
            const allRepositoryAttributeVersions = [repositoryAttributeV0, repositoryAttributeV1, repositoryAttributeV2];
            for (const repositoryAttributeVersion of allRepositoryAttributeVersions) {
                const result = await consumptionController.attributes.getSharedVersionsOfAttribute(repositoryAttributeVersion.id);
                expect(result).toStrictEqual([ownSharedIdentityAttributeV2PeerB, ownSharedIdentityAttributeV1PeerA]);
            }
        });

        test("should return only latest shared version for a single peer", async function () {
            const allRepositoryAttributeVersions = [repositoryAttributeV0, repositoryAttributeV1, repositoryAttributeV2];
            for (const repositoryAttributeVersion of allRepositoryAttributeVersions) {
                const resultA = await consumptionController.attributes.getSharedVersionsOfAttribute(repositoryAttributeVersion.id, [CoreAddress.from("peerA")]);
                expect(resultA).toStrictEqual([ownSharedIdentityAttributeV1PeerA]);

                const resultB = await consumptionController.attributes.getSharedVersionsOfAttribute(repositoryAttributeVersion.id, [CoreAddress.from("peerB")]);
                expect(resultB).toStrictEqual([ownSharedIdentityAttributeV2PeerB]);
            }
        });

        test("should throw if an unassigned attribute id is queried", async function () {
            await expect(consumptionController.attributes.getSharedVersionsOfAttribute(CoreId.from("ATTxxxxxxxxxxxxxxxxx"))).rejects.toThrow("error.transport.recordNotFound");
        });

        test("should return an empty list if a shared identity attribute is queried", async function () {
            const sharedIdentityAttribute = await consumptionController.attributes.createSharedLocalAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "DisplayName",
                        value: "Name X"
                    },
                    owner: consumptionController.accountController.identity.address
                }),
                peer: CoreAddress.from("peer"),
                requestReference: CoreId.from("reqRefX")
            });

            const result = await consumptionController.attributes.getSharedVersionsOfAttribute(sharedIdentityAttribute.id);
            expect(result).toHaveLength(0);
        });

        test("should return an empty list if a relationship attribute without associated third party relationship attributes is queried", async function () {
            const relationshipAttribute = await consumptionController.attributes.createSharedLocalAttribute({
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
                requestReference: CoreId.from("reqRef123")
            });

            const result = await consumptionController.attributes.getSharedVersionsOfAttribute(relationshipAttribute.id);
            expect(result).toHaveLength(0);
        });
    });

    test("should delete attributes exchanged with peer", async function () {
        const ownRelationshipAttribute = await consumptionController.attributes.createSharedLocalAttribute({
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
            requestReference: CoreId.from("reqRef123")
        });

        const peerRelationshipAttribute = await consumptionController.attributes.createSharedLocalAttribute({
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
            requestReference: CoreId.from("reqRef123")
        });

        await consumptionController.attributes.deleteAttributesExchangedWithPeer(CoreAddress.from("peerAddress"));
        const ownAttribute = await consumptionController.attributes.getLocalAttribute(ownRelationshipAttribute.id);
        const peerAttribute = await consumptionController.attributes.getLocalAttribute(peerRelationshipAttribute.id);
        expect(ownAttribute).toBeUndefined();
        expect(peerAttribute).toBeUndefined();
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
            expect(consumptionController.attributes["isValidTag"]("private", mockedTagCollection.tagsForAttributeValueTypes["PhoneNumber"])).toBe(true);
            expect(consumptionController.attributes["isValidTag"]("emergency+%+first", mockedTagCollection.tagsForAttributeValueTypes["PhoneNumber"])).toBe(true);
            expect(consumptionController.attributes["isValidTag"]("emergency+%+second", mockedTagCollection.tagsForAttributeValueTypes["PhoneNumber"])).toBe(true);
            expect(consumptionController.attributes["isValidTag"]("x+%+my+%+custom+%+tag", mockedTagCollection.tagsForAttributeValueTypes["PhoneNumber"])).toBe(true);
            expect(consumptionController.attributes["isValidTag"]("X+%+my+%+custom+%+tag", mockedTagCollection.tagsForAttributeValueTypes["PhoneNumber"])).toBe(true);
        });

        test("should validate invalid tags", function () {
            expect(consumptionController.attributes["isValidTag"]("nonexistent", mockedTagCollection.tagsForAttributeValueTypes["PhoneNumber"])).toBe(false);
            expect(consumptionController.attributes["isValidTag"]("emergency", mockedTagCollection.tagsForAttributeValueTypes["PhoneNumber"])).toBe(false);
            expect(consumptionController.attributes["isValidTag"]("private", mockedTagCollection.tagsForAttributeValueTypes["nonexistent"])).toBe(false);
            expect(consumptionController.attributes["isValidTag"]("emergency+%+nonexistent", mockedTagCollection.tagsForAttributeValueTypes["PhoneNumber"])).toBe(false);
            expect(consumptionController.attributes["isValidTag"]("emergency+%+first+%+nonexistent", mockedTagCollection.tagsForAttributeValueTypes["PhoneNumber"])).toBe(false);
        });
    });
});
