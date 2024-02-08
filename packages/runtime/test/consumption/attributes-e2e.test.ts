import { LocalRequestStatus } from "@nmshd/consumption";
import { CityJSON, CountryJSON, HouseNumberJSON, RelationshipAttributeConfidentiality, StreetJSON, ZipCodeJSON } from "@nmshd/content";
import { CoreId } from "@nmshd/transport";
import {
    AttributeCreatedEvent,
    CreateAndShareRelationshipAttributeRequest,
    CreateAndShareRelationshipAttributeUseCase,
    CreateIdentityAttributeRequest,
    CreateIdentityAttributeUseCase,
    GetSharedVersionsOfIdentityAttributeUseCase,
    GetVersionsOfAttributeUseCase,
    IncomingRequestStatusChangedEvent,
    LocalAttributeDTO,
    NotifyPeerAboutIdentityAttributeSuccessionUseCase,
    OutgoingRequestStatusChangedEvent,
    OwnSharedAttributeSucceededEvent,
    PeerSharedAttributeSucceededEvent,
    RepositoryAttributeSucceededEvent,
    ShareIdentityAttributeRequest,
    ShareIdentityAttributeUseCase,
    SucceedIdentityAttributeRequest,
    SucceedIdentityAttributeUseCase,
    SucceedRelationshipAttributeAndNotifyPeerUseCase
} from "../../src";
import {
    acceptIncomingShareAttributeRequest,
    ensureActiveRelationship,
    executeFullCreateAndShareIdentityAttributeFlow,
    executeFullCreateAndShareRelationshipAttributeFlow,
    executeFullNotifyPeerAboutAttributeSuccessionFlow,
    executeFullShareIdentityAttributeFlow,
    executeFullSucceedIdentityAttributeAndNotifyPeerFlow,
    RuntimeServiceProvider,
    syncUntilHasMessageWithNotification,
    syncUntilHasMessageWithRequest,
    syncUntilHasMessageWithResponse,
    TestRuntimeServices,
    waitForRecipientToReceiveNotification
} from "../lib";

/* Disable timeout errors if we're debugging */
if (process.env.NODE_OPTIONS !== undefined && process.env.NODE_OPTIONS.search("inspect") !== -1) {
    jest.setTimeout(1e9);
}

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

    await createAndShareIdentityAttributesBetweenAllServices();
    await createAndShareAndSucceedIdentityAttributesBetweenSomeServices();
    await createAndShareRelationshipAttributesBetweenAllServicesAndSucceedSome();

    async function createAndShareIdentityAttributesBetweenAllServices() {
        for (let i = 0; i < numberOfServices; i++) {
            const repositoryAttributeId = (
                await executeFullCreateAndShareIdentityAttributeFlow(runtimeServices[i], runtimeServices[(i + 1) % numberOfServices], {
                    content: {
                        value: {
                            "@type": "DisplayName",
                            value: `Service ${i + 1}`
                        }
                    }
                })
            ).shareInfo!.sourceAttribute!;

            await executeFullShareIdentityAttributeFlow(runtimeServices[i], runtimeServices[(i + 2) % numberOfServices], repositoryAttributeId);
        }
    }

    async function createAndShareAndSucceedIdentityAttributesBetweenSomeServices() {
        for (let i = 0; i < numberOfServices; i++) {
            const repositoryPredecessor = (
                await executeFullCreateAndShareIdentityAttributeFlow(runtimeServices[i], runtimeServices[(i + 1) % numberOfServices], {
                    content: {
                        value: {
                            "@type": "EMailAddress",
                            value: `Service${i + 1}@mail.com`
                        }
                    }
                })
            ).shareInfo!.sourceAttribute!;

            await executeFullSucceedIdentityAttributeAndNotifyPeerFlow(runtimeServices[i], runtimeServices[(i + 1) % numberOfServices], {
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

describe(CreateIdentityAttributeUseCase.name, () => {
    test("should create a repository attribute", async () => {
        const request: CreateIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        };
        const result = await services1.consumption.attributes.createIdentityAttribute(request);
        expect(result.isError).toBe(false);
        const attribute = result.value;
        expect(attribute.content).toMatchObject(request.content);
        await services1.eventBus.waitForEvent(AttributeCreatedEvent, (e) => e.data.id === attribute.id);
    });

    test("should create LocalAttributes for each property of a complex Identity Attribute", async function () {
        const attributesBeforeCreate = await services1.consumption.attributes.getAttributes({});
        const nrAttributesBeforeCreate = attributesBeforeCreate.value.length;

        const createIdentityAttributeParams: CreateIdentityAttributeRequest = {
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
        const createIdentityAttributeResult = await services1.consumption.attributes.createIdentityAttribute(createIdentityAttributeParams);
        expect(createIdentityAttributeResult).toBeSuccessful();
        const complexRepoAttribute = createIdentityAttributeResult.value;

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

describe(ShareIdentityAttributeUseCase.name, () => {
    let senderRepositoryAttribute: LocalAttributeDTO;
    let senderOwnSharedIdentityAttribute: LocalAttributeDTO;
    let recipientPeerSharedIdentityAttribute: LocalAttributeDTO;
    beforeAll(async () => {
        senderRepositoryAttribute = (
            await services1.consumption.attributes.createIdentityAttribute({
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

    test("should initialize the sharing of an identity attribute", async () => {
        const shareRequest: ShareIdentityAttributeRequest = {
            attributeId: senderRepositoryAttribute.id,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareIdentityAttribute(shareRequest);
        expect(shareRequestResult.isSuccess).toBe(true);

        const shareRequestId = shareRequestResult.value.id;
        senderOwnSharedIdentityAttribute = await acceptIncomingShareAttributeRequest(services1, services2, shareRequestId);

        const recipientPeerSharedIdentityAttributeResult = await services2.consumption.attributes.getAttribute({ id: senderOwnSharedIdentityAttribute.id });
        expect(recipientPeerSharedIdentityAttributeResult.isSuccess).toBe(true);
        recipientPeerSharedIdentityAttribute = recipientPeerSharedIdentityAttributeResult.value;

        expect(senderOwnSharedIdentityAttribute.content).toStrictEqual(recipientPeerSharedIdentityAttribute.content);
        expect(senderOwnSharedIdentityAttribute.shareInfo?.sourceAttribute?.toString()).toBe(senderRepositoryAttribute.id);
    });

    test("should reject attempts to share the same attribute more than once", async () => {
        await executeFullShareIdentityAttributeFlow(services1, services3, senderRepositoryAttribute.id);

        const repeatedShareRequestResult = await services1.consumption.attributes.shareIdentityAttribute({
            attributeId: senderRepositoryAttribute.id,
            peer: services3.address
        });

        expect(repeatedShareRequestResult).toBeAnError(/.*/, "error.runtime.attributes.identityAttributeHasAlreadyBeenSharedWithPeer");
    });

    test("should reject sharing an attribute, of which a previous version has been shared", async () => {
        const predecesssorOwnSharedIdentityAttribute = await executeFullCreateAndShareIdentityAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "Surname",
                    value: "Name 1"
                }
            }
        });

        const { successor: successorRepositoryAttribute } = (
            await services1.consumption.attributes.succeedIdentityAttribute({
                predecessorId: predecesssorOwnSharedIdentityAttribute.shareInfo!.sourceAttribute!,
                successorContent: {
                    value: {
                        "@type": "Surname",
                        value: "Name 2"
                    }
                }
            })
        ).value;

        const response = await services1.consumption.attributes.shareIdentityAttribute({
            attributeId: successorRepositoryAttribute.id,
            peer: services2.address
        });
        expect(response).toBeAnError(/.*/, "error.runtime.attributes.anotherVersionOfIdentityAttributeHasAlreadyBeenSharedWithPeer");
    });

    test("should reject sharing an own shared attribute", async () => {
        const shareRequest: ShareIdentityAttributeRequest = {
            attributeId: senderOwnSharedIdentityAttribute.id,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareIdentityAttribute(shareRequest);
        expect(shareRequestResult).toBeAnError(/.*/, "error.runtime.attributes.isNoIdentityAttribute");
    });

    test("should reject sharing peer shared attribute", async () => {
        const shareRequest: ShareIdentityAttributeRequest = {
            attributeId: recipientPeerSharedIdentityAttribute.id,
            peer: services1.address
        };
        const shareRequestResult = await services2.consumption.attributes.shareIdentityAttribute(shareRequest);
        expect(shareRequestResult).toBeAnError(/.*/, "error.runtime.attributes.isNoIdentityAttribute");
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
        const senderOwnSharedRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, createAndShareRelationshipAttributeRequest);

        const shareRequest: ShareIdentityAttributeRequest = {
            attributeId: senderOwnSharedRelationshipAttribute.id,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareIdentityAttribute(shareRequest);
        expect(shareRequestResult).toBeAnError(/.*/, "error.runtime.attributes.isNoIdentityAttribute");
    });

    test("should throw if source attribute doesn't exist", async () => {
        const shareRequest: ShareIdentityAttributeRequest = {
            attributeId: (await CoreId.generate("ATT")).toString(),
            peer: services1.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareIdentityAttribute(shareRequest);
        expect(shareRequestResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("should throw if source attribute id is invalid ", async () => {
        const shareRequest: ShareIdentityAttributeRequest = {
            attributeId: CoreId.from("faulty").toString(),
            peer: services1.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareIdentityAttribute(shareRequest);
        expect(shareRequestResult).toBeAnError(/.*/, "error.runtime.validation.invalidPropertyValue");
    });
});

describe(SucceedIdentityAttributeUseCase.name, () => {
    test("should succeed a repository attribute", async () => {
        const createAttributeRequest: CreateIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        };
        const predecessor = (await services1.consumption.attributes.createIdentityAttribute(createAttributeRequest)).value;

        const succeedAttributeRequest: SucceedIdentityAttributeRequest = {
            predecessorId: predecessor.id.toString(),
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Tina Turner"
                },
                tags: ["Bunsen", "Burner"]
            }
        };
        const result = await services1.consumption.attributes.succeedIdentityAttribute(succeedAttributeRequest);
        expect(result.isError).toBe(false);
        const { predecessor: updatedPredecessor, successor } = result.value;
        expect(updatedPredecessor.succeededBy).toStrictEqual(successor.id);
        expect((successor as any).content.value.value).toBe("Tina Turner");
        await services1.eventBus.waitForEvent(RepositoryAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === updatedPredecessor.id && e.data.successor.id === successor.id;
        });
    });

    test("should throw if predecessor id is invalid", async () => {
        const succeedAttributeRequest: SucceedIdentityAttributeRequest = {
            predecessorId: CoreId.from("faulty").toString(),
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Tina Turner"
                },
                tags: ["Bunsen", "Burner"]
            }
        };
        const result = await services1.consumption.attributes.succeedIdentityAttribute(succeedAttributeRequest);
        expect(result).toBeAnError(/.*/, "error.consumption.attributes.predecessorDoesNotExist");
    });

    test("should throw if predecessor doesn't exist", async () => {
        const succeedAttributeRequest: SucceedIdentityAttributeRequest = {
            predecessorId: (await CoreId.generate("ATT")).toString(),
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Tina Turner"
                },
                tags: ["Bunsen", "Burner"]
            }
        };
        const result = await services1.consumption.attributes.succeedIdentityAttribute(succeedAttributeRequest);
        expect(result).toBeAnError(/.*/, "error.consumption.attributes.predecessorDoesNotExist");
    });

    test("validation should catch attempts of changing the value type", async () => {
        const createAttributeRequest: CreateIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        };
        const predecessor = (await services1.consumption.attributes.createIdentityAttribute(createAttributeRequest)).value;

        const succeedAttributeRequest: SucceedIdentityAttributeRequest = {
            predecessorId: predecessor.id.toString(),
            successorContent: {
                value: {
                    "@type": "PhoneNumber",
                    value: "+4915155253460"
                },
                tags: ["Bunsen", "Burner"]
            }
        };
        const result = await services1.consumption.attributes.succeedIdentityAttribute(succeedAttributeRequest);
        expect(result).toBeAnError(/.*/, "error.consumption.attributes.successionMustNotChangeValueType");
    });
});

describe(NotifyPeerAboutIdentityAttributeSuccessionUseCase.name, () => {
    let sSucceedIARequest1: SucceedIdentityAttributeRequest;
    let sSucceedIARequest2: SucceedIdentityAttributeRequest;
    let sOSIAVersion0: LocalAttributeDTO;
    let sRAVersion1: LocalAttributeDTO;
    let sRAVersion2: LocalAttributeDTO;
    beforeEach(async () => {
        sOSIAVersion0 = await executeFullCreateAndShareIdentityAttributeFlow(services1, services2, {
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
        ({ successor: sRAVersion1 } = (await services1.consumption.attributes.succeedIdentityAttribute(sSucceedIARequest1)).value);

        sSucceedIARequest2 = {
            predecessorId: sRAVersion1.id,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Martina Mustermann"
                }
            }
        };
        ({ successor: sRAVersion2 } = (await services1.consumption.attributes.succeedIdentityAttribute(sSucceedIARequest2)).value);
    });

    test("should successfully notify peer about attribute succession", async () => {
        const notificationResult = await services1.consumption.attributes.notifyPeerAboutIdentityAttributeSuccession({
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

        const result2 = await services1.consumption.attributes.notifyPeerAboutIdentityAttributeSuccession({
            attributeId: sRAVersion1.id,
            peer: services2.address
        });
        expect(result2).toBeAnError(/.*/, "error.runtime.attributes.identityAttributeHasAlreadyBeenSharedWithPeer");
    });

    test("should throw if a later version of the attribute has been notified about already", async () => {
        await executeFullNotifyPeerAboutAttributeSuccessionFlow(services1, services2, sRAVersion2.id);

        const notificationResult = await services1.consumption.attributes.notifyPeerAboutIdentityAttributeSuccession({
            attributeId: sRAVersion1.id,
            peer: services2.address
        });
        expect(notificationResult).toBeAnError(/.*/, "error.consumption.attributes.invalidSuccessionOfOwnSharedIdentityAttribute");
    });

    test("should throw if no other version of the attribute has been shared before", async () => {
        const repoAttribute = (
            await services1.consumption.attributes.createIdentityAttribute({
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "Petra Pan"
                    }
                }
            })
        ).value;

        const result = await services1.consumption.attributes.notifyPeerAboutIdentityAttributeSuccession({ attributeId: repoAttribute.id, peer: services2.address });
        expect(result).toBeAnError(/.*/, "error.runtime.attributes.noOtherVersionOfIdentityAttributeHasBeenSharedWithPeerBefore");
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
        const senderOwnSharedRelationshipAttribute = await acceptIncomingShareAttributeRequest(services1, services2, requestId);
        const recipientPeerSharedRelationshipAttribute = (await services2.consumption.attributes.getAttribute({ id: senderOwnSharedRelationshipAttribute.id })).value;

        expect(senderOwnSharedRelationshipAttribute.content.value).toStrictEqual(createAndShareRelationshipAttributeRequest.content.value);
        expect(senderOwnSharedRelationshipAttribute.content).toStrictEqual(recipientPeerSharedRelationshipAttribute.content);
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
    let repositoryAttributeVersion1: LocalAttributeDTO;
    let repositoryAttributeVersion2: LocalAttributeDTO;
    let repositoryAttributeVersion3: LocalAttributeDTO;
    let ownSharedIdentityAttributeVersion1: LocalAttributeDTO;
    let ownSharedIdentityAttributeVersion3: LocalAttributeDTO;
    let ownSharedIdentityAttributeVersion3Peer2: LocalAttributeDTO;

    let ownSharedRelationshipAttributeVersion1: LocalAttributeDTO;
    let ownSharedRelationshipAttributeVersion2: LocalAttributeDTO;
    let ownSharedRelationshipAttributeVersion3: LocalAttributeDTO;
    beforeAll(async () => {
        // setup IdentityAttributes
        ownSharedIdentityAttributeVersion1 = await executeFullCreateAndShareIdentityAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "First Name"
                },
                tags: ["tag1"]
            }
        });
        repositoryAttributeVersion1 = (await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion1.shareInfo!.sourceAttribute! })).value;

        const succeedRepositoryAttributeRequest1: SucceedIdentityAttributeRequest = {
            predecessorId: repositoryAttributeVersion1.id.toString(),
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Second Name"
                },
                tags: ["tag2"]
            }
        };
        const repositoryAttributeSuccessionResult1 = await services1.consumption.attributes.succeedIdentityAttribute(succeedRepositoryAttributeRequest1);
        ({ predecessor: repositoryAttributeVersion1, successor: repositoryAttributeVersion2 } = repositoryAttributeSuccessionResult1.value);

        const succeedRepositoryAttributeRequest2: SucceedIdentityAttributeRequest = {
            predecessorId: repositoryAttributeVersion2.id.toString(),
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Third Name"
                },
                tags: ["tag3"]
            }
        };
        const repositoryAttributeSuccessionResult2 = await services1.consumption.attributes.succeedIdentityAttribute(succeedRepositoryAttributeRequest2);
        ({ predecessor: repositoryAttributeVersion2, successor: repositoryAttributeVersion3 } = repositoryAttributeSuccessionResult2.value);

        ({ predecessor: ownSharedIdentityAttributeVersion1, successor: ownSharedIdentityAttributeVersion3 } = (
            await services1.consumption.attributes.notifyPeerAboutIdentityAttributeSuccession({
                attributeId: repositoryAttributeVersion3.id,
                peer: services2.address
            })
        ).value);

        await services1.eventBus.waitForEvent(OwnSharedAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === ownSharedIdentityAttributeVersion1.id && e.data.successor.id === ownSharedIdentityAttributeVersion3.id;
        });
        const notificationIdIA = ownSharedIdentityAttributeVersion3.shareInfo?.notificationReference;
        await syncUntilHasMessageWithNotification(services2.transport, notificationIdIA!);
        await services2.eventBus.waitForEvent(PeerSharedAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === ownSharedIdentityAttributeVersion1.id && e.data.successor.id === ownSharedIdentityAttributeVersion3.id;
        });

        const shareRequestResultPeer2 = await services1.consumption.attributes.shareIdentityAttribute({
            attributeId: repositoryAttributeVersion3.id,
            peer: services3.address
        });
        const shareRequestId = shareRequestResultPeer2.value.id;

        await syncUntilHasMessageWithRequest(services3.transport, shareRequestId);
        await services3.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => {
            return e.data.request.id === shareRequestId && e.data.newStatus === LocalRequestStatus.ManualDecisionRequired;
        });
        await services3.consumption.incomingRequests.accept({ requestId: shareRequestId, items: [{ accept: true }] });

        const responseMessage = await syncUntilHasMessageWithResponse(services1.transport, shareRequestId);
        const sharedAttributeId = responseMessage.content.response.items[0].attributeId;
        await services1.eventBus.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => {
            return e.data.request.id === shareRequestId && e.data.newStatus === LocalRequestStatus.Completed;
        });

        ownSharedIdentityAttributeVersion3Peer2 = (await services1.consumption.attributes.getAttribute({ id: sharedAttributeId })).value;

        // setup RelationshipAttributes
        ownSharedRelationshipAttributeVersion1 = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
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

        const relationshipAttributeSuccessionResult1 = await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
            predecessorId: ownSharedRelationshipAttributeVersion1.id.toString(),
            successorContent: {
                value: {
                    "@type": "ProprietaryInteger",
                    title: "Version",
                    value: 2
                }
            }
        });
        ({ predecessor: ownSharedRelationshipAttributeVersion1, successor: ownSharedRelationshipAttributeVersion2 } = relationshipAttributeSuccessionResult1.value);

        const relationshipAttributeSuccessionResult2 = await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
            predecessorId: ownSharedRelationshipAttributeVersion2.id.toString(),
            successorContent: {
                value: {
                    "@type": "ProprietaryInteger",
                    title: "Version",
                    value: 3
                }
            }
        });
        ({ predecessor: ownSharedRelationshipAttributeVersion2, successor: ownSharedRelationshipAttributeVersion3 } = relationshipAttributeSuccessionResult2.value);

        await services1.eventBus.waitForEvent(OwnSharedAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === ownSharedRelationshipAttributeVersion2.id && e.data.successor.id === ownSharedRelationshipAttributeVersion3.id;
        });
        const notificationIdRA = ownSharedRelationshipAttributeVersion3.shareInfo?.notificationReference;
        await syncUntilHasMessageWithNotification(services2.transport, notificationIdRA!);
        await services2.eventBus.waitForEvent(PeerSharedAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === ownSharedRelationshipAttributeVersion2.id && e.data.successor.id === ownSharedRelationshipAttributeVersion3.id;
        });
    });

    describe(GetVersionsOfAttributeUseCase.name, () => {
        test("should get all versions of a repository attribute", async () => {
            const repositoryAttributeVersions = [repositoryAttributeVersion3, repositoryAttributeVersion2, repositoryAttributeVersion1];
            for (const version of repositoryAttributeVersions) {
                const result = await services1.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result.isSuccess).toBe(true);

                const returnedVersions = result.value;
                expect(returnedVersions).toStrictEqual(repositoryAttributeVersions);
            }
        });

        test("should get all versions of an own shared identity attribute shared with the same peer", async () => {
            const ownSharedIdentityAttributeVersions = [ownSharedIdentityAttributeVersion3, ownSharedIdentityAttributeVersion1];
            for (const version of ownSharedIdentityAttributeVersions) {
                const result1 = await services1.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result1.isSuccess).toBe(true);
                const returnedVersions1 = result1.value;
                expect(returnedVersions1).toStrictEqual(ownSharedIdentityAttributeVersions);
            }
        });

        test("should get all versions of a peer shared identity attribute", async () => {
            const peerSharedIdentityAttributeVersion3 = (await services2.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion3.id })).value;
            const peerSharedIdentityAttributeVersion1 = (await services2.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion1.id })).value;
            const peerSharedIdentityAttributeVersions = [peerSharedIdentityAttributeVersion3, peerSharedIdentityAttributeVersion1];

            for (const version of peerSharedIdentityAttributeVersions) {
                const result1 = await services2.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result1.isSuccess).toBe(true);
                const returnedVersions1 = result1.value;
                expect(returnedVersions1).toStrictEqual(peerSharedIdentityAttributeVersions);

                const result2 = await services2.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result2.isSuccess).toBe(true);
                const returnedVersions2 = result2.value;
                expect(returnedVersions2).toStrictEqual(peerSharedIdentityAttributeVersions);
            }
        });

        test("should get all versions of an own shared relationship attribute", async () => {
            const ownSharedRelationshipAttributeVersions = [ownSharedRelationshipAttributeVersion3, ownSharedRelationshipAttributeVersion2, ownSharedRelationshipAttributeVersion1];
            for (const version of ownSharedRelationshipAttributeVersions) {
                const result = await services1.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result.isSuccess).toBe(true);

                const returnedVersions = result.value;
                expect(returnedVersions).toStrictEqual(ownSharedRelationshipAttributeVersions);
            }
        });

        test("should get all versions of a peer shared relationship attribute", async () => {
            const peerSharedRelationshipAttributeVersion3 = (await services2.consumption.attributes.getAttribute({ id: ownSharedRelationshipAttributeVersion3.id })).value;
            const peerSharedRelationshipAttributeVersion2 = (await services2.consumption.attributes.getAttribute({ id: ownSharedRelationshipAttributeVersion2.id })).value;
            const peerSharedRelationshipAttributeVersion1 = (await services2.consumption.attributes.getAttribute({ id: ownSharedRelationshipAttributeVersion1.id })).value;
            const peerSharedRelationshipAttributeVersions = [
                peerSharedRelationshipAttributeVersion3,
                peerSharedRelationshipAttributeVersion2,
                peerSharedRelationshipAttributeVersion1
            ];

            for (const version of peerSharedRelationshipAttributeVersions) {
                const result = await services2.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result.isSuccess).toBe(true);

                const returnedVersions = result.value;
                expect(returnedVersions).toStrictEqual(peerSharedRelationshipAttributeVersions);
            }
        });

        test("should throw trying to call getVersionsOfAttribute with a nonexistent attributeId", async () => {
            const result1 = await services1.consumption.attributes.getVersionsOfAttribute({ attributeId: "ATTxxxxxxxxxxxxxxxxx" });
            expect(result1).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });
    });

    describe(GetSharedVersionsOfIdentityAttributeUseCase.name, () => {
        test("should get only latest shared version per peer of a repository attribute", async () => {
            const repositoryAttributeVersions = [repositoryAttributeVersion3, repositoryAttributeVersion2, repositoryAttributeVersion1];
            for (const version of repositoryAttributeVersions) {
                const result = await services1.consumption.attributes.getSharedVersionsOfIdentityAttribute({ attributeId: version.id });
                expect(result.isSuccess).toBe(true);

                const returnedVersions = result.value;
                expect(returnedVersions).toStrictEqual([ownSharedIdentityAttributeVersion3, ownSharedIdentityAttributeVersion3Peer2]);
            }
        });

        test("should get all shared versions of a repository attribute", async () => {
            const repositoryAttributeVersions = [repositoryAttributeVersion3, repositoryAttributeVersion2, repositoryAttributeVersion1];
            for (const version of repositoryAttributeVersions) {
                const result = await services1.consumption.attributes.getSharedVersionsOfIdentityAttribute({ attributeId: version.id, onlyLatestVersions: false });
                expect(result.isSuccess).toBe(true);

                const returnedVersions = result.value;
                expect(returnedVersions).toStrictEqual([ownSharedIdentityAttributeVersion3, ownSharedIdentityAttributeVersion3Peer2, ownSharedIdentityAttributeVersion1]);
            }
        });

        test("should get only latest shared version of a repository attribute for a specific peer", async () => {
            const repositoryAttributeVersions = [repositoryAttributeVersion3, repositoryAttributeVersion2, repositoryAttributeVersion1];
            for (const version of repositoryAttributeVersions) {
                const result1 = await services1.consumption.attributes.getSharedVersionsOfIdentityAttribute({ attributeId: version.id, peers: [services2.address] });
                expect(result1.isSuccess).toBe(true);
                const returnedVersions1 = result1.value;
                expect(returnedVersions1).toStrictEqual([ownSharedIdentityAttributeVersion3]);

                const result2 = await services1.consumption.attributes.getSharedVersionsOfIdentityAttribute({ attributeId: version.id, peers: [services3.address] });
                expect(result2.isSuccess).toBe(true);
                const returnedVersions2 = result2.value;
                expect(returnedVersions2).toStrictEqual([ownSharedIdentityAttributeVersion3Peer2]);
            }
        });

        test("should get all shared versions of a repository attribute for a specific peer", async () => {
            const repositoryAttributeVersions = [repositoryAttributeVersion3, repositoryAttributeVersion2, repositoryAttributeVersion1];
            for (const version of repositoryAttributeVersions) {
                const result1 = await services1.consumption.attributes.getSharedVersionsOfIdentityAttribute({
                    attributeId: version.id,
                    peers: [services2.address],
                    onlyLatestVersions: false
                });
                expect(result1.isSuccess).toBe(true);
                const returnedVersions1 = result1.value;
                expect(returnedVersions1).toStrictEqual([ownSharedIdentityAttributeVersion3, ownSharedIdentityAttributeVersion1]);

                const result2 = await services1.consumption.attributes.getSharedVersionsOfIdentityAttribute({
                    attributeId: version.id,
                    peers: [services3.address],
                    onlyLatestVersions: false
                });
                expect(result2.isSuccess).toBe(true);
                const returnedVersions2 = result2.value;
                expect(returnedVersions2).toStrictEqual([ownSharedIdentityAttributeVersion3Peer2]);
            }
        });

        test("should return an empty list calling getSharedVersionsOfIdentityAttribute with a nonexistent peer", async () => {
            const result = await services1.consumption.attributes.getSharedVersionsOfIdentityAttribute({
                attributeId: repositoryAttributeVersion3.id,
                peers: ["id1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"]
            });
            expect(result.isSuccess).toBe(true);
            const returnedVersions = result.value;
            expect(returnedVersions).toStrictEqual([]);
        });

        test("should throw trying to call getSharedVersionsOfIdentityAttribute with a nonexistent attributeId", async () => {
            const result2 = await services1.consumption.attributes.getSharedVersionsOfIdentityAttribute({ attributeId: "ATTxxxxxxxxxxxxxxxxx" });
            expect(result2).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("should throw trying to call getSharedVersionsOfIdentityAttribute with a relationship attribute", async () => {
            const result = await services1.consumption.attributes.getSharedVersionsOfIdentityAttribute({ attributeId: ownSharedRelationshipAttributeVersion3.id });
            expect(result).toBeAnError(/.*/, "error.runtime.attributes.isNoIdentityAttribute");
        });
    });
});
