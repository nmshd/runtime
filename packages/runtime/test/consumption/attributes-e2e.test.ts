import { AttributeDeletedByPeerEvent } from "@nmshd/consumption";
import { CityJSON, CountryJSON, HouseNumberJSON, RelationshipAttributeConfidentiality, RequestItemJSONDerivations, StreetJSON, ZipCodeJSON } from "@nmshd/content";
import { CoreDate, CoreId } from "@nmshd/transport";
import {
    AttributeCreatedEvent,
    CreateAndShareRelationshipAttributeRequest,
    CreateAndShareRelationshipAttributeUseCase,
    CreateRepositoryAttributeRequest,
    CreateRepositoryAttributeUseCase,
    DeletePeerSharedAttributeUseCase,
    GetSharedVersionsOfRepositoryAttributeUseCase,
    GetVersionsOfAttributeUseCase,
    LocalAttributeDTO,
    NotifyPeerAboutRepositoryAttributeSuccessionUseCase,
    RepositoryAttributeSucceededEvent,
    ShareRepositoryAttributeRequest,
    ShareRepositoryAttributeUseCase,
    SucceedRelationshipAttributeAndNotifyPeerUseCase,
    SucceedRepositoryAttributeRequest,
    SucceedRepositoryAttributeUseCase
} from "../../src";
import {
    acceptIncomingShareAttributeRequest,
    ensureActiveRelationship,
    executeFullCreateAndShareRelationshipAttributeFlow,
    executeFullCreateAndShareRepositoryAttributeFlow,
    executeFullNotifyPeerAboutAttributeSuccessionFlow,
    executeFullShareRepositoryAttributeFlow,
    executeFullSucceedRepositoryAttributeAndNotifyPeerFlow,
    RuntimeServiceProvider,
    syncUntilHasMessageWithNotification,
    TestRuntimeServices,
    waitForRecipientToReceiveNotification
} from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();

let services1: TestRuntimeServices;
let services2: TestRuntimeServices;
let services3: TestRuntimeServices;

beforeAll(async () => {
    const numberOfServices = 3;
    const runtimeServices = await runtimeServiceProvider.launch(numberOfServices, { enableRequestModule: true, enableDeciderModule: true, enableNotificationModule: true });

    services1 = runtimeServices[0];
    services2 = runtimeServices[1];
    services3 = runtimeServices[2];

    await ensureActiveRelationship(services1.transport, services2.transport);
    await ensureActiveRelationship(services1.transport, services3.transport);
    await ensureActiveRelationship(services2.transport, services3.transport);

    await createAndShareRepositoryAttributesBetweenAllServices();
    await createAndShareAndSucceedRepositoryAttributesBetweenSomeServices();
    await createAndShareRelationshipAttributesBetweenAllServicesAndSucceedSome();

    async function createAndShareRepositoryAttributesBetweenAllServices() {
        for (let i = 0; i < numberOfServices; i++) {
            const repositoryAttributeId = (
                await executeFullCreateAndShareRepositoryAttributeFlow(runtimeServices[i], runtimeServices[(i + 1) % numberOfServices], {
                    content: {
                        value: {
                            "@type": "DisplayName",
                            value: `Service ${i + 1}`
                        }
                    }
                })
            ).shareInfo!.sourceAttribute!;

            await executeFullShareRepositoryAttributeFlow(runtimeServices[i], runtimeServices[(i + 2) % numberOfServices], repositoryAttributeId);
        }
    }

    async function createAndShareAndSucceedRepositoryAttributesBetweenSomeServices() {
        for (let i = 0; i < numberOfServices; i++) {
            const repositoryPredecessor = (
                await executeFullCreateAndShareRepositoryAttributeFlow(runtimeServices[i], runtimeServices[(i + 1) % numberOfServices], {
                    content: {
                        value: {
                            "@type": "EMailAddress",
                            value: `Service${i + 1}@mail.com`
                        }
                    }
                })
            ).shareInfo!.sourceAttribute!;

            await executeFullSucceedRepositoryAttributeAndNotifyPeerFlow(runtimeServices[i], runtimeServices[(i + 1) % numberOfServices], {
                predecessorId: repositoryPredecessor,
                successorContent: {
                    value: {
                        "@type": "EMailAddress",
                        value: `Service${i + 1}New@mail.com`
                    }
                }
            });
        }
    }

    async function createAndShareRelationshipAttributesBetweenAllServicesAndSucceedSome() {
        for (let i = 0; i < numberOfServices; i++) {
            for (let j = 1; j < numberOfServices; j++) {
                const predecessorId = (
                    await executeFullCreateAndShareRelationshipAttributeFlow(runtimeServices[i], runtimeServices[(i + j) % numberOfServices], {
                        content: {
                            key: "work phone",
                            value: {
                                "@type": "ProprietaryPhoneNumber",
                                title: "Work phone",
                                value: `0123${i}${j}`
                            },
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }
                    })
                ).id;

                if (j === 1) {
                    await runtimeServices[i].consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
                        predecessorId: predecessorId,
                        successorContent: {
                            value: {
                                "@type": "ProprietaryPhoneNumber",
                                title: "Work phone",
                                value: `00123${i}${j}`
                            }
                        }
                    });
                }
            }
        }
    }
}, 120000);
afterAll(async () => await runtimeServiceProvider.stop());

describe(CreateRepositoryAttributeUseCase.name, () => {
    test("should create a repository attribute", async () => {
        const request: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        };
        const result = await services1.consumption.attributes.createRepositoryAttribute(request);
        expect(result.isError).toBe(false);
        const attribute = result.value;
        expect(attribute.content).toMatchObject(request.content);
        await services1.eventBus.waitForEvent(AttributeCreatedEvent, (e) => e.data.id === attribute.id);
    });

    test("should create LocalAttributes for each child of a complex repository attribute", async function () {
        const attributesBeforeCreate = await services1.consumption.attributes.getAttributes({});
        const nrAttributesBeforeCreate = attributesBeforeCreate.value.length;

        const createRepositoryAttributeParams: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "StreetAddress",
                    recipient: "ARecipient",
                    street: "AStreet",
                    houseNo: "AHouseNo",
                    zipCode: "AZipCode",
                    city: "ACity",
                    country: "DE"
                }
            }
        };
        const createRepositoryAttributeResult = await services1.consumption.attributes.createRepositoryAttribute(createRepositoryAttributeParams);
        expect(createRepositoryAttributeResult).toBeSuccessful();
        const complexRepoAttribute = createRepositoryAttributeResult.value;

        const childAttributes = (
            await services1.consumption.attributes.getAttributes({
                query: {
                    parentId: complexRepoAttribute.id
                }
            })
        ).value;

        expect(childAttributes).toHaveLength(5);
        expect(childAttributes[0].content.value["@type"]).toBe("Street");
        expect((childAttributes[0].content.value as StreetJSON).value).toBe("AStreet");
        expect(childAttributes[1].content.value["@type"]).toBe("HouseNumber");
        expect((childAttributes[1].content.value as HouseNumberJSON).value).toBe("AHouseNo");
        expect(childAttributes[2].content.value["@type"]).toBe("ZipCode");
        expect((childAttributes[2].content.value as ZipCodeJSON).value).toBe("AZipCode");
        expect(childAttributes[3].content.value["@type"]).toBe("City");
        expect((childAttributes[3].content.value as CityJSON).value).toBe("ACity");
        expect(childAttributes[4].content.value["@type"]).toBe("Country");
        expect((childAttributes[4].content.value as CountryJSON).value).toBe("DE");

        const attributesAfterCreate = (await services1.consumption.attributes.getAttributes({})).value;
        const nrAttributesAfterCreate = attributesAfterCreate.length;
        expect(nrAttributesAfterCreate).toBe(nrAttributesBeforeCreate + 6);

        await expect(services1.eventBus).toHavePublished(AttributeCreatedEvent, (e) => e.data.content.value["@type"] === "StreetAddress");
        await expect(services1.eventBus).toHavePublished(AttributeCreatedEvent, (e) => e.data.content.value["@type"] === "Street");
        await expect(services1.eventBus).toHavePublished(AttributeCreatedEvent, (e) => e.data.content.value["@type"] === "HouseNumber");
        await expect(services1.eventBus).toHavePublished(AttributeCreatedEvent, (e) => e.data.content.value["@type"] === "ZipCode");
        await expect(services1.eventBus).toHavePublished(AttributeCreatedEvent, (e) => e.data.content.value["@type"] === "City");
        await expect(services1.eventBus).toHavePublished(AttributeCreatedEvent, (e) => e.data.content.value["@type"] === "Country");
    });
});

describe(ShareRepositoryAttributeUseCase.name, () => {
    let sRA: LocalAttributeDTO;
    let sOSIA: LocalAttributeDTO;
    let rPSIA: LocalAttributeDTO;
    beforeEach(async () => {
        sRA = (
            await services1.consumption.attributes.createRepositoryAttribute({
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "Petra Pan"
                    },
                    tags: ["tag1", "tag2"]
                }
            })
        ).value;
    });

    test("should initialize the sharing of a repository attribute", async () => {
        const shareRequest: ShareRepositoryAttributeRequest = {
            attributeId: sRA.id,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareRepositoryAttribute(shareRequest);
        expect(shareRequestResult.isSuccess).toBe(true);

        const shareRequestId = shareRequestResult.value.id;
        sOSIA = await acceptIncomingShareAttributeRequest(services1, services2, shareRequestId);

        const rPSIAResult = await services2.consumption.attributes.getAttribute({ id: sOSIA.id });
        expect(rPSIAResult.isSuccess).toBe(true);
        rPSIA = rPSIAResult.value;

        expect(sOSIA.content).toStrictEqual(rPSIA.content);
        expect(sOSIA.shareInfo?.sourceAttribute?.toString()).toBe(sRA.id);
    });

    test("should initialize the sharing of a repository attribute with metadata", async () => {
        const expiresAt = CoreDate.utc().add({ days: 1 }).toString();
        const shareRequest: ShareRepositoryAttributeRequest = {
            attributeId: sRA.id,
            peer: services2.address,
            requestMetadata: {
                title: "A request title",
                description: "A request description",
                metadata: { aKey: "aValue" },
                expiresAt
            },
            requestItemMetadata: {
                title: "An item title",
                description: "An item description",
                metadata: { aKey: "aValue" },
                requireManualDecision: true
            }
        };
        const shareRequestResult = await services1.consumption.attributes.shareRepositoryAttribute(shareRequest);
        expect(shareRequestResult.isSuccess).toBe(true);
        const request = shareRequestResult.value;

        expect(request.content.title).toBe("A request title");
        expect(request.content.description).toBe("A request description");
        expect(request.content.metadata).toStrictEqual({ aKey: "aValue" });
        expect(request.content.expiresAt).toBe(expiresAt);

        expect(request.content.items[0].title).toBe("An item title");
        expect(request.content.items[0].description).toBe("An item description");
        expect(request.content.items[0].metadata).toStrictEqual({ aKey: "aValue" });
        expect((request.content.items[0] as RequestItemJSONDerivations).requireManualDecision).toBe(true);
    });

    test("should reject attempts to share the same repository attribute more than once with the same peer", async () => {
        await executeFullShareRepositoryAttributeFlow(services1, services3, sRA.id);

        const repeatedShareRequestResult = await services1.consumption.attributes.shareRepositoryAttribute({
            attributeId: sRA.id,
            peer: services3.address
        });

        expect(repeatedShareRequestResult).toBeAnError(/.*/, "error.runtime.attributes.repositoryAttributeHasAlreadyBeenSharedWithPeer");
    });

    test("should reject sharing an attribute, of which a previous version has been shared", async () => {
        const predecesssorOSIA = await executeFullCreateAndShareRepositoryAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "Surname",
                    value: "Name 1"
                }
            }
        });

        const { successor: successorRA } = (
            await services1.consumption.attributes.succeedRepositoryAttribute({
                predecessorId: predecesssorOSIA.shareInfo!.sourceAttribute!,
                successorContent: {
                    value: {
                        "@type": "Surname",
                        value: "Name 2"
                    }
                }
            })
        ).value;

        const response = await services1.consumption.attributes.shareRepositoryAttribute({
            attributeId: successorRA.id,
            peer: services2.address
        });
        expect(response).toBeAnError(/.*/, "error.runtime.attributes.anotherVersionOfRepositoryAttributeHasAlreadyBeenSharedWithPeer");
    });

    test("should reject sharing an own shared identity attribute", async () => {
        const shareRequest: ShareRepositoryAttributeRequest = {
            attributeId: sOSIA.id,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareRepositoryAttribute(shareRequest);
        expect(shareRequestResult).toBeAnError(/.*/, "error.runtime.attributes.isNotRepositoryAttribute");
    });

    test("should reject sharing a peer shared identity attribute", async () => {
        const shareRequest: ShareRepositoryAttributeRequest = {
            attributeId: rPSIA.id,
            peer: services1.address
        };
        const shareRequestResult = await services2.consumption.attributes.shareRepositoryAttribute(shareRequest);
        expect(shareRequestResult).toBeAnError(/.*/, "error.runtime.attributes.isNotRepositoryAttribute");
    });

    test("should reject sharing a relationship attribute", async () => {
        const createAndShareRelationshipAttributeRequest: CreateAndShareRelationshipAttributeRequest = {
            content: {
                key: "test",
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                confidentiality: RelationshipAttributeConfidentiality.Public
            },
            peer: services2.address
        };
        const sOSRA = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, createAndShareRelationshipAttributeRequest);

        const shareRequest: ShareRepositoryAttributeRequest = {
            attributeId: sOSRA.id,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareRepositoryAttribute(shareRequest);
        expect(shareRequestResult).toBeAnError(/.*/, "error.runtime.attributes.isNotRepositoryAttribute");
    });

    test("should throw if repository attribute doesn't exist", async () => {
        const shareRequest: ShareRepositoryAttributeRequest = {
            attributeId: (await CoreId.generate("ATT")).toString(),
            peer: services1.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareRepositoryAttribute(shareRequest);
        expect(shareRequestResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("should throw if repository attribute id is invalid ", async () => {
        const shareRequest: ShareRepositoryAttributeRequest = {
            attributeId: CoreId.from("faulty").toString(),
            peer: services1.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareRepositoryAttribute(shareRequest);
        expect(shareRequestResult).toBeAnError(/.*/, "error.runtime.validation.invalidPropertyValue");
    });
});

describe(SucceedRepositoryAttributeUseCase.name, () => {
    test("should succeed a repository attribute", async () => {
        const createAttributeRequest: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        };
        const predecessor = (await services1.consumption.attributes.createRepositoryAttribute(createAttributeRequest)).value;

        const succeedAttributeRequest: SucceedRepositoryAttributeRequest = {
            predecessorId: predecessor.id.toString(),
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Tina Turner"
                },
                tags: ["Bunsen", "Burner"]
            }
        };
        const result = await services1.consumption.attributes.succeedRepositoryAttribute(succeedAttributeRequest);
        expect(result.isError).toBe(false);
        const { predecessor: updatedPredecessor, successor } = result.value;
        expect(updatedPredecessor.succeededBy).toStrictEqual(successor.id);
        expect((successor as any).content.value.value).toBe("Tina Turner");
        await services1.eventBus.waitForEvent(RepositoryAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === updatedPredecessor.id && e.data.successor.id === successor.id;
        });
    });

    test("should throw if predecessor id is invalid", async () => {
        const succeedAttributeRequest: SucceedRepositoryAttributeRequest = {
            predecessorId: CoreId.from("faulty").toString(),
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Tina Turner"
                },
                tags: ["Bunsen", "Burner"]
            }
        };
        const result = await services1.consumption.attributes.succeedRepositoryAttribute(succeedAttributeRequest);
        expect(result).toBeAnError(/.*/, "error.consumption.attributes.predecessorDoesNotExist");
    });

    test("should throw if predecessor doesn't exist", async () => {
        const succeedAttributeRequest: SucceedRepositoryAttributeRequest = {
            predecessorId: (await CoreId.generate("ATT")).toString(),
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Tina Turner"
                },
                tags: ["Bunsen", "Burner"]
            }
        };
        const result = await services1.consumption.attributes.succeedRepositoryAttribute(succeedAttributeRequest);
        expect(result).toBeAnError(/.*/, "error.consumption.attributes.predecessorDoesNotExist");
    });

    test("validation should catch attempts of changing the value type", async () => {
        const createAttributeRequest: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        };
        const predecessor = (await services1.consumption.attributes.createRepositoryAttribute(createAttributeRequest)).value;

        const succeedAttributeRequest: SucceedRepositoryAttributeRequest = {
            predecessorId: predecessor.id.toString(),
            successorContent: {
                value: {
                    "@type": "PhoneNumber",
                    value: "+4915155253460"
                },
                tags: ["Bunsen", "Burner"]
            }
        };
        const result = await services1.consumption.attributes.succeedRepositoryAttribute(succeedAttributeRequest);
        expect(result).toBeAnError(/.*/, "error.consumption.attributes.successionMustNotChangeValueType");
    });
});

describe(NotifyPeerAboutRepositoryAttributeSuccessionUseCase.name, () => {
    let sSucceedIARequest1: SucceedRepositoryAttributeRequest;
    let sSucceedIARequest2: SucceedRepositoryAttributeRequest;
    let sOSIAVersion0: LocalAttributeDTO;
    let sRAVersion1: LocalAttributeDTO;
    let sRAVersion2: LocalAttributeDTO;
    beforeEach(async () => {
        sOSIAVersion0 = await executeFullCreateAndShareRepositoryAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        });

        sSucceedIARequest1 = {
            predecessorId: sOSIAVersion0.shareInfo!.sourceAttribute!,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Tina Turner"
                },
                tags: ["Bunsen", "Burner"]
            }
        };
        ({ successor: sRAVersion1 } = (await services1.consumption.attributes.succeedRepositoryAttribute(sSucceedIARequest1)).value);

        sSucceedIARequest2 = {
            predecessorId: sRAVersion1.id,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Martina Mustermann"
                }
            }
        };
        ({ successor: sRAVersion2 } = (await services1.consumption.attributes.succeedRepositoryAttribute(sSucceedIARequest2)).value);
    });

    test("should successfully notify peer about attribute succession", async () => {
        const notificationResult = await services1.consumption.attributes.notifyPeerAboutRepositoryAttributeSuccession({
            attributeId: sRAVersion1.id,
            peer: services2.address
        });
        expect(notificationResult.isSuccess).toBe(true);
    });

    test("should create sender own shared identity attribute and recipient peer shared identity attribute", async () => {
        const { successor: sOSIAVersion1 } = await executeFullNotifyPeerAboutAttributeSuccessionFlow(services1, services2, sRAVersion1.id);
        expect(sOSIAVersion1.succeeds).toStrictEqual(sOSIAVersion0.id);
        expect(sOSIAVersion1.content.value).toStrictEqual(sSucceedIARequest1.successorContent.value);
        expect((sOSIAVersion1 as any).content.tags).toStrictEqual(sSucceedIARequest1.successorContent.tags);

        const rPSIAVersion1 = (await services2.consumption.attributes.getAttribute({ id: sOSIAVersion1.id })).value;
        expect(rPSIAVersion1.content).toStrictEqual(sOSIAVersion1.content);
    });

    test("should allow to notify about successor having notified about predecessor", async () => {
        let { successor: sOSIAVersion1 } = await executeFullNotifyPeerAboutAttributeSuccessionFlow(services1, services2, sRAVersion1.id);

        const successionResult = await executeFullNotifyPeerAboutAttributeSuccessionFlow(services1, services2, sRAVersion2.id);
        sOSIAVersion1 = successionResult["predecessor"];
        const sOSIAVersion2 = successionResult["successor"];

        expect(sOSIAVersion1.succeededBy).toStrictEqual(sOSIAVersion2.id);
        expect(sOSIAVersion2.succeeds).toStrictEqual(sOSIAVersion1.id);
        expect(sOSIAVersion2.succeededBy).toBeUndefined();
    });

    test("should allow to notify about successor not having notified about predecessor", async () => {
        const { successor: sOSIAVersion2 } = await executeFullNotifyPeerAboutAttributeSuccessionFlow(services1, services2, sRAVersion2.id);
        expect(sOSIAVersion2.succeeds).toStrictEqual(sOSIAVersion0.id);
    });

    test("should throw if the same version of the attribute has been notified about already", async () => {
        await executeFullNotifyPeerAboutAttributeSuccessionFlow(services1, services2, sRAVersion1.id);

        const result2 = await services1.consumption.attributes.notifyPeerAboutRepositoryAttributeSuccession({
            attributeId: sRAVersion1.id,
            peer: services2.address
        });
        expect(result2).toBeAnError(/.*/, "error.runtime.attributes.repositoryAttributeHasAlreadyBeenSharedWithPeer");
    });

    test("should throw if a later version of the attribute has been notified about already", async () => {
        await executeFullNotifyPeerAboutAttributeSuccessionFlow(services1, services2, sRAVersion2.id);

        const notificationResult = await services1.consumption.attributes.notifyPeerAboutRepositoryAttributeSuccession({
            attributeId: sRAVersion1.id,
            peer: services2.address
        });
        expect(notificationResult).toBeAnError(/.*/, "error.consumption.attributes.invalidSuccessionOfOwnSharedIdentityAttribute");
    });

    test("should throw if no other version of the attribute has been shared before", async () => {
        const repoAttribute = (
            await services1.consumption.attributes.createRepositoryAttribute({
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "Petra Pan"
                    }
                }
            })
        ).value;

        const result = await services1.consumption.attributes.notifyPeerAboutRepositoryAttributeSuccession({ attributeId: repoAttribute.id, peer: services2.address });
        expect(result).toBeAnError(/.*/, "error.runtime.attributes.noOtherVersionOfRepositoryAttributeHasBeenSharedWithPeerBefore");
    });
});

describe(CreateAndShareRelationshipAttributeUseCase.name, () => {
    test("should create and share a relationship attribute", async () => {
        const createAndShareRelationshipAttributeRequest: CreateAndShareRelationshipAttributeRequest = {
            content: {
                key: "test",
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                confidentiality: RelationshipAttributeConfidentiality.Public
            },
            peer: services2.address
        };
        const requestResult = await services1.consumption.attributes.createAndShareRelationshipAttribute(createAndShareRelationshipAttributeRequest);
        expect(requestResult.isSuccess).toBe(true);

        const requestId = requestResult.value.id;
        const sOSRA = await acceptIncomingShareAttributeRequest(services1, services2, requestId);
        const rPSRA = (await services2.consumption.attributes.getAttribute({ id: sOSRA.id })).value;

        expect(sOSRA.content.value).toStrictEqual(createAndShareRelationshipAttributeRequest.content.value);
        expect(sOSRA.content).toStrictEqual(rPSRA.content);
    });

    test("should create and share a relationship attribute with metadata", async () => {
        const expiresAt = CoreDate.utc().add({ days: 1 }).toString();
        const createAndShareRelationshipAttributeRequest: CreateAndShareRelationshipAttributeRequest = {
            content: {
                key: "test",
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                confidentiality: RelationshipAttributeConfidentiality.Public
            },
            peer: services2.address,
            requestMetadata: {
                title: "A request Title",
                description: "A request Description",
                metadata: { aKey: "aValue" },
                expiresAt
            },
            requestItemMetadata: {
                title: "An item Title",
                description: "An item Description",
                metadata: { aKey: "aValue" },
                requireManualDecision: true
            }
        };
        const requestResult = await services1.consumption.attributes.createAndShareRelationshipAttribute(createAndShareRelationshipAttributeRequest);
        expect(requestResult.isSuccess).toBe(true);

        const request = requestResult.value;

        expect(request.content.title).toBe("A request Title");
        expect(request.content.description).toBe("A request Description");
        expect(request.content.metadata).toStrictEqual({ aKey: "aValue" });
        expect(request.content.expiresAt).toBe(expiresAt);

        expect(request.content.items[0].title).toBe("An item Title");
        expect(request.content.items[0].description).toBe("An item Description");
        expect(request.content.items[0].metadata).toStrictEqual({ aKey: "aValue" });
        expect((request.content.items[0] as RequestItemJSONDerivations).requireManualDecision).toBe(true);
    });
});

describe(SucceedRelationshipAttributeAndNotifyPeerUseCase.name, () => {
    let sOSRA: LocalAttributeDTO;
    beforeEach(async () => {
        sOSRA = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
            content: {
                key: "test",
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                confidentiality: RelationshipAttributeConfidentiality.Public
            }
        });
    });

    test("should succeed a relationship attribute and notify peer", async () => {
        const result = await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
            predecessorId: sOSRA.id,
            successorContent: {
                value: {
                    "@type": "ProprietaryString",
                    value: "another String",
                    title: "another title"
                }
            }
        });
        expect(result.isSuccess).toBe(true);

        await waitForRecipientToReceiveNotification(services1, services2, result.value);

        const senderPredecessor = result.value.predecessor;
        const senderSuccessor = result.value.successor;
        const recipientPredecessor = (await services2.consumption.attributes.getAttribute({ id: senderPredecessor.id })).value;
        const recipientSuccessor = (await services2.consumption.attributes.getAttribute({ id: senderSuccessor.id })).value;

        expect(senderSuccessor.content).toStrictEqual(recipientSuccessor.content);
        expect(senderSuccessor.shareInfo!.notificationReference).toStrictEqual(recipientSuccessor.shareInfo!.notificationReference);
        expect(senderSuccessor.shareInfo!.requestReference).toBeUndefined();
        expect(recipientSuccessor.shareInfo!.requestReference).toBeUndefined();
        expect(senderSuccessor.shareInfo!.peer).toBe(services2.address);
        expect(recipientSuccessor.shareInfo!.peer).toBe(services1.address);
        expect(senderSuccessor.succeeds).toBe(senderPredecessor.id);
        expect(recipientSuccessor.succeeds).toBe(recipientPredecessor.id);
        expect(senderPredecessor.succeededBy).toBe(senderSuccessor.id);
        expect(recipientPredecessor.succeededBy).toBe(recipientSuccessor.id);
    });

    test("should throw changing the value type succeeding a relationship attribute", async () => {
        const result = await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
            predecessorId: sOSRA.id,
            successorContent: {
                value: {
                    "@type": "ProprietaryBoolean",
                    value: true,
                    title: "another title"
                }
            }
        });

        expect(result).toBeAnError(/.*/, "error.consumption.attributes.successionMustNotChangeValueType");
    });
});

describe("Get (shared) versions of attribute", () => {
    let sRAVersion0: LocalAttributeDTO;
    let sRAVersion1: LocalAttributeDTO;
    let sRAVersion2: LocalAttributeDTO;
    let sRAVersions: LocalAttributeDTO[];

    let sOSIAVersion0: LocalAttributeDTO;
    let sOSIAVersion2: LocalAttributeDTO;
    let sOSIAVersion2FurtherPeer: LocalAttributeDTO;

    let sOSRAVersion0: LocalAttributeDTO;
    let sOSRAVersion1: LocalAttributeDTO;
    let sOSRAVersion2: LocalAttributeDTO;
    beforeAll(async () => {
        await setUpIdentityAttributeVersions();
        await setUpRelationshipAttributeVersions();

        async function setUpIdentityAttributeVersions() {
            await createAndShareVersion0();
            await succeedVersion0();
            await succeedVersion1();
            sRAVersions = [sRAVersion2, sRAVersion1, sRAVersion0];

            await notifyPeerAboutVersion2();
            await shareVersion2WithFurtherPeer();

            async function createAndShareVersion0(): Promise<void> {
                sOSIAVersion0 = await executeFullCreateAndShareRepositoryAttributeFlow(services1, services2, {
                    content: {
                        value: {
                            "@type": "GivenName",
                            value: "First Name"
                        },
                        tags: ["tag1"]
                    }
                });

                sRAVersion0 = (await services1.consumption.attributes.getAttribute({ id: sOSIAVersion0.shareInfo!.sourceAttribute! })).value;
            }

            async function succeedVersion0(): Promise<void> {
                const succeedRARequest1: SucceedRepositoryAttributeRequest = {
                    predecessorId: sRAVersion0.id.toString(),
                    successorContent: {
                        value: {
                            "@type": "GivenName",
                            value: "Second Name"
                        },
                        tags: ["tag2"]
                    }
                };
                const sRASuccessionResult1 = await services1.consumption.attributes.succeedRepositoryAttribute(succeedRARequest1);
                ({ predecessor: sRAVersion0, successor: sRAVersion1 } = sRASuccessionResult1.value);
            }

            async function succeedVersion1(): Promise<void> {
                const succeedRARequest2: SucceedRepositoryAttributeRequest = {
                    predecessorId: sRAVersion1.id.toString(),
                    successorContent: {
                        value: {
                            "@type": "GivenName",
                            value: "Third Name"
                        },
                        tags: ["tag3"]
                    }
                };
                const sRASuccessionResult2 = await services1.consumption.attributes.succeedRepositoryAttribute(succeedRARequest2);
                ({ predecessor: sRAVersion1, successor: sRAVersion2 } = sRASuccessionResult2.value);
            }

            async function notifyPeerAboutVersion2(): Promise<void> {
                const notifyRequestResult = (
                    await services1.consumption.attributes.notifyPeerAboutRepositoryAttributeSuccession({
                        attributeId: sRAVersion2.id,
                        peer: services2.address
                    })
                ).value;
                await waitForRecipientToReceiveNotification(services1, services2, notifyRequestResult);

                ({ predecessor: sOSIAVersion0, successor: sOSIAVersion2 } = notifyRequestResult);
            }

            async function shareVersion2WithFurtherPeer(): Promise<void> {
                const shareRequestResult = await services1.consumption.attributes.shareRepositoryAttribute({
                    attributeId: sRAVersion2.id,
                    peer: services3.address
                });
                const shareRequestId = shareRequestResult.value.id;
                sOSIAVersion2FurtherPeer = await acceptIncomingShareAttributeRequest(services1, services3, shareRequestId);
            }
        }

        async function setUpRelationshipAttributeVersions() {
            await createAndShareVersion0();
            await succeedVersion0();
            await succeedVersion1();

            async function createAndShareVersion0(): Promise<void> {
                sOSRAVersion0 = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
                    content: {
                        key: "Some key",
                        value: {
                            "@type": "ProprietaryInteger",
                            title: "Version",
                            value: 1
                        },
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }
                });
            }

            async function succeedVersion0(): Promise<void> {
                const sRASuccessionResult1 = await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
                    predecessorId: sOSRAVersion0.id.toString(),
                    successorContent: {
                        value: {
                            "@type": "ProprietaryInteger",
                            title: "Version",
                            value: 2
                        }
                    }
                });
                await waitForRecipientToReceiveNotification(services1, services2, sRASuccessionResult1.value);

                ({ predecessor: sOSRAVersion0, successor: sOSRAVersion1 } = sRASuccessionResult1.value);
            }

            async function succeedVersion1(): Promise<void> {
                const sRASuccessionResult2 = await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
                    predecessorId: sOSRAVersion1.id.toString(),
                    successorContent: {
                        value: {
                            "@type": "ProprietaryInteger",
                            title: "Version",
                            value: 3
                        }
                    }
                });
                await waitForRecipientToReceiveNotification(services1, services2, sRASuccessionResult2.value);

                ({ predecessor: sOSRAVersion1, successor: sOSRAVersion2 } = sRASuccessionResult2.value);
            }
        }
    });

    describe(GetVersionsOfAttributeUseCase.name, () => {
        test("should get all versions of a repository attribute", async () => {
            for (const version of sRAVersions) {
                const result = await services1.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result.isSuccess).toBe(true);

                const returnedVersions = result.value;
                expect(returnedVersions).toStrictEqual(sRAVersions);
            }
        });

        test("should get all versions of an own shared identity attribute shared with the same peer", async () => {
            const sOSIAVersions = [sOSIAVersion2, sOSIAVersion0];
            for (const version of sOSIAVersions) {
                const result1 = await services1.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result1.isSuccess).toBe(true);

                const returnedVersions1 = result1.value;
                expect(returnedVersions1).toStrictEqual(sOSIAVersions);
            }
        });

        test("should get all versions of a peer shared identity attribute", async () => {
            const rPSIAVersion2 = (await services2.consumption.attributes.getAttribute({ id: sOSIAVersion2.id })).value;
            const rPSIAVersion0 = (await services2.consumption.attributes.getAttribute({ id: sOSIAVersion0.id })).value;
            const rPSIAVersions = [rPSIAVersion2, rPSIAVersion0];

            for (const version of rPSIAVersions) {
                const result = await services2.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result.isSuccess).toBe(true);

                const returnedVersions = result.value;
                expect(returnedVersions).toStrictEqual(rPSIAVersions);
            }
        });

        test("should get all versions of an own shared relationship attribute", async () => {
            const sOSRAVersions = [sOSRAVersion2, sOSRAVersion1, sOSRAVersion0];
            for (const version of sOSRAVersions) {
                const result = await services1.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result.isSuccess).toBe(true);

                const returnedVersions = result.value;
                expect(returnedVersions).toStrictEqual(sOSRAVersions);
            }
        });

        test("should get all versions of a peer shared relationship attribute", async () => {
            const rPSRAVersion2 = (await services2.consumption.attributes.getAttribute({ id: sOSRAVersion2.id })).value;
            const rPSRAVersion1 = (await services2.consumption.attributes.getAttribute({ id: sOSRAVersion1.id })).value;
            const rPSRAVersion0 = (await services2.consumption.attributes.getAttribute({ id: sOSRAVersion0.id })).value;
            const rPSRAVersions = [rPSRAVersion2, rPSRAVersion1, rPSRAVersion0];

            for (const version of rPSRAVersions) {
                const result = await services2.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result.isSuccess).toBe(true);

                const returnedVersions = result.value;
                expect(returnedVersions).toStrictEqual(rPSRAVersions);
            }
        });

        test("should throw trying to call getVersionsOfAttribute with a nonexistent attributeId", async () => {
            const result = await services1.consumption.attributes.getVersionsOfAttribute({ attributeId: "ATTxxxxxxxxxxxxxxxxx" });
            expect(result).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });
    });

    describe(GetSharedVersionsOfRepositoryAttributeUseCase.name, () => {
        test("should get only latest shared version per peer of a repository attribute", async () => {
            for (const version of sRAVersions) {
                const result1 = await services1.consumption.attributes.getSharedVersionsOfRepositoryAttribute({ attributeId: version.id });
                expect(result1.isSuccess).toBe(true);
                const returnedVersions1 = result1.value;
                expect(returnedVersions1).toStrictEqual([sOSIAVersion2, sOSIAVersion2FurtherPeer]);

                const result2 = await services1.consumption.attributes.getSharedVersionsOfRepositoryAttribute({ attributeId: version.id, onlyLatestVersions: true });
                expect(result2.isSuccess).toBe(true);
                const returnedVersions2 = result2.value;
                expect(returnedVersions2).toStrictEqual([sOSIAVersion2, sOSIAVersion2FurtherPeer]);
            }
        });

        test("should get all shared versions of a repository attribute", async () => {
            for (const version of sRAVersions) {
                const result = await services1.consumption.attributes.getSharedVersionsOfRepositoryAttribute({ attributeId: version.id, onlyLatestVersions: false });
                expect(result.isSuccess).toBe(true);

                const returnedVersions = result.value;
                expect(returnedVersions).toStrictEqual([sOSIAVersion2, sOSIAVersion2FurtherPeer, sOSIAVersion0]);
            }
        });

        test("should get only latest shared version of a repository attribute for a specific peer", async () => {
            for (const version of sRAVersions) {
                const result1 = await services1.consumption.attributes.getSharedVersionsOfRepositoryAttribute({ attributeId: version.id, peers: [services2.address] });
                expect(result1.isSuccess).toBe(true);
                const returnedVersions1 = result1.value;
                expect(returnedVersions1).toStrictEqual([sOSIAVersion2]);

                const result2 = await services1.consumption.attributes.getSharedVersionsOfRepositoryAttribute({ attributeId: version.id, peers: [services3.address] });
                expect(result2.isSuccess).toBe(true);
                const returnedVersions2 = result2.value;
                expect(returnedVersions2).toStrictEqual([sOSIAVersion2FurtherPeer]);
            }
        });

        test("should get all shared versions of a repository attribute for a specific peer", async () => {
            for (const version of sRAVersions) {
                const result1 = await services1.consumption.attributes.getSharedVersionsOfRepositoryAttribute({
                    attributeId: version.id,
                    peers: [services2.address],
                    onlyLatestVersions: false
                });
                expect(result1.isSuccess).toBe(true);
                const returnedVersions1 = result1.value;
                expect(returnedVersions1).toStrictEqual([sOSIAVersion2, sOSIAVersion0]);

                const result2 = await services1.consumption.attributes.getSharedVersionsOfRepositoryAttribute({
                    attributeId: version.id,
                    peers: [services3.address],
                    onlyLatestVersions: false
                });
                expect(result2.isSuccess).toBe(true);
                const returnedVersions2 = result2.value;
                expect(returnedVersions2).toStrictEqual([sOSIAVersion2FurtherPeer]);
            }
        });

        test("should return an empty list calling getSharedVersionsOfRepositoryAttribute with a nonexistent peer", async () => {
            const result = await services1.consumption.attributes.getSharedVersionsOfRepositoryAttribute({
                attributeId: sRAVersion2.id,
                peers: ["id1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"]
            });
            expect(result.isSuccess).toBe(true);
            const returnedVersions = result.value;
            expect(returnedVersions).toStrictEqual([]);
        });

        test("should throw trying to call getSharedVersionsOfRepositoryAttribute with a nonexistent attributeId", async () => {
            const result2 = await services1.consumption.attributes.getSharedVersionsOfRepositoryAttribute({ attributeId: "ATTxxxxxxxxxxxxxxxxx" });
            expect(result2).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("should throw trying to call getSharedVersionsOfRepositoryAttribute with a relationship attribute", async () => {
            const result = await services1.consumption.attributes.getSharedVersionsOfRepositoryAttribute({ attributeId: sOSRAVersion2.id });
            expect(result).toBeAnError(/.*/, "error.runtime.attributes.isNotRepositoryAttribute");
        });
    });
});

describe(DeletePeerSharedAttributeUseCase.name, () => {
    test("should delete a peer shared identity attribute", async () => {
        const sOSIA = await executeFullCreateAndShareRepositoryAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        });

        const rPSIA = (await services2.consumption.attributes.getAttribute({ id: sOSIA.id })).value;
        expect(rPSIA).toBeDefined();

        const deletionResult = await services2.consumption.attributes.deletePeerSharedAttribute({ attributeId: sOSIA.id });
        expect(deletionResult.isSuccess).toBe(true);

        const getDeletedAttributeResult = await services2.consumption.attributes.getAttribute({ id: sOSIA.id });
        expect(getDeletedAttributeResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("should notify about identity attribute deletion by peer", async () => {
        const sOSIA = await executeFullCreateAndShareRepositoryAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        });

        const deletionTime = CoreDate.utc();
        const notification = (await services2.consumption.attributes.deletePeerSharedAttribute({ attributeId: sOSIA.id })).value;
        await syncUntilHasMessageWithNotification(services1.transport, notification.id);
        await services1.eventBus.waitForEvent(AttributeDeletedByPeerEvent, (e) => {
            return e.data.id.toString() === sOSIA.id;
        });

        const result = await services1.consumption.attributes.getAttribute({ id: sOSIA.id });
        expect(result.isSuccess).toBe(true);
        const updatedAttribute = result.value;
        expect(updatedAttribute.deletionStatus?.deletedByPeer).toBeDefined();
        expect(CoreDate.from(updatedAttribute.deletionStatus!.deletedByPeer!).isSame(deletionTime, "second")).toBe(true);
    });

    // TODO: test deletion of predecessors
});
