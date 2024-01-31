import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import {
    City,
    Country,
    EMailAddress,
    HouseNumber,
    IdentityAttribute,
    IIdentityAttributeQuery,
    IIQLQuery,
    IRelationshipAttributeQuery,
    Nationality,
    PhoneNumber,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    Street,
    StreetAddress,
    ZipCode
} from "@nmshd/content";
import { AccountController, CoreAddress, CoreDate, CoreId, Transport } from "@nmshd/transport";
import {
    AttributeCreatedEvent,
    AttributeDeletedEvent,
    ConsumptionController,
    IAttributeSuccessorParams,
    ICreateLocalAttributeParams,
    ICreatePeerLocalAttributeParams,
    ICreateSharedLocalAttributeCopyParams,
    LocalAttribute,
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

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport(connection, mockEventBus);

        await transport.init();

        const account = (await TestUtil.provideAccounts(transport, 1))[0];
        ({ accountController: testAccount, consumptionController } = account);
    });

    afterAll(async function () {
        await testAccount.close();
        await connection.close();
    });

    beforeEach(async function () {
        const emailParams: ICreateLocalAttributeParams = {
            content: IdentityAttribute.from({
                value: EMailAddress.from({
                    value: "my@email.address"
                }),
                owner: CoreAddress.from("address")
            })
        };

        const phoneParams: ICreateLocalAttributeParams = {
            content: IdentityAttribute.from({
                value: PhoneNumber.from({
                    value: "000000000"
                }),
                owner: CoreAddress.from("address")
            })
        };
        await consumptionController.attributes.createLocalAttribute(emailParams);
        await consumptionController.attributes.createLocalAttribute(phoneParams);

        mockEventBus.clearPublishedEvents();
    });

    afterEach(async function () {
        const attributes = await consumptionController.attributes.getLocalAttributes();

        for (const attribute of attributes) {
            await consumptionController.attributes.deleteAttribute(attribute);
        }
    });

    test("should list all attributes", async function () {
        const attributes = await consumptionController.attributes.getLocalAttributes();
        expect(attributes).toHaveLength(2);
    });

    test("should create new attributes", async function () {
        const attributesBeforeCreate = await consumptionController.attributes.getLocalAttributes();
        const nrAttributesBeforeCreate = attributesBeforeCreate.length;

        const birthDateParams: ICreateLocalAttributeParams = {
            content: IdentityAttribute.from({
                value: {
                    "@type": "DisplayName",
                    value: "ADisplayName"
                },
                owner: CoreAddress.from("address")
            })
        };

        const birthDate = await consumptionController.attributes.createLocalAttribute(birthDateParams);
        expect(birthDate).toBeInstanceOf(LocalAttribute);
        expect(birthDate.content).toBeInstanceOf(IdentityAttribute);

        const attributesAfterCreate = await consumptionController.attributes.getLocalAttributes();
        const nrAttributesAfterCreate = attributesAfterCreate.length;
        expect(nrAttributesAfterCreate).toStrictEqual(nrAttributesBeforeCreate + 1);

        mockEventBus.expectPublishedEvents(AttributeCreatedEvent);
    });

    test("should create LocalAttributes for each property of a complex Identity Attribute", async function () {
        const attributesBeforeCreate = await consumptionController.attributes.getLocalAttributes();
        const nrAttributesBeforeCreate = attributesBeforeCreate.length;

        const identityAttribute = IdentityAttribute.from({
            value: {
                "@type": "StreetAddress",
                recipient: "ARecipient",
                street: "AStreet",
                houseNo: "AHouseNo",
                zipCode: "AZipCode",
                city: "ACity",
                country: "DE"
            },
            validTo: CoreDate.utc(),
            owner: CoreAddress.from("address")
        });

        const address = await consumptionController.attributes.createLocalAttribute({
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
        const nrAttributesAfterCreate = attributesAfterCreate.length;
        expect(nrAttributesAfterCreate).toStrictEqual(nrAttributesBeforeCreate + 6);
    });

    test("should trigger an AttributeCreatedEvent for each created child Attribute of a complex Attribute", async function () {
        await consumptionController.attributes.getLocalAttributes();

        const identityAttribute = IdentityAttribute.from({
            value: {
                "@type": "StreetAddress",
                recipient: "ARecipient",
                street: "AStreet",
                houseNo: "AHouseNo",
                zipCode: "AZipCode",
                city: "ACity",
                country: "DE"
            },
            validTo: CoreDate.utc(),
            owner: CoreAddress.from("address")
        });

        await consumptionController.attributes.createLocalAttribute({ content: identityAttribute });

        mockEventBus.expectPublishedEvents(
            AttributeCreatedEvent,
            AttributeCreatedEvent,
            AttributeCreatedEvent,
            AttributeCreatedEvent,
            AttributeCreatedEvent,
            AttributeCreatedEvent
        );
    });

    test("should delete an attribute", async function () {
        const attributes = await consumptionController.attributes.getLocalAttributes();
        const nrAttributesBeforeDelete = attributes.length;
        await consumptionController.attributes.deleteAttribute(attributes[0]);

        const attributesAfterDelete = await consumptionController.attributes.getLocalAttributes();
        const nrAttributesAfterDelete = attributesAfterDelete.length;
        expect(nrAttributesAfterDelete).toStrictEqual(nrAttributesBeforeDelete - 1);

        const attributesJSON = attributesAfterDelete.map((v) => v.id.toString());
        expect(attributesJSON).not.toContain(attributes[0]?.id.toString());

        mockEventBus.expectLastPublishedEvent(AttributeDeletedEvent);
    });

    test("should allow to create a share attribute copy", async function () {
        const nationalityParams: ICreateLocalAttributeParams = {
            content: IdentityAttribute.from({
                value: {
                    "@type": "Nationality",
                    value: "DE"
                },
                owner: testAccount.identity.address
            })
        };
        const nationalityAttribute = await consumptionController.attributes.createLocalAttribute(nationalityParams);

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

    test("should allow to query public relationship attributes", async function () {
        const relationshipAttributeParams: ICreateLocalAttributeParams = {
            content: RelationshipAttribute.from({
                key: "customerId",
                value: {
                    "@type": "ProprietaryString",
                    value: "0815",
                    title: "Customer ID"
                },
                owner: testAccount.identity.address,
                confidentiality: RelationshipAttributeConfidentiality.Public
            })
        };
        await consumptionController.attributes.createLocalAttribute(relationshipAttributeParams);

        const query: IRelationshipAttributeQuery = {
            key: "customerId",
            owner: testAccount.identity.address,
            attributeCreationHints: {
                valueType: "ProprietaryString",
                title: "someHintTitle",
                confidentiality: "public" as RelationshipAttributeConfidentiality
            }
        };

        const attribute = await consumptionController.attributes.executeRelationshipAttributeQuery(query);
        expect(attribute).toBeDefined();
        expect(attribute!.content).toBeInstanceOf(RelationshipAttribute);
        expect((attribute!.content as RelationshipAttribute).key).toBe("customerId");
    });

    test("should allow to query protected relationship attributes", async function () {
        const relationshipAttributeParams: ICreateLocalAttributeParams = {
            content: RelationshipAttribute.from({
                key: "customerId",
                value: {
                    "@type": "ProprietaryString",
                    value: "0815",
                    title: "Customer ID"
                },
                owner: testAccount.identity.address,
                confidentiality: RelationshipAttributeConfidentiality.Protected
            })
        };
        await consumptionController.attributes.createLocalAttribute(relationshipAttributeParams);

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
        const relationshipAttributeParams: ICreateLocalAttributeParams = {
            content: RelationshipAttribute.from({
                key: "customerId",
                value: {
                    "@type": "ProprietaryString",
                    value: "0815",
                    title: "Customer ID"
                },
                owner: testAccount.identity.address,
                confidentiality: RelationshipAttributeConfidentiality.Private
            })
        };
        await consumptionController.attributes.createLocalAttribute(relationshipAttributeParams);

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
        const relationshipAttribute = await consumptionController.attributes.createPeerLocalAttribute({
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
            peer: CoreAddress.from("peerAddress"),
            requestReference: CoreId.from("requestId")
        });

        const attributes = await consumptionController.attributes.executeThirdPartyRelationshipAttributeQuery({
            key: "customerId",
            owner: testAccount.identity.address,
            thirdParty: [CoreAddress.from("peerAddress")]
        });
        expect(attributes).toHaveLength(1);
        expect(attributes[0].id.toString()).toStrictEqual(relationshipAttribute.id.toString());
    });

    test("should not query relationship attributes with confidentiality set to `Private` using the ThirdPartyRelationshipAttributeQuery", async function () {
        await consumptionController.attributes.createPeerLocalAttribute({
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
            peer: CoreAddress.from("peerAddress"),
            requestReference: CoreId.from("requestId")
        });

        const attributes = await consumptionController.attributes.executeThirdPartyRelationshipAttributeQuery({
            key: "customerId",
            owner: testAccount.identity.address,
            thirdParty: [CoreAddress.from("peerAddress")]
        });
        expect(attributes).toHaveLength(0);
    });

    test("should not query relationship attributes with not matching key using the ThirdPartyRelationshipAttributeQuery", async function () {
        await consumptionController.attributes.createPeerLocalAttribute({
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
            peer: CoreAddress.from("peerAddress"),
            requestReference: CoreId.from("requestId")
        });

        const attributes = await consumptionController.attributes.executeThirdPartyRelationshipAttributeQuery({
            key: "notMatchingKey",
            owner: testAccount.identity.address,
            thirdParty: [CoreAddress.from("peerAddress")]
        });
        expect(attributes).toHaveLength(0);
    });

    test("should allow to query identity attributes", async function () {
        const identityAttributeParams: ICreateLocalAttributeParams = {
            content: IdentityAttribute.from({
                value: {
                    "@type": "Nationality",
                    value: "DE"
                },
                owner: testAccount.identity.address
            })
        };
        const identityAttribute = await consumptionController.attributes.createLocalAttribute(identityAttributeParams);

        const relationshipAttributeParams: ICreateLocalAttributeParams = {
            content: RelationshipAttribute.from({
                key: "customerId",
                value: {
                    "@type": "ProprietaryString",
                    value: "0815",
                    title: "Customer Id"
                },
                owner: testAccount.identity.address,
                confidentiality: "public" as RelationshipAttributeConfidentiality
            })
        };
        const relationshipAttribute = await consumptionController.attributes.createLocalAttribute(relationshipAttributeParams);

        const query: IIdentityAttributeQuery = {
            valueType: "Nationality"
        };

        const attributes = await consumptionController.attributes.executeIdentityAttributeQuery(query);
        const attributesId = attributes.map((v) => v.id.toString());
        expect(attributesId).not.toContain(relationshipAttribute.id.toString());
        expect(attributesId).toContain(identityAttribute.id.toString());
    });

    test("should successfully execute IQL queries only with repository attributes", async function () {
        const identityAttributeParams: ICreateLocalAttributeParams = {
            content: IdentityAttribute.from({
                value: {
                    "@type": "Nationality",
                    value: "DE"
                },
                owner: testAccount.identity.address
            })
        };
        const identityAttribute = await consumptionController.attributes.createLocalAttribute(identityAttributeParams);
        await consumptionController.attributes.createSharedLocalAttributeCopy({
            peer: CoreAddress.from("a-fake-peer"),
            requestReference: CoreId.from("a-fake-reference"),
            sourceAttributeId: identityAttribute.id,
            attributeId: CoreId.from("fake-attribute-id")
        });

        const iqlQuery: IIQLQuery = { queryString: "Nationality=DE" };
        const matchedAttributes = await consumptionController.attributes.executeIQLQuery(iqlQuery);
        expect(matchedAttributes).toHaveLength(1);
        const matchedAttributeIds = matchedAttributes.map((v) => v.id.toString());
        expect(matchedAttributeIds).toContain(identityAttribute.id.toString());
    });

    test("should only return repository attributes on IdentityAttributeQuery", async function () {
        const identityAttributeParams: ICreateLocalAttributeParams = {
            content: IdentityAttribute.from({
                value: {
                    "@type": "DisplayName",
                    value: "Dis Play"
                },
                owner: testAccount.identity.address
            })
        };
        const identityAttribute = await consumptionController.attributes.createLocalAttribute(identityAttributeParams);

        const relationshipAttributeParams: ICreateLocalAttributeParams = {
            content: RelationshipAttribute.from({
                key: "displayName",
                value: {
                    "@type": "ProprietaryString",
                    title: "A Title",
                    value: "DE"
                },
                owner: testAccount.identity.address,
                confidentiality: "public" as RelationshipAttributeConfidentiality
            })
        };
        const relationshipAttribute = await consumptionController.attributes.createLocalAttribute(relationshipAttributeParams);

        const peerAttributeParams: ICreateLocalAttributeParams = {
            content: IdentityAttribute.from({
                value: {
                    "@type": "DisplayName",
                    value: "DE"
                },
                owner: CoreAddress.from("peer")
            })
        };
        const peerAttribute = await consumptionController.attributes.createLocalAttribute(peerAttributeParams);

        const sentAttribute = await consumptionController.attributes.createSharedLocalAttributeCopy({
            peer: CoreAddress.from("peer"),
            requestReference: CoreId.from("ref"),
            sourceAttributeId: identityAttribute.id
        });

        const receivedAttribute = await consumptionController.attributes.createSharedLocalAttributeCopy({
            peer: CoreAddress.from("peer"),
            requestReference: CoreId.from("ref2"),
            sourceAttributeId: peerAttribute.id,
            attributeId: CoreId.from("attr1")
        });

        const query: IIdentityAttributeQuery = {
            valueType: "DisplayName"
        };

        const attributes = await consumptionController.attributes.executeIdentityAttributeQuery(query);
        const attributesId = attributes.map((v) => v.id.toString());
        expect(attributes).toHaveLength(1);
        expect(attributesId).not.toContain(relationshipAttribute.id.toString());
        expect(attributesId).not.toContain(peerAttribute.id.toString());
        expect(attributesId).not.toContain(sentAttribute.id.toString());
        expect(attributesId).not.toContain(receivedAttribute.id.toString());
        expect(attributesId).toContain(identityAttribute.id.toString());
    });

    test("should allow to create an attribute shared by a peer", async function () {
        const attribute: ICreateLocalAttributeParams = {
            content: IdentityAttribute.from({
                value: {
                    "@type": "Nationality",
                    value: "DE"
                },
                owner: CoreAddress.from("address")
            })
        };
        const localAttribute = await consumptionController.attributes.createLocalAttribute(attribute);
        const createPeerAttributeParams: ICreatePeerLocalAttributeParams = {
            id: localAttribute.id,
            content: attribute.content,
            requestReference: CoreId.from("requestId"),
            peer: CoreAddress.from("address")
        };
        const peerLocalAttribute = await consumptionController.attributes.createPeerLocalAttribute(createPeerAttributeParams);
        expect(peerLocalAttribute.content.toJSON()).toStrictEqual(localAttribute.content.toJSON());
        expect(peerLocalAttribute.content.value).toBeInstanceOf(Nationality);
        expect(createPeerAttributeParams.id).toStrictEqual(localAttribute.id);
        expect(createPeerAttributeParams.peer.address).toStrictEqual(CoreAddress.from("address").toString());
        expect(createPeerAttributeParams.requestReference.toString()).toStrictEqual(CoreId.from("requestId").toString());

        mockEventBus.expectLastPublishedEvent(AttributeCreatedEvent);
    });

    describe("Attribute successions", function () {
        describe("Common validator", function () {
            afterEach(async function () {
                const attributes = await consumptionController.attributes.getLocalAttributes();
                for (const attribute of attributes) {
                    await consumptionController.attributes.deleteAttributeUnsafe(attribute.id);
                }
            });

            test("should catch if the successor attribute already exist, if an explicit id is provided", async function () {
                const predecessor = await consumptionController.attributes.createLocalAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address")
                    })
                });
                const successorData: IAttributeSuccessorParams = {
                    id: CoreId.from("successorId"),
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("differentAddress")
                    })
                };
                await consumptionController.attributes.createLocalAttribute(successorData);

                const validationResult = await consumptionController.attributes.validateAttributeSuccessionCommon(predecessor.id, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.successorMustNotYetExist"
                });
            });

            test("should catch if the successor is not linked to predecessor, if succeeds is explicitly set", async function () {
                const predecessor = await consumptionController.attributes.createLocalAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address")
                    })
                });
                const successorData: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address")
                    }),
                    succeeds: CoreId.from("differentAddress")
                };

                const validationResult = await consumptionController.attributes.validateAttributeSuccessionCommon(predecessor.id, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.invalidPredecessor"
                });
            });

            test("should catch if the successor already has a successor itself", async function () {
                const predecessor = await consumptionController.attributes.createLocalAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address")
                    })
                });
                const successorData: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address")
                    }),
                    succeededBy: CoreId.from("differentAddress")
                };

                const validationResult = await consumptionController.attributes.validateAttributeSuccessionCommon(predecessor.id, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.successorMustNotHaveASuccessor"
                });
            });

            test("should catch if the successor has parent", async function () {
                const predecessor = await consumptionController.attributes.createLocalAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address")
                    })
                });
                const successorData: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address")
                    }),
                    parentId: CoreId.from("parentId")
                };

                const validationResult = await consumptionController.attributes.validateAttributeSuccessionCommon(predecessor.id, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.cannotSucceedPartOfComplexAttribute"
                });
            });

            test("should catch if the predecessor does not exist", async function () {
                const successorData: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("differentAddress")
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
                        owner: CoreAddress.from("address")
                    })
                });
                const successorData: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address")
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
                        owner: CoreAddress.from("address")
                    })
                });
                const successorData: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address")
                    })
                };

                const validationResult = await consumptionController.attributes.validateAttributeSuccessionCommon(predecessor.id, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.cannotSucceedPartOfComplexAttribute"
                });
            });

            test("should catch attempted change of owner", async function () {
                const predecessor = await consumptionController.attributes.createLocalAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address")
                    })
                });
                const successorData: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
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
                const predecessor = await consumptionController.attributes.createLocalAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Citizenship",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address")
                    })
                });
                const successorData: IAttributeSuccessorParams = {
                    content: RelationshipAttribute.from({
                        key: "DisplayName",
                        value: {
                            "@type": "ProprietaryString",
                            value: "ADisplayName",
                            title: "Display Name"
                        },
                        owner: CoreAddress.from("address"),
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    })
                };

                const validationResult = await consumptionController.attributes.validateAttributeSuccessionCommon(predecessor.id, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.successionMustNotChangeContentType"
                });
            });

            test("should catch attempted change of value type", async function () {
                const predecessor = await consumptionController.attributes.createLocalAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "BirthName",
                            value: "Müller"
                        },
                        owner: CoreAddress.from("address")
                    })
                });
                const successorData: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "BirthCountry",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address")
                    })
                };

                const validationResult = await consumptionController.attributes.validateAttributeSuccessionCommon(predecessor.id, successorData);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.successionMustNotChangeValueType"
                });
            });
        });

        describe("Validator for own shared identity attribute successions", function () {
            afterEach(async function () {
                const attributes = await consumptionController.attributes.getLocalAttributes();
                for (const attribute of attributes) {
                    await consumptionController.attributes.deleteAttributeUnsafe(attribute.id);
                }
            });

            test("should catch if the source attributes do not succeed one another", async function () {
                const predecessorRepo = await consumptionController.attributes.createLocalAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Citizenship",
                            value: "AF"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });

                const predecessor = await consumptionController.attributes.createSharedLocalAttributeCopy({
                    sourceAttributeId: predecessorRepo.id,
                    peer: CoreAddress.from("peer"),
                    requestReference: CoreId.from("reqRef")
                });

                const repoAttribute2 = await consumptionController.attributes.createLocalAttribute({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Citizenship",
                            value: "US"
                        },
                        owner: consumptionController.accountController.identity.address
                    })
                });

                const successorParams: IAttributeSuccessorParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Citizenship",
                            value: "US"
                        },
                        owner: consumptionController.accountController.identity.address
                    }),
                    shareInfo: {
                        peer: CoreAddress.from("peer"),
                        requestReference: CoreId.from("reqRef2"),
                        sourceAttribute: repoAttribute2.id
                    }
                };

                const validationResult = await consumptionController.attributes.validateOwnSharedIdentityAttributeSuccession(predecessor.id, successorParams);
                expect(validationResult).errorValidationResult({
                    code: "error.consumption.attributes.invalidSuccessionOfOwnSharedIdentityAttribute"
                });
            });
        });

        describe("Happy paths for attribute successions", function () {
            afterEach(async function () {
                const attributes = await consumptionController.attributes.getLocalAttributes();
                for (const attribute of attributes) {
                    await consumptionController.attributes.deleteAttributeUnsafe(attribute.id);
                }
            });

            test("should succeed a repository attribute", async function () {
                const predecessor = await consumptionController.attributes.createLocalAttribute({
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

            test("should succeed an own shared identity attribute", async function () {
                const predecessorRepo = await consumptionController.attributes.createLocalAttribute({
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
                const predecessorRepo = await consumptionController.attributes.createLocalAttribute({
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
                    version0ChildValues = ["AStreet", "AHouseNo", "AZipCode", "ACity", "DE"];

                    const identityAttribute = IdentityAttribute.from({
                        value: {
                            "@type": "StreetAddress",
                            recipient: "ARecipient",
                            street: version0ChildValues[0],
                            houseNo: version0ChildValues[1],
                            zipCode: version0ChildValues[2],
                            city: version0ChildValues[3],
                            country: version0ChildValues[4]
                        },
                        owner: consumptionController.accountController.identity.address
                    });

                    repoVersion0 = await consumptionController.attributes.createLocalAttribute({
                        content: identityAttribute
                    });

                    version1ChildValues = ["ANewStreet", "ANewHouseNo", "ANewZipCode", "ANewCity", "DE"];

                    repoVersion1Params = {
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "StreetAddress",
                                recipient: "ANewRecipient",
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

                    expect((updatedRepoVersion0.content.value as StreetAddress).recipient).toBe("ARecipient");
                    expect((repoVersion1.content.value as StreetAddress).recipient).toBe("ANewRecipient");

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

                test("should succeed a complex repository attribute adding an optional child", async function () {
                    repoVersion1Params = {
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "StreetAddress",
                                recipient: "ANewRecipient",
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
                            recipient: "ARecipient",
                            street: version0ChildValues[0],
                            houseNo: version0ChildValues[1],
                            zipCode: version0ChildValues[2],
                            city: version0ChildValues[3],
                            country: version0ChildValues[4],
                            state: "Berlin"
                        },
                        validTo: CoreDate.utc(),
                        owner: consumptionController.accountController.identity.address
                    });

                    repoVersion0 = await consumptionController.attributes.createLocalAttribute({
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
                            recipient: "ARecipient",
                            street: version0ChildValues[0],
                            houseNo: version0ChildValues[1],
                            zipCode: version0ChildValues[2],
                            city: version0ChildValues[3],
                            country: version0ChildValues[4],
                            state: "Berlin"
                        },
                        owner: consumptionController.accountController.identity.address
                    });
                    repoVersion0 = await consumptionController.attributes.createLocalAttribute({
                        content: identityAttribute
                    });

                    const { successor: repoVersion1 } = await consumptionController.attributes.succeedRepositoryAttribute(repoVersion0.id, repoVersion1Params);

                    const repoVersion2Params = {
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "StreetAddress",
                                recipient: "ANewRecipient",
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

                    expect((ownSharedVersion1.content.value as StreetAddress).recipient).toBe("ANewRecipient");
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

                    const version2ChildValues = ["ANewNewStreet", "ANewNewHouseNo", "ANewNewZipCode", "ANewNewCity", "DE"];

                    const repoVersion2Params: IAttributeSuccessorParams = {
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "StreetAddress",
                                recipient: "ANewNewRecipient",
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

                    expect((ownSharedVersion2.content.value as StreetAddress).recipient).toBe("ANewNewRecipient");
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
                            recipient: "ARecipient",
                            street: version0ChildValues[0],
                            houseNo: version0ChildValues[1],
                            zipCode: version0ChildValues[2],
                            city: version0ChildValues[3],
                            country: version0ChildValues[4]
                        },
                        validTo: CoreDate.utc(),
                        owner: CoreAddress.from("peer")
                    });

                    const peerSharedVersion0 = await consumptionController.attributes.createLocalAttribute({
                        content: identityAttribute,
                        shareInfo: {
                            peer: CoreAddress.from("peer"),
                            requestReference: CoreId.from("reqRef2")
                        }
                    });

                    const peerSharedVersion1Params: IAttributeSuccessorParams = {
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "StreetAddress",
                                recipient: "ANewRecipient",
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

                    expect((peerSharedVersion1.content.value as StreetAddress).recipient).toBe("ANewRecipient");
                    expect((peerSharedVersion1.content.value as StreetAddress).street.toString()).toBe(version1ChildValues[0]);
                    expect((peerSharedVersion1.content.value as StreetAddress).houseNo.toString()).toBe(version1ChildValues[1]);
                    expect((peerSharedVersion1.content.value as StreetAddress).zipCode.toString()).toBe(version1ChildValues[2]);
                    expect((peerSharedVersion1.content.value as StreetAddress).city.toString()).toBe(version1ChildValues[3]);
                    expect((peerSharedVersion1.content.value as StreetAddress).country.toString()).toBe(version1ChildValues[4]);
                });
            });

            test("should succeed a peer shared identity attribute", async function () {
                const predecessor = await consumptionController.attributes.createLocalAttribute({
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
                const predecessor = await consumptionController.attributes.createLocalAttribute({
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
                    shareInfo: {
                        peer: CoreAddress.from("peerAddress"),
                        requestReference: CoreId.from("reqRefA")
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
                const predecessor = await consumptionController.attributes.createLocalAttribute({
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
                    shareInfo: {
                        peer: CoreAddress.from("peerAddress"),
                        requestReference: CoreId.from("reqRefA")
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
        });
    });

    describe("hideTechnical", function () {
        beforeEach(async function () {
            await consumptionController.attributes.createLocalAttribute({
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
                })
            });

            await consumptionController.attributes.createLocalAttribute({
                content: RelationshipAttribute.from({
                    key: "isTechnicalNotDefined",
                    value: {
                        "@type": "ProprietaryString",
                        value: "0815",
                        title: "Customer ID"
                    },
                    owner: testAccount.identity.address,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                })
            });

            await consumptionController.attributes.createLocalAttribute({
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
                })
            });
        });

        test("should hide technical attributes when no query is given", async function () {
            const attributes = await consumptionController.attributes.getLocalAttributes(undefined, true);
            expect(attributes).toHaveLength(4);
        });

        test("should hide technical attributes when empty query is given", async function () {
            const attributes = await consumptionController.attributes.getLocalAttributes({}, true);
            expect(attributes).toHaveLength(4);
        });
    });

    describe("get versions of attribute", function () {
        test("should return all versions of a possibly succeeded repository attribute", async function () {
            const version0 = await consumptionController.attributes.createLocalAttribute({
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

            const onlyVersion0 = await consumptionController.attributes.getVersionsOfAttribute(version0.id);
            expect(onlyVersion0).toStrictEqual([version0]);

            const { predecessor: updatedVersion0, successor: version1 } = await consumptionController.attributes.succeedRepositoryAttribute(version0.id, successorParams1);
            const { predecessor: updatedVersion1, successor: version2 } = await consumptionController.attributes.succeedRepositoryAttribute(version1.id, successorParams2);

            const allVersions = [version2, updatedVersion1, updatedVersion0];

            for (const version of allVersions) {
                const result = await consumptionController.attributes.getVersionsOfAttribute(version.id);
                expect(result).toStrictEqual([version2, updatedVersion1, updatedVersion0]);
            }
        });

        test("should return all versions of a possibly succeeded own shared identity attribute", async function () {
            const version0Repo = await consumptionController.attributes.createLocalAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            });
            const successorParams1Repo: IAttributeSuccessorParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "US"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            };
            const successorParams2Repo: IAttributeSuccessorParams = {
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "CZ"
                    },
                    owner: consumptionController.accountController.identity.address
                })
            };

            const { predecessor: updatedVersion0Repo, successor: version1Repo } = await consumptionController.attributes.succeedRepositoryAttribute(
                version0Repo.id,
                successorParams1Repo
            );
            const { predecessor: updatedVersion1Repo, successor: version2Repo } = await consumptionController.attributes.succeedRepositoryAttribute(
                version1Repo.id,
                successorParams2Repo
            );

            const version0A = await consumptionController.attributes.createSharedLocalAttributeCopy({
                sourceAttributeId: updatedVersion0Repo.id,
                peer: CoreAddress.from("peerA"),
                requestReference: CoreId.from("reqRef")
            });

            const versionsA = await consumptionController.attributes.getVersionsOfAttribute(version0A.id);
            expect(versionsA).toStrictEqual([version0A]);

            const version1B = await consumptionController.attributes.createSharedLocalAttributeCopy({
                sourceAttributeId: updatedVersion1Repo.id,
                peer: CoreAddress.from("peerB"),
                requestReference: CoreId.from("reqRef1")
            });

            const successorParams2B: IAttributeSuccessorParams = {
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
                    sourceAttribute: version2Repo.id
                }
            };

            const { predecessor: updatedVersion1B, successor: version2B } = await consumptionController.attributes.succeedOwnSharedIdentityAttribute(
                version1B.id,
                successorParams2B
            );

            const allVersions = [version2B, updatedVersion1B];
            for (const version of allVersions) {
                const result = await consumptionController.attributes.getVersionsOfAttribute(version.id);
                expect(result).toStrictEqual(allVersions);
            }
        });

        test("should return all versions of a possibly succeeded peer shared identity attribute", async function () {
            const version0 = await consumptionController.attributes.createLocalAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: CoreAddress.from("peer")
                }),
                shareInfo: {
                    peer: CoreAddress.from("peer"),
                    requestReference: CoreId.from("reqRefA")
                }
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
            expect(onlyVersion0).toStrictEqual([version0]);

            const { predecessor: updatedVersion0, successor: version1 } = await consumptionController.attributes.succeedPeerSharedIdentityAttribute(version0.id, successorParams1);
            const { predecessor: updatedVersion1, successor: version2 } = await consumptionController.attributes.succeedPeerSharedIdentityAttribute(version1.id, successorParams2);

            const allVersions = [version2, updatedVersion1, updatedVersion0];

            for (const version of allVersions) {
                const result = await consumptionController.attributes.getVersionsOfAttribute(version.id);
                expect(result).toStrictEqual(allVersions);
            }
        });

        test("should return all versions of a possibly succeeded own shared relationship attribute", async function () {
            const version0 = await consumptionController.attributes.createLocalAttribute({
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
                shareInfo: {
                    peer: CoreAddress.from("peerAddress"),
                    requestReference: CoreId.from("reqRefA")
                }
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
            expect(onlyVersion0).toStrictEqual([version0]);

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
                expect(result).toStrictEqual(allVersions);
            }
        });

        test("should return all versions of a possibly succeeded peer shared relationship attribute", async function () {
            const version0 = await consumptionController.attributes.createLocalAttribute({
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
                shareInfo: {
                    peer: CoreAddress.from("peerAddress"),
                    requestReference: CoreId.from("reqRefA")
                }
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
            expect(onlyVersion0).toStrictEqual([version0]);

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
                expect(result).toStrictEqual(allVersions);
            }
        });

        test("should throw if an unassigned attribute id is queried", async function () {
            await TestUtil.expectThrowsAsync(consumptionController.attributes.getVersionsOfAttribute(CoreId.from("ATTxxxxxxxxxxxxxxxxx")), "error.transport.recordNotFound");
        });
    });

    describe("get shared versions of a repository attribute", function () {
        let repositoryAttributeV0: LocalAttribute;
        let repositoryAttributeV1: LocalAttribute;
        let repositoryAttributeV2: LocalAttribute;
        let ownSharedIdentityAttributeV1PeerA: LocalAttribute;
        let ownSharedIdentityAttributeV1PeerB: LocalAttribute;
        let ownSharedIdentityAttributeV2PeerB: LocalAttribute;
        beforeEach(async function () {
            repositoryAttributeV0 = await consumptionController.attributes.createLocalAttribute({
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

        test("should return all shared versions for all peers", async function () {
            const allRepositoryAttributeVersions = [repositoryAttributeV0, repositoryAttributeV1, repositoryAttributeV2];
            const allOwnSharedAttributeVersions = [ownSharedIdentityAttributeV2PeerB, ownSharedIdentityAttributeV1PeerA, ownSharedIdentityAttributeV1PeerB];
            for (const repositoryAttributeVersion of allRepositoryAttributeVersions) {
                const result1 = await consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(repositoryAttributeVersion.id, undefined, false);
                expect(result1).toStrictEqual(allOwnSharedAttributeVersions);

                const result2 = await consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(
                    repositoryAttributeVersion.id,
                    [CoreAddress.from("peerA"), CoreAddress.from("peerB")],
                    false
                );
                expect(result2).toStrictEqual(allOwnSharedAttributeVersions);
            }
        });

        test("should return all shared versions for a single peer", async function () {
            const allRepositoryAttributeVersions = [repositoryAttributeV0, repositoryAttributeV1, repositoryAttributeV2];
            const allOwnSharedAttributeVersionsPeerB = [ownSharedIdentityAttributeV2PeerB, ownSharedIdentityAttributeV1PeerB];
            for (const repositoryAttributeVersion of allRepositoryAttributeVersions) {
                const resultA = await consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(repositoryAttributeVersion.id, [CoreAddress.from("peerA")], false);
                expect(resultA).toStrictEqual([ownSharedIdentityAttributeV1PeerA]);

                const resultB = await consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(repositoryAttributeVersion.id, [CoreAddress.from("peerB")], false);
                expect(resultB).toStrictEqual(allOwnSharedAttributeVersionsPeerB);
            }
        });

        test("should return only latest shared versions for all peers", async function () {
            const allRepositoryAttributeVersions = [repositoryAttributeV0, repositoryAttributeV1, repositoryAttributeV2];
            for (const repositoryAttributeVersion of allRepositoryAttributeVersions) {
                const result = await consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(repositoryAttributeVersion.id);
                expect(result).toStrictEqual([ownSharedIdentityAttributeV2PeerB, ownSharedIdentityAttributeV1PeerA]);
            }
        });

        test("should return only latest shared version for a single peer", async function () {
            const allRepositoryAttributeVersions = [repositoryAttributeV0, repositoryAttributeV1, repositoryAttributeV2];
            for (const repositoryAttributeVersion of allRepositoryAttributeVersions) {
                const resultA = await consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(repositoryAttributeVersion.id, [CoreAddress.from("peerA")]);
                expect(resultA).toStrictEqual([ownSharedIdentityAttributeV1PeerA]);

                const resultB = await consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(repositoryAttributeVersion.id, [CoreAddress.from("peerB")]);
                expect(resultB).toStrictEqual([ownSharedIdentityAttributeV2PeerB]);
            }
        });

        test("should throw if an unassigned attribute id is queried", async function () {
            await TestUtil.expectThrowsAsync(
                consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(CoreId.from("ATTxxxxxxxxxxxxxxxxx")),
                "error.transport.recordNotFound"
            );
        });

        test("should throw if a shared identity attribute is queried", async function () {
            const sharedIdentityAttribute = await consumptionController.attributes.createLocalAttribute({
                content: IdentityAttribute.from({
                    value: {
                        "@type": "DisplayName",
                        value: "Name X"
                    },
                    owner: consumptionController.accountController.identity.address
                }),
                shareInfo: {
                    peer: CoreAddress.from("peer"),
                    requestReference: CoreId.from("reqRefX")
                }
            });

            await TestUtil.expectThrowsAsync(
                consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(sharedIdentityAttribute.id),
                "error.consumption.attributes.invalidPropertyValue"
            );
        });

        test("should throw if a relationship attribute is queried", async function () {
            const relationshipAttribute = await consumptionController.attributes.createLocalAttribute({
                content: RelationshipAttribute.from({
                    key: "Some key",
                    value: {
                        "@type": "ProprietaryString",
                        value: "Some value",
                        title: "Some title"
                    },
                    owner: consumptionController.accountController.identity.address,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }),
                shareInfo: {
                    peer: CoreAddress.from("peerAddress"),
                    requestReference: CoreId.from("reqRef123")
                }
            });

            await TestUtil.expectThrowsAsync(
                consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(relationshipAttribute.id),
                "error.consumption.attributes.invalidPropertyValue"
            );
        });
    });
});
