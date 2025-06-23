import { AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON, AcceptRequestItemParametersJSON } from "@nmshd/consumption";
import {
    CityJSON,
    CountryJSON,
    DeleteAttributeRequestItem,
    GivenNameJSON,
    HouseNumberJSON,
    ReadAttributeRequestItem,
    ReadAttributeRequestItemJSON,
    RelationshipAttributeConfidentiality,
    RelationshipTemplateContentJSON,
    RequestItemJSONDerivations,
    ShareAttributeRequestItem,
    ShareAttributeRequestItemJSON,
    StreetAddressJSON,
    StreetJSON,
    ThirdPartyRelationshipAttributeQuery,
    ThirdPartyRelationshipAttributeQueryOwner,
    ZipCodeJSON
} from "@nmshd/content";
import { CoreDate, CoreId, CoreIdHelper } from "@nmshd/core-types";
import assert from "assert";
import {
    AttributeCreatedEvent,
    AttributeWasViewedAtChangedEvent,
    CanCreateRepositoryAttributeRequest,
    CanCreateRepositoryAttributeUseCase,
    ChangeDefaultRepositoryAttributeUseCase,
    CreateAndShareRelationshipAttributeRequest,
    CreateAndShareRelationshipAttributeUseCase,
    CreateOwnRelationshipTemplateRequest,
    CreateRepositoryAttributeRequest,
    CreateRepositoryAttributeUseCase,
    DeleteOwnSharedAttributeAndNotifyPeerUseCase,
    DeletePeerSharedAttributeAndNotifyOwnerUseCase,
    DeleteRepositoryAttributeUseCase,
    DeleteThirdPartyRelationshipAttributeAndNotifyPeerUseCase,
    ExecuteIdentityAttributeQueryUseCase,
    ExecuteRelationshipAttributeQueryUseCase,
    ExecuteThirdPartyRelationshipAttributeQueryUseCase,
    GetAttributeUseCase,
    GetAttributesUseCase,
    GetOwnSharedAttributesUseCase,
    GetPeerSharedAttributesUseCase,
    GetRepositoryAttributesUseCase,
    GetSharedVersionsOfAttributeUseCase,
    GetVersionsOfAttributeUseCase,
    LocalAttributeDTO,
    LocalAttributeDeletionStatus,
    MarkAttributeAsViewedUseCase,
    NotifyPeerAboutRepositoryAttributeSuccessionUseCase,
    OwnSharedAttributeDeletedByOwnerEvent,
    PeerSharedAttributeDeletedByPeerEvent,
    RelationshipChangedEvent,
    RelationshipStatus,
    RepositoryAttributeSucceededEvent,
    SetAttributeDeletionInfoOfDeletionProposedRelationshipUseCase,
    ShareRepositoryAttributeRequest,
    ShareRepositoryAttributeUseCase,
    SucceedRelationshipAttributeAndNotifyPeerUseCase,
    SucceedRepositoryAttributeRequest,
    SucceedRepositoryAttributeUseCase,
    ThirdPartyRelationshipAttributeDeletedByPeerEvent
} from "../../src";
import {
    RuntimeServiceProvider,
    TestRuntimeServices,
    acceptIncomingShareAttributeRequest,
    cleanupAttributes,
    createRelationshipWithStatusPending,
    ensureActiveRelationship,
    establishRelationship,
    exchangeAndAcceptRequestByMessage,
    executeFullCreateAndShareRelationshipAttributeFlow,
    executeFullCreateAndShareRepositoryAttributeFlow,
    executeFullNotifyPeerAboutAttributeSuccessionFlow,
    executeFullRequestAndAcceptExistingAttributeFlow,
    executeFullShareAndAcceptAttributeRequestFlow,
    executeFullShareRepositoryAttributeFlow,
    executeFullSucceedRepositoryAttributeAndNotifyPeerFlow,
    syncUntilHasMessageWithNotification,
    syncUntilHasRelationships,
    waitForRecipientToReceiveNotification
} from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();

let services1: TestRuntimeServices;
let services2: TestRuntimeServices;
let services3: TestRuntimeServices;

let appService: TestRuntimeServices;

beforeAll(async () => {
    const numberOfServices = 3;
    [services1, services2, services3] = await runtimeServiceProvider.launch(numberOfServices, {
        enableRequestModule: true,
        enableDeciderModule: true,
        enableNotificationModule: true
    });

    await establishRelationship(services1.transport, services2.transport);
    await establishRelationship(services1.transport, services3.transport);
    await establishRelationship(services2.transport, services3.transport);

    appService = (
        await runtimeServiceProvider.launch(1, {
            enableDefaultRepositoryAttributes: true,
            enableRequestModule: true
        })
    )[0];

    await establishRelationship(appService.transport, services2.transport);
}, 30000);

afterAll(async () => await runtimeServiceProvider.stop());

beforeEach(async () => {
    services1.eventBus.reset();
    services2.eventBus.reset();
    services3.eventBus.reset();
    await cleanupAttributes([services1, services2, services3, appService]);
});

describe("get attribute(s)", () => {
    let relationshipAttributeId: string;
    let identityAttributeIds: string[];
    let appAttributeIds: string[];
    beforeEach(async function () {
        const senderRequests: CreateRepositoryAttributeRequest[] = [
            {
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName"
                    }
                }
            },
            {
                content: {
                    value: {
                        "@type": "Surname",
                        value: "aSurname"
                    }
                }
            },
            {
                content: {
                    value: {
                        "@type": "Surname",
                        value: "Another Surname"
                    }
                }
            }
        ];

        identityAttributeIds = [];
        for (const request of senderRequests) {
            const identityAttribute = (await services1.consumption.attributes.createRepositoryAttribute(request)).value;
            identityAttributeIds.push(identityAttribute.id);
        }

        const relationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
            content: {
                key: "aKey",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "aString",
                    title: "aTitle"
                },
                isTechnical: true
            }
        });
        relationshipAttributeId = relationshipAttribute.id;

        appAttributeIds = [];
        for (const request of senderRequests) {
            const appAttribute = (await appService.consumption.attributes.createRepositoryAttribute(request)).value;
            appAttributeIds.push(appAttribute.id);
        }
    });

    describe(GetAttributeUseCase.name, () => {
        test("should allow to get an attribute by id", async function () {
            const result = await services1.consumption.attributes.getAttribute({ id: relationshipAttributeId });
            expect(result.isSuccess).toBe(true);
            const receivedAttributeId = result.value.id;
            expect(receivedAttributeId).toStrictEqual(relationshipAttributeId);
        });
    });

    describe(GetAttributesUseCase.name, () => {
        test("should list all attributes with empty query", async () => {
            const result = await services1.consumption.attributes.getAttributes({ query: {} });
            expect(result.isSuccess).toBe(true);
            const attributes = result.value;
            expect(attributes).toHaveLength(4);
            const attributeIds = attributes.map((attribute) => attribute.id);
            expect(attributeIds).toContain(relationshipAttributeId);
            expect(attributeIds).toStrictEqual(expect.arrayContaining(identityAttributeIds));
        });

        test("should allow to get an attribute by type", async function () {
            const result = await services1.consumption.attributes.getAttributes({
                query: { "content.value.@type": "GivenName" }
            });

            expect(result).toBeSuccessful();

            const attributes = result.value;
            expect(attributes).toHaveLength(1);
            expect(attributes[0].id).toStrictEqual(identityAttributeIds[0]);
        });

        test("should allow to get an attribute by multiple types", async function () {
            const result = await services1.consumption.attributes.getAttributes({
                query: { "content.value.@type": ["Surname", "GivenName"] }
            });

            expect(result).toBeSuccessful();

            const attributes = result.value;
            expect(attributes).toHaveLength(3);

            const attributeIds = attributes.map((attribute) => attribute.id);
            expect(attributeIds).toStrictEqual(expect.arrayContaining(identityAttributeIds));
        });

        test("should hide technical attributes when hideTechnical=true", async () => {
            const result = await services1.consumption.attributes.getAttributes({ query: {}, hideTechnical: true });
            expect(result.isSuccess).toBe(true);
            const attributes = result.value;
            expect(attributes.filter((a) => a.id === relationshipAttributeId)).toHaveLength(0);
            expect(attributes).toHaveLength(3);
            const attributeIds = attributes.map((attribute) => attribute.id);
            expect(attributeIds).toStrictEqual(identityAttributeIds);
        });

        test("should return technical attributes when hideTechnical=false", async () => {
            const getAttributesResponse = await services1.consumption.attributes.getAttributes({ query: {}, hideTechnical: false });
            expect(getAttributesResponse.isSuccess).toBe(true);
            const attributes = getAttributesResponse.value;
            expect(attributes.filter((a) => a.id === relationshipAttributeId)).toHaveLength(1);
            expect(attributes).toHaveLength(4);
            const attributeIds = attributes.map((attribute) => attribute.id);
            expect(attributeIds).toContain(relationshipAttributeId);
            expect(attributeIds).toStrictEqual(expect.arrayContaining(identityAttributeIds));
        });

        test("should allow to get only default attributes", async function () {
            const result = await appService.consumption.attributes.getAttributes({
                query: { isDefault: "true" }
            });
            expect(result).toBeSuccessful();

            const attributes = result.value;
            expect(attributes).toHaveLength(2);

            const attributeIds = attributes.map((attr) => attr.id);
            expect(attributeIds).toContain(appAttributeIds[0]);
            expect(attributeIds).toContain(appAttributeIds[1]);
            expect(attributeIds).not.toContain(appAttributeIds[2]);
        });

        test("should allow not to get default attributes", async function () {
            const result = await appService.consumption.attributes.getAttributes({
                query: { isDefault: "!true" }
            });
            expect(result).toBeSuccessful();

            const attributes = result.value;
            expect(attributes).toHaveLength(1);

            expect(attributes[0].id).toBe(appAttributeIds[2]);
        });
    });
});

describe("attribute queries", () => {
    let repositoryAttribute: LocalAttributeDTO;
    let ownSharedRelationshipAttribute: LocalAttributeDTO;

    beforeEach(async function () {
        const createRepositoryAttributeRequest: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "PhoneNumber",
                    value: "012345678910"
                }
            }
        };
        repositoryAttribute = (await services1.consumption.attributes.createRepositoryAttribute(createRepositoryAttributeRequest)).value;

        ownSharedRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "ProprietaryString",
                    title: "aTitle",
                    value: "aProprietaryStringValue"
                },
                key: "website",
                confidentiality: RelationshipAttributeConfidentiality.Protected
            }
        });
    });

    describe(ExecuteIdentityAttributeQueryUseCase.name, () => {
        test("should allow to execute an identityAttributeQuery", async function () {
            const result = await services1.consumption.attributes.executeIdentityAttributeQuery({ query: { "@type": "IdentityAttributeQuery", valueType: "PhoneNumber" } });
            expect(result.isSuccess).toBe(true);
            const receivedAttributes = result.value;
            const receivedAttributeIds = receivedAttributes.map((attribute) => attribute.id);
            expect(receivedAttributeIds.sort()).toStrictEqual([repositoryAttribute.id]);
        });
    });

    describe(ExecuteRelationshipAttributeQueryUseCase.name, () => {
        test("should allow to execute a relationshipAttributeQuery", async function () {
            const result = await services1.consumption.attributes.executeRelationshipAttributeQuery({
                query: {
                    "@type": "RelationshipAttributeQuery",
                    key: "website",
                    owner: services1.address,
                    attributeCreationHints: { valueType: "ProprietaryString", title: "AnAttributeHint", confidentiality: RelationshipAttributeConfidentiality.Protected }
                }
            });
            expect(result.isSuccess).toBe(true);
            const receivedAttribute = result.value;
            expect(receivedAttribute.id).toStrictEqual(ownSharedRelationshipAttribute.id);
        });
    });

    describe(ExecuteThirdPartyRelationshipAttributeQueryUseCase.name, () => {
        test("should allow to execute a thirdPartyRelationshipAttributeQuery", async function () {
            const result = await services2.consumption.attributes.executeThirdPartyRelationshipAttributeQuery({
                query: {
                    "@type": "ThirdPartyRelationshipAttributeQuery",
                    key: "website",
                    owner: ThirdPartyRelationshipAttributeQueryOwner.ThirdParty,
                    thirdParty: [services1.address]
                }
            });
            expect(result).toBeSuccessful();
            const receivedAttribute = result.value;
            expect(receivedAttribute).toHaveLength(1);
            expect(receivedAttribute[0].id).toStrictEqual(ownSharedRelationshipAttribute.id);
        });
    });
});

describe("get repository, own shared and peer shared attributes", () => {
    // own = services1, peer = services 2
    let services1RepoSurnameV0: LocalAttributeDTO;
    let services1RepoSurnameV1: LocalAttributeDTO;

    let services1RepoGivenNameV0: LocalAttributeDTO;
    let services1RepoGivenNameV1: LocalAttributeDTO;
    let services1SharedGivenNameV0: LocalAttributeDTO;
    let services1SharedGivenNameV1: LocalAttributeDTO;

    let services1SharedRelationshipAttributeV0: LocalAttributeDTO;
    let services1SharedRelationshipAttributeV1: LocalAttributeDTO;

    let services1SharedTechnicalRelationshipAttribute: LocalAttributeDTO;

    beforeEach(async function () {
        // unshared succeeded repository attribute
        services1RepoSurnameV0 = (
            await services1.consumption.attributes.createRepositoryAttribute({
                content: {
                    value: {
                        "@type": "Surname",
                        value: "A surname"
                    }
                }
            })
        ).value;

        ({ predecessor: services1RepoSurnameV0, successor: services1RepoSurnameV1 } = (
            await services1.consumption.attributes.succeedRepositoryAttribute({
                predecessorId: services1RepoSurnameV0.id,
                successorContent: {
                    value: {
                        "@type": "Surname",
                        value: "Another surname"
                    }
                }
            })
        ).value);

        // own shared succeeded identity attribute
        services1SharedGivenNameV0 = await executeFullCreateAndShareRepositoryAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "A given name"
                }
            }
        });
        services1RepoGivenNameV0 = (await services1.consumption.attributes.getAttribute({ id: services1SharedGivenNameV0.shareInfo!.sourceAttribute! })).value;

        ({ predecessor: services1SharedGivenNameV0, successor: services1SharedGivenNameV1 } = await executeFullSucceedRepositoryAttributeAndNotifyPeerFlow(services1, services2, {
            predecessorId: services1RepoGivenNameV0.id,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Another given name"
                }
            }
        }));
        services1RepoGivenNameV0 = (await services1.consumption.attributes.getAttribute({ id: services1SharedGivenNameV0.shareInfo!.sourceAttribute! })).value;
        services1RepoGivenNameV1 = (await services1.consumption.attributes.getAttribute({ id: services1SharedGivenNameV1.shareInfo!.sourceAttribute! })).value;

        // peer shared identity attribute
        await executeFullCreateAndShareRepositoryAttributeFlow(services2, services1, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "A peer name"
                }
            }
        });

        // own shared succeeded relationship attribute
        services1SharedRelationshipAttributeV0 = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
            content: {
                key: "aKey",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "aString",
                    title: "aTitle"
                },
                isTechnical: false
            }
        });

        ({ predecessor: services1SharedRelationshipAttributeV0, successor: services1SharedRelationshipAttributeV1 } = (
            await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
                predecessorId: services1SharedRelationshipAttributeV0.id,
                successorContent: {
                    value: {
                        "@type": "ProprietaryString",
                        value: "another String",
                        title: "another title"
                    }
                }
            })
        ).value);

        // peer shared relationship attribute
        await executeFullCreateAndShareRelationshipAttributeFlow(services2, services1, {
            content: {
                key: "a peer key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "a peer String",
                    title: "a peer title"
                },
                isTechnical: false
            }
        });

        // own shared technical relationship attribute
        services1SharedTechnicalRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
            content: {
                key: "a technical key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "a technical String",
                    title: "a technical title"
                },
                isTechnical: true
            }
        });

        // peer shared tecnical relationship attribute
        await executeFullCreateAndShareRelationshipAttributeFlow(services2, services1, {
            content: {
                key: "a technical peer key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "a technical peer String",
                    title: "a technical peer title"
                },
                isTechnical: true
            }
        });
    });

    describe(GetRepositoryAttributesUseCase.name, () => {
        test("get only latest version of repository attributes", async () => {
            const result = await services1.consumption.attributes.getRepositoryAttributes({});
            expect(result).toBeSuccessful();
            const repositoryAttributes = result.value;
            expect(repositoryAttributes).toStrictEqual([services1RepoSurnameV1, services1RepoGivenNameV1]);
        });

        test("get all versions of repository attributes", async () => {
            const result = await services1.consumption.attributes.getRepositoryAttributes({ onlyLatestVersions: false });
            expect(result).toBeSuccessful();
            const repositoryAttributes = result.value;
            expect(repositoryAttributes).toStrictEqual([services1RepoSurnameV0, services1RepoSurnameV1, services1RepoGivenNameV0, services1RepoGivenNameV1]);
        });

        test("should allow to get only default attributes", async function () {
            const defaultGivenName = (
                await appService.consumption.attributes.createRepositoryAttribute({
                    content: {
                        value: {
                            "@type": "GivenName",
                            value: "aGivenName"
                        }
                    }
                })
            ).value;

            const defaultSurname = (
                await appService.consumption.attributes.createRepositoryAttribute({
                    content: {
                        value: {
                            "@type": "Surname",
                            value: "aSurname"
                        }
                    }
                })
            ).value;

            const otherSurname = (
                await appService.consumption.attributes.createRepositoryAttribute({
                    content: {
                        value: {
                            "@type": "Surname",
                            value: "AnotherSurname"
                        }
                    }
                })
            ).value;

            const result = await appService.consumption.attributes.getRepositoryAttributes({
                query: {
                    isDefault: "true"
                }
            });
            expect(result).toBeSuccessful();

            const attributes = result.value;
            expect(attributes).toHaveLength(2);

            const attributeIds = attributes.map((attr) => attr.id);
            expect(attributeIds).toContain(defaultGivenName.id);
            expect(attributeIds).toContain(defaultSurname.id);
            expect(attributeIds).not.toContain(otherSurname.id);
        });
    });

    describe(GetOwnSharedAttributesUseCase.name, () => {
        test("should return only latest shared versions of own shared attributes", async function () {
            const requests = [{ peer: services2.address }, { peer: services2.address, onlyLatestVersions: true }, { peer: services2.address, hideTechnical: false }];
            for (const request of requests) {
                const result = await services1.consumption.attributes.getOwnSharedAttributes(request);
                expect(result).toBeSuccessful();
                const ownSharedAttributes = result.value;
                expect(ownSharedAttributes).toStrictEqual([services1SharedGivenNameV1, services1SharedRelationshipAttributeV1, services1SharedTechnicalRelationshipAttribute]);
            }
        });

        test("should return all shared version of own shared attributes", async function () {
            const result = await services1.consumption.attributes.getOwnSharedAttributes({ peer: services2.address, onlyLatestVersions: false });
            expect(result).toBeSuccessful();
            const ownSharedAttributes = result.value;
            expect(ownSharedAttributes).toStrictEqual([
                services1SharedGivenNameV0,
                services1SharedGivenNameV1,
                services1SharedRelationshipAttributeV0,
                services1SharedRelationshipAttributeV1,
                services1SharedTechnicalRelationshipAttribute
            ]);
        });

        test("should hide technical own shared attributes when hideTechnical=true", async () => {
            const result = await services1.consumption.attributes.getOwnSharedAttributes({ peer: services2.address, hideTechnical: true });
            expect(result).toBeSuccessful();
            const ownSharedAttributes = result.value;
            expect(ownSharedAttributes).toStrictEqual([services1SharedGivenNameV1, services1SharedRelationshipAttributeV1]);
        });
    });

    describe(GetPeerSharedAttributesUseCase.name, () => {
        // point of view of services 2 => own shared attributes are peer shared attributes
        let allReceivedAttributes: LocalAttributeDTO[];
        let onlyLatestReceivedAttributes: LocalAttributeDTO[];
        let notTechnicalReceivedAttributes: LocalAttributeDTO[];
        beforeEach(async function () {
            const services1SharedAttributeIds = [
                services1SharedGivenNameV0,
                services1SharedGivenNameV1,
                services1SharedRelationshipAttributeV0,
                services1SharedRelationshipAttributeV1,
                services1SharedTechnicalRelationshipAttribute
            ].map((attribute) => attribute.id);

            allReceivedAttributes = [];
            onlyLatestReceivedAttributes = [];
            notTechnicalReceivedAttributes = [];
            for (const attributeId of services1SharedAttributeIds) {
                const attribute = (await services2.consumption.attributes.getAttribute({ id: attributeId })).value;
                allReceivedAttributes.push(attribute);

                if (!attribute.succeededBy) onlyLatestReceivedAttributes.push(attribute);

                if (attribute.content["@type"] === "IdentityAttribute" || !attribute.content.isTechnical) {
                    notTechnicalReceivedAttributes.push(attribute);
                }
            }
        });

        test("should return only latest shared versions of peer shared attributes", async () => {
            const requests = [{ peer: services1.address }, { peer: services1.address, onlyLatestVersions: true }, { peer: services1.address, hideTechnical: false }];
            for (const request of requests) {
                const result = await services2.consumption.attributes.getPeerSharedAttributes(request);
                expect(result).toBeSuccessful();
                const peerSharedAttributes = result.value;
                expect(peerSharedAttributes).toStrictEqual(onlyLatestReceivedAttributes);
            }
        });

        test("should return all versions of peer shared attributes", async () => {
            const result = await services2.consumption.attributes.getPeerSharedAttributes({ peer: services1.address, onlyLatestVersions: false });
            expect(result).toBeSuccessful();
            const peerSharedAttributes = result.value;
            expect(peerSharedAttributes).toStrictEqual(allReceivedAttributes);
        });

        test("should hide technical peer shared attributes when hideTechnical=true", async () => {
            const result = await services2.consumption.attributes.getPeerSharedAttributes({ peer: services1.address, hideTechnical: true, onlyLatestVersions: false });
            expect(result).toBeSuccessful();
            const peerSharedAttributes = result.value;
            expect(peerSharedAttributes).toStrictEqual(notTechnicalReceivedAttributes);
        });
    });
});

describe(CanCreateRepositoryAttributeUseCase.name, () => {
    const canCreateRepositoryAttributeRequest: CanCreateRepositoryAttributeRequest = {
        content: {
            value: {
                "@type": "GivenName",
                value: "aGivenName"
            },
            tags: ["tag1", "tag2"]
        }
    };

    describe("validation errors for the attribute content", () => {
        test("should not allow to create a number as GivenName", async () => {
            const request: CanCreateRepositoryAttributeRequest = {
                content: {
                    value: {
                        "@type": "GivenName",
                        value: 5
                    },
                    tags: ["tag1", "tag2"]
                } as any
            };
            const result = await services1.consumption.attributes.canCreateRepositoryAttribute(request);

            assert(!result.value.isSuccess);

            expect(result.value.isSuccess).toBe(false);
            expect(result.value.message).toBe("GivenName :: value must be string");
            expect(result.value.code).toBe("error.runtime.validation.invalidPropertyValue");
        });

        test("should not allow to create a string as year of BirthDate", async () => {
            const request: CanCreateRepositoryAttributeRequest = {
                content: {
                    value: {
                        "@type": "BirthDate",
                        day: 5,
                        month: 5,
                        year: "a-string"
                    },
                    tags: ["tag1", "tag2"]
                } as any
            };
            const result = await services1.consumption.attributes.canCreateRepositoryAttribute(request);

            assert(!result.value.isSuccess);

            expect(result.value.isSuccess).toBe(false);
            expect(result.value.message).toBe("BirthDate :: year must be number");
            expect(result.value.code).toBe("error.runtime.validation.invalidPropertyValue");
        });

        test("should not allow to create a BirthDate with a missing year", async () => {
            const request: CanCreateRepositoryAttributeRequest = {
                content: {
                    value: {
                        "@type": "BirthDate",
                        day: 5,
                        month: 5
                    },
                    tags: ["tag1", "tag2"]
                } as any
            };
            const result = await services1.consumption.attributes.canCreateRepositoryAttribute(request);

            assert(!result.value.isSuccess);

            expect(result.value.isSuccess).toBe(false);
            expect(result.value.message).toBe("BirthDate :: must have required property 'year'");
            expect(result.value.code).toBe("error.runtime.validation.invalidPropertyValue");
        });

        test("should not allow to create 14 as BirthMonth", async () => {
            const request: CanCreateRepositoryAttributeRequest = {
                content: {
                    value: {
                        "@type": "BirthMonth",
                        value: 14
                    },
                    tags: ["tag1", "tag2"]
                } as any
            };
            const result = await services1.consumption.attributes.canCreateRepositoryAttribute(request);

            assert(!result.value.isSuccess);

            expect(result.value.isSuccess).toBe(false);
            expect(result.value.message).toBe("BirthMonth :: value must be equal to one of the allowed values");
            expect(result.value.code).toBe("error.runtime.validation.invalidPropertyValue");
        });

        test("should not allow to accept an additional property", async () => {
            const request: CanCreateRepositoryAttributeRequest = {
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName",
                        additionalProperty: 1
                    },
                    tags: ["tag1", "tag2"]
                } as any
            };
            const result = await services1.consumption.attributes.canCreateRepositoryAttribute(request);

            assert(!result.value.isSuccess);

            expect(result.value.isSuccess).toBe(false);
            expect(result.value.message).toBe("GivenName :: must NOT have additional properties");
            expect(result.value.code).toBe("error.runtime.validation.invalidPropertyValue");
        });

        test("should not allow to accept an invalid @type", async () => {
            const request: CanCreateRepositoryAttributeRequest = {
                content: {
                    value: {
                        "@type": "invalid-type"
                    }
                }
            } as any;
            const result = await services1.consumption.attributes.canCreateRepositoryAttribute(request);

            assert(!result.value.isSuccess);

            expect(result.value.isSuccess).toBe(false);
            expect(result.value.message).toBe("content.value.@type must match one of the allowed Attribute value types for IdentityAttributes");
            expect(result.value.code).toBe("error.runtime.validation.invalidPropertyValue");
        });
    });

    test("should allow to create a RepositoryAttribute", async () => {
        const result = await services1.consumption.attributes.canCreateRepositoryAttribute(canCreateRepositoryAttributeRequest);
        expect(result.value.isSuccess).toBe(true);
    });

    test("should not allow to create a RepositoryAttribute duplicate", async () => {
        const repositoryAttribute = (await services1.consumption.attributes.createRepositoryAttribute(canCreateRepositoryAttributeRequest)).value;

        const result = await services1.consumption.attributes.canCreateRepositoryAttribute(canCreateRepositoryAttributeRequest);

        assert(!result.value.isSuccess);

        expect(result.value.isSuccess).toBe(false);
        expect(result.value.message).toBe(
            `The RepositoryAttribute cannot be created because it has the same content.value as the already existing RepositoryAttribute with id '${repositoryAttribute.id.toString()}'.`
        );
        expect(result.value.code).toBe("error.runtime.attributes.cannotCreateDuplicateRepositoryAttribute");
    });

    test("should not allow to create a RepositoryAttribute if there exists a duplicate after trimming", async () => {
        const canCreateUntrimmedRepositoryAttributeRequest: CanCreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "    aGivenName  "
                },
                tags: ["tag1", "tag2"]
            }
        };
        const repositoryAttribute = (await services1.consumption.attributes.createRepositoryAttribute(canCreateRepositoryAttributeRequest)).value;

        const result = await services1.consumption.attributes.canCreateRepositoryAttribute(canCreateUntrimmedRepositoryAttributeRequest);

        assert(!result.value.isSuccess);

        expect(result.value.isSuccess).toBe(false);
        expect(result.value.message).toBe(
            `The RepositoryAttribute cannot be created because it has the same content.value as the already existing RepositoryAttribute with id '${repositoryAttribute.id.toString()}'.`
        );
        expect(result.value.code).toBe("error.runtime.attributes.cannotCreateDuplicateRepositoryAttribute");
    });

    test("should not allow to create a duplicate RepositoryAttribute even if the tags/validFrom/validTo are different", async () => {
        const createAttributeRequest: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["tag1", "tag2"],
                validFrom: CoreDate.utc().subtract({ day: 1 }).toString(),
                validTo: CoreDate.utc().add({ day: 1 }).toString()
            }
        };
        const repositoryAttribute = (await services1.consumption.attributes.createRepositoryAttribute(createAttributeRequest)).value;

        const canCreateAttributeRequest: CanCreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["tag3"]
            }
        };

        const result = await services1.consumption.attributes.canCreateRepositoryAttribute(canCreateAttributeRequest);

        assert(!result.value.isSuccess);

        expect(result.value.isSuccess).toBe(false);
        expect(result.value.message).toBe(
            `The RepositoryAttribute cannot be created because it has the same content.value as the already existing RepositoryAttribute with id '${repositoryAttribute.id.toString()}'.`
        );
        expect(result.value.code).toBe("error.runtime.attributes.cannotCreateDuplicateRepositoryAttribute");
    });

    test("should allow to create another RepositoryAttribute even if the tags/validFrom/validTo are duplicates", async () => {
        const validFrom = CoreDate.utc().subtract({ day: 1 }).toString();
        const validTo = CoreDate.utc().add({ day: 1 }).toString();

        const request: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["tag1", "tag2"],
                validFrom,
                validTo
            }
        };
        await services1.consumption.attributes.createRepositoryAttribute(request);

        const request2: CanCreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "anotherGivenName"
                },
                tags: ["tag1", "tag2"],
                validFrom,
                validTo
            }
        };

        const result = await services1.consumption.attributes.canCreateRepositoryAttribute(request2);
        expect(result.value.isSuccess).toBe(true);
    });

    test("should allow to create a RepositoryAttribute duplicate of a predecessor", async () => {
        const predecessor = await services1.consumption.attributes.createRepositoryAttribute(canCreateRepositoryAttributeRequest);
        await services1.consumption.attributes.succeedRepositoryAttribute({
            predecessorId: predecessor.value.id,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "anotherGivenName"
                }
            }
        });

        const result = await services1.consumption.attributes.canCreateRepositoryAttribute(canCreateRepositoryAttributeRequest);
        expect(result.value.isSuccess).toBe(true);
    });

    test("should allow to create a RepositoryAttribute that is the same as an existing RepositoryAttribute without an optional property", async () => {
        const createAttributeWithOptionalPropertyRequest: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "PersonName",
                    givenName: "aGivenName",
                    surname: "aSurname",
                    middleName: "aMiddleName"
                },
                tags: ["tag1", "tag2"]
            }
        };

        const canCreateAttributeWithoutOptionalPropertyRequest: CanCreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "PersonName",
                    givenName: "aGivenName",
                    surname: "aSurname"
                },
                tags: ["tag1", "tag2"]
            }
        };

        await services1.consumption.attributes.createRepositoryAttribute(createAttributeWithOptionalPropertyRequest);

        const result = await services1.consumption.attributes.canCreateRepositoryAttribute(canCreateAttributeWithoutOptionalPropertyRequest);
        expect(result.value.isSuccess).toBe(true);
    });
});

describe(CreateRepositoryAttributeUseCase.name, () => {
    test("should create a repository attribute", async () => {
        const request: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["tag1", "tag2"]
            }
        };

        const result = await services1.consumption.attributes.createRepositoryAttribute(request);
        expect(result).toBeSuccessful();
        const attribute = result.value;
        expect(attribute.content).toMatchObject(request.content);
        await services1.eventBus.waitForEvent(AttributeCreatedEvent, (e) => e.data.id === attribute.id);
    });

    test("should trim a repository attribute before creation", async () => {
        const request: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "    aGivenName  "
                },
                tags: ["tag1", "tag2"]
            }
        };

        const result = await services1.consumption.attributes.createRepositoryAttribute(request);
        expect(result).toBeSuccessful();
        const attribute = result.value;
        expect((attribute.content.value as GivenNameJSON).value).toBe("aGivenName");
        await services1.eventBus.waitForEvent(AttributeCreatedEvent, (e) => e.data.id === attribute.id);
    });

    test("should create LocalAttributes for each child of a complex repository attribute", async function () {
        const attributesBeforeCreate = await services1.consumption.attributes.getAttributes({});
        const nrAttributesBeforeCreate = attributesBeforeCreate.value.length;

        const createRepositoryAttributeParams: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "StreetAddress",
                    recipient: "aRecipient",
                    street: "aStreet",
                    houseNo: "aHouseNo",
                    zipCode: "aZipCode",
                    city: "aCity",
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
        expect((childAttributes[0].content.value as StreetJSON).value).toBe("aStreet");
        expect(childAttributes[1].content.value["@type"]).toBe("HouseNumber");
        expect((childAttributes[1].content.value as HouseNumberJSON).value).toBe("aHouseNo");
        expect(childAttributes[2].content.value["@type"]).toBe("ZipCode");
        expect((childAttributes[2].content.value as ZipCodeJSON).value).toBe("aZipCode");
        expect(childAttributes[3].content.value["@type"]).toBe("City");
        expect((childAttributes[3].content.value as CityJSON).value).toBe("aCity");
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

    test("should trim LocalAttributes for a complex repository attribute and for each child during creation", async function () {
        const createRepositoryAttributeParams: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "StreetAddress",
                    recipient: "    aRecipient  ",
                    street: "   aStreet ",
                    houseNo: "  aHouseNo    ",
                    zipCode: "  aZipCode    ",
                    city: " aCity   ",
                    country: "DE"
                }
            }
        };
        const createRepositoryAttributeResult = await services1.consumption.attributes.createRepositoryAttribute(createRepositoryAttributeParams);
        expect(createRepositoryAttributeResult).toBeSuccessful();
        const complexRepoAttribute = createRepositoryAttributeResult.value;

        expect((complexRepoAttribute.content.value as StreetAddressJSON).recipient).toBe("aRecipient");
        expect((complexRepoAttribute.content.value as StreetAddressJSON).street).toBe("aStreet");
        expect((complexRepoAttribute.content.value as StreetAddressJSON).houseNo).toBe("aHouseNo");
        expect((complexRepoAttribute.content.value as StreetAddressJSON).zipCode).toBe("aZipCode");
        expect((complexRepoAttribute.content.value as StreetAddressJSON).city).toBe("aCity");

        const childAttributes = (
            await services1.consumption.attributes.getAttributes({
                query: {
                    parentId: complexRepoAttribute.id
                }
            })
        ).value;

        expect((childAttributes[0].content.value as StreetJSON).value).toBe("aStreet");
        expect((childAttributes[1].content.value as HouseNumberJSON).value).toBe("aHouseNo");
        expect((childAttributes[2].content.value as ZipCodeJSON).value).toBe("aZipCode");
        expect((childAttributes[3].content.value as CityJSON).value).toBe("aCity");

        await expect(services1.eventBus).toHavePublished(AttributeCreatedEvent, (e) => e.data.content.value["@type"] === "StreetAddress");
        await expect(services1.eventBus).toHavePublished(AttributeCreatedEvent, (e) => e.data.content.value["@type"] === "Street");
        await expect(services1.eventBus).toHavePublished(AttributeCreatedEvent, (e) => e.data.content.value["@type"] === "HouseNumber");
        await expect(services1.eventBus).toHavePublished(AttributeCreatedEvent, (e) => e.data.content.value["@type"] === "ZipCode");
        await expect(services1.eventBus).toHavePublished(AttributeCreatedEvent, (e) => e.data.content.value["@type"] === "City");
        await expect(services1.eventBus).toHavePublished(AttributeCreatedEvent, (e) => e.data.content.value["@type"] === "Country");
    });

    test("should create a RepositoryAttribute that is the default if it is the first of its value type", async () => {
        const request: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "Pseudonym",
                    value: "A pseudonym"
                }
            }
        };
        const result = await appService.consumption.attributes.createRepositoryAttribute(request);
        const attribute = result.value;
        expect(attribute.isDefault).toBe(true);
    });

    test("should create a RepositoryAttribute that is not the default if it is not the first of its value type", async () => {
        const request: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "JobTitle",
                    value: "First job title"
                }
            }
        };
        const request2: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "JobTitle",
                    value: "Second job title"
                }
            }
        };
        await appService.consumption.attributes.createRepositoryAttribute(request);
        const result = await appService.consumption.attributes.createRepositoryAttribute(request2);
        const attribute = result.value;
        expect(attribute.isDefault).toBeUndefined();
    });

    describe("validation errors for the attribute content", () => {
        test("should not create a number as GivenName", async () => {
            const request: CreateRepositoryAttributeRequest = {
                content: {
                    value: {
                        "@type": "GivenName",
                        value: 5
                    },
                    tags: ["tag1", "tag2"]
                } as any
            };
            const result = await services1.consumption.attributes.createRepositoryAttribute(request);
            expect(result.error.message).toBe("GivenName :: value must be string");
            expect(result.error.code).toBe("error.runtime.validation.invalidPropertyValue");
        });

        test("should not create a string as year of BirthDate", async () => {
            const request: CreateRepositoryAttributeRequest = {
                content: {
                    value: {
                        "@type": "BirthDate",
                        day: 5,
                        month: 5,
                        year: "a-string"
                    },
                    tags: ["tag1", "tag2"]
                } as any
            };
            const result = await services1.consumption.attributes.createRepositoryAttribute(request);
            expect(result.error.message).toBe("BirthDate :: year must be number");
            expect(result.error.code).toBe("error.runtime.validation.invalidPropertyValue");
        });

        test("should not create a BirthDate with a missing year", async () => {
            const request: CreateRepositoryAttributeRequest = {
                content: {
                    value: {
                        "@type": "BirthDate",
                        day: 5,
                        month: 5
                    },
                    tags: ["tag1", "tag2"]
                } as any
            };
            const result = await services1.consumption.attributes.createRepositoryAttribute(request);
            expect(result.error.message).toBe("BirthDate :: must have required property 'year'");
            expect(result.error.code).toBe("error.runtime.validation.invalidPropertyValue");
        });

        test("should not create 14 as BirthMonth", async () => {
            const request: CreateRepositoryAttributeRequest = {
                content: {
                    value: {
                        "@type": "BirthMonth",
                        value: 14
                    },
                    tags: ["tag1", "tag2"]
                } as any
            };
            const result = await services1.consumption.attributes.createRepositoryAttribute(request);
            expect(result.error.message).toBe("BirthMonth :: value must be equal to one of the allowed values");
            expect(result.error.code).toBe("error.runtime.validation.invalidPropertyValue");
        });

        test("should not accept an additional property", async () => {
            const request: CreateRepositoryAttributeRequest = {
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName",
                        additionalProperty: 1
                    },
                    tags: ["tag1", "tag2"]
                } as any
            };
            const result = await services1.consumption.attributes.createRepositoryAttribute(request);
            expect(result.error.message).toBe("GivenName :: must NOT have additional properties");
            expect(result.error.code).toBe("error.runtime.validation.invalidPropertyValue");
        });

        test("should not accept an invalid @type", async () => {
            const request: CreateRepositoryAttributeRequest = {
                content: {
                    value: {
                        "@type": "invalid-type"
                    }
                }
            } as any;
            const result = await services1.consumption.attributes.createRepositoryAttribute(request);
            expect(result.error.message).toBe("content.value.@type must match one of the allowed Attribute value types for IdentityAttributes");
            expect(result.error.code).toBe("error.runtime.validation.invalidPropertyValue");
        });
    });

    test("should not create a duplicate RepositoryAttribute", async () => {
        const request: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["tag1", "tag2"]
            }
        };

        const result = await services1.consumption.attributes.createRepositoryAttribute(request);
        expect(result).toBeSuccessful();

        const result2 = await services1.consumption.attributes.createRepositoryAttribute(request);
        expect(result2).toBeAnError(
            `The RepositoryAttribute cannot be created because it has the same content.value as the already existing RepositoryAttribute with id '${result.value.id.toString()}'.`,
            "error.runtime.attributes.cannotCreateDuplicateRepositoryAttribute"
        );
    });

    test("should not create a RepositoryAttribute if there would be a duplicate after trimming", async () => {
        const request: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["tag1", "tag2"]
            }
        };

        const untrimmedRequest: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "    aGivenName  "
                },
                tags: ["tag1", "tag2"]
            }
        };

        const result = await services1.consumption.attributes.createRepositoryAttribute(request);
        expect(result).toBeSuccessful();

        const result2 = await services1.consumption.attributes.createRepositoryAttribute(untrimmedRequest);
        expect(result2).toBeAnError(
            `The RepositoryAttribute cannot be created because it has the same content.value as the already existing RepositoryAttribute with id '${result.value.id.toString()}'.`,
            "error.runtime.attributes.cannotCreateDuplicateRepositoryAttribute"
        );
    });

    test("should not prevent the creation when the RepositoryAttribute duplicate got succeeded", async () => {
        const request: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["tag1", "tag2"]
            }
        };

        const result = await services1.consumption.attributes.createRepositoryAttribute(request);
        expect(result).toBeSuccessful();

        const successionResult = await services1.consumption.attributes.succeedRepositoryAttribute({
            predecessorId: result.value.id,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "AnotherGivenName"
                }
            }
        });
        expect(successionResult).toBeSuccessful();

        const result2 = await services1.consumption.attributes.createRepositoryAttribute(request);
        expect(result2).toBeSuccessful();
    });

    test("should create a RepositoryAttribute that is the same as an existing RepositoryAttribute without an optional property", async () => {
        const request: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "PersonName",
                    givenName: "aGivenName",
                    surname: "aSurname",
                    middleName: "aMiddleName"
                },
                tags: ["tag1", "tag2"]
            }
        };

        const request2: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "PersonName",
                    givenName: "aGivenName",
                    surname: "aSurname"
                },
                tags: ["tag1", "tag2"]
            }
        };

        const result = await services1.consumption.attributes.createRepositoryAttribute(request);
        expect(result).toBeSuccessful();

        const result2 = await services1.consumption.attributes.createRepositoryAttribute(request2);
        expect(result2).toBeSuccessful();
    });

    test("should not create a duplicate RepositoryAttribute even if the tags/validFrom/validTo are different", async () => {
        const validFrom = CoreDate.utc().subtract({ day: 1 }).toString();
        const validTo = CoreDate.utc().add({ day: 1 }).toString();
        const request: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["tag1", "tag2"],
                validFrom,
                validTo
            }
        };

        const result = await services1.consumption.attributes.createRepositoryAttribute(request);
        expect(result).toBeSuccessful();

        const request2: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["tag1", "tag2"],
                validFrom
            }
        };

        const result2 = await services1.consumption.attributes.createRepositoryAttribute(request2);
        expect(result2).toBeAnError(
            `The RepositoryAttribute cannot be created because it has the same content.value as the already existing RepositoryAttribute with id '${result.value.id.toString()}'.`,
            "error.runtime.attributes.cannotCreateDuplicateRepositoryAttribute"
        );

        const request3: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["tag1", "tag2"],
                validTo
            }
        };

        const result3 = await services1.consumption.attributes.createRepositoryAttribute(request3);
        expect(result3).toBeAnError(
            `The RepositoryAttribute cannot be created because it has the same content.value as the already existing RepositoryAttribute with id '${result.value.id.toString()}'.`,
            "error.runtime.attributes.cannotCreateDuplicateRepositoryAttribute"
        );

        const request4: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                validFrom,
                validTo
            }
        };

        const result4 = await services1.consumption.attributes.createRepositoryAttribute(request4);
        expect(result4).toBeAnError(
            `The RepositoryAttribute cannot be created because it has the same content.value as the already existing RepositoryAttribute with id '${result.value.id.toString()}'.`,
            "error.runtime.attributes.cannotCreateDuplicateRepositoryAttribute"
        );
    });

    test("should create a RepositoryAttribute even if the tags/validFrom/validTo are duplicates", async () => {
        const validFrom = CoreDate.utc().subtract({ day: 1 }).toString();
        const validTo = CoreDate.utc().add({ day: 1 }).toString();
        const request: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["tag1", "tag2"],
                validFrom,
                validTo
            }
        };

        const result = await services1.consumption.attributes.createRepositoryAttribute(request);
        expect(result).toBeSuccessful();

        const request2: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName2"
                },
                tags: ["tag1", "tag2"],
                validFrom,
                validTo
            }
        };

        const result2 = await services1.consumption.attributes.createRepositoryAttribute(request2);
        expect(result2).toBeSuccessful();
    });
});

describe(ShareRepositoryAttributeUseCase.name, () => {
    let sRepositoryAttribute: LocalAttributeDTO;
    beforeEach(async () => {
        sRepositoryAttribute = (
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

    test("should send a sharing request containing a repository attribute", async () => {
        const shareRequest: ShareRepositoryAttributeRequest = {
            attributeId: sRepositoryAttribute.id,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareRepositoryAttribute(shareRequest);
        expect(shareRequestResult.isSuccess).toBe(true);

        const shareRequestId = shareRequestResult.value.id;
        const sOwnSharedIdentityAttribute = await acceptIncomingShareAttributeRequest(services1, services2, shareRequestId);

        const rPeerSharedIdentityAttributeResult = await services2.consumption.attributes.getAttribute({ id: sOwnSharedIdentityAttribute.id });
        expect(rPeerSharedIdentityAttributeResult.isSuccess).toBe(true);
        const rPeerSharedIdentityAttribute = rPeerSharedIdentityAttributeResult.value;

        expect(sOwnSharedIdentityAttribute.content).toStrictEqual(rPeerSharedIdentityAttribute.content);
        expect(sOwnSharedIdentityAttribute.shareInfo?.sourceAttribute?.toString()).toBe(sRepositoryAttribute.id);
    });

    test("should send a sharing request containing a repository attribute with metadata", async () => {
        const expiresAt = CoreDate.utc().add({ days: 1 }).toString();
        const shareRequest: ShareRepositoryAttributeRequest = {
            attributeId: sRepositoryAttribute.id,
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

    test("should send a sharing request containing a repository attribute that was already shared but deleted by the peer", async () => {
        const shareRequest: ShareRepositoryAttributeRequest = {
            attributeId: sRepositoryAttribute.id,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareRepositoryAttribute(shareRequest);

        const shareRequestId = shareRequestResult.value.id;
        const sOwnSharedIdentityAttribute = await acceptIncomingShareAttributeRequest(services1, services2, shareRequestId);

        const rPeerSharedIdentityAttribute = (await services2.consumption.attributes.getAttribute({ id: sOwnSharedIdentityAttribute.id })).value;
        const deleteResult = await services2.consumption.attributes.deletePeerSharedAttributeAndNotifyOwner({ attributeId: rPeerSharedIdentityAttribute.id });
        const notificationId = deleteResult.value.notificationId!;

        await syncUntilHasMessageWithNotification(services1.transport, notificationId);
        await services1.eventBus.waitForEvent(PeerSharedAttributeDeletedByPeerEvent, (e) => {
            return e.data.id === sOwnSharedIdentityAttribute.id;
        });
        const sUpdatedOwnSharedIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: sOwnSharedIdentityAttribute.id })).value;
        expect(sUpdatedOwnSharedIdentityAttribute.deletionInfo?.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);

        const shareRequestResult2 = await services1.consumption.attributes.shareRepositoryAttribute(shareRequest);
        expect(shareRequestResult2).toBeSuccessful();
    });

    test("should send a sharing request containing a repository attribute that was already shared but is to be deleted by the peer", async () => {
        const shareRequest: ShareRepositoryAttributeRequest = {
            attributeId: sRepositoryAttribute.id,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareRepositoryAttribute(shareRequest);

        const shareRequestId = shareRequestResult.value.id;
        const sOwnSharedIdentityAttribute = await acceptIncomingShareAttributeRequest(services1, services2, shareRequestId);

        const requestParams = {
            content: {
                items: [
                    DeleteAttributeRequestItem.from({
                        attributeId: sOwnSharedIdentityAttribute.id,
                        mustBeAccepted: true
                    }).toJSON()
                ]
            },
            peer: services2.address
        };

        const responseItems = [
            {
                accept: true,
                deletionDate: CoreDate.utc().add({ days: 1 }).toString()
            }
        ];

        await exchangeAndAcceptRequestByMessage(services1, services2, requestParams, responseItems);

        const sUpdatedOwnSharedIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: sOwnSharedIdentityAttribute.id })).value;
        expect(sUpdatedOwnSharedIdentityAttribute.deletionInfo?.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.ToBeDeletedByPeer);

        const shareRequestResult2 = await services1.consumption.attributes.shareRepositoryAttribute(shareRequest);
        expect(shareRequestResult2).toBeSuccessful();
    });

    test("should reject attempts to share the same repository attribute more than once with the same peer", async () => {
        await executeFullShareRepositoryAttributeFlow(services1, services3, sRepositoryAttribute.id);

        const repeatedShareRequestResult = await services1.consumption.attributes.shareRepositoryAttribute({
            attributeId: sRepositoryAttribute.id,
            peer: services3.address
        });

        expect(repeatedShareRequestResult).toBeAnError(
            `The IdentityAttribute with the given sourceAttributeId '${sRepositoryAttribute.id}' is already shared with the peer.`,
            "error.consumption.requests.invalidRequestItem"
        );
    });

    test("should reject sharing an attribute, of which a previous version has been shared", async () => {
        const predecesssorOwnSharedIdentityAttribute = await executeFullCreateAndShareRepositoryAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "Surname",
                    value: "Name 1"
                }
            }
        });

        const { successor: successorRepositoryAttribute } = (
            await services1.consumption.attributes.succeedRepositoryAttribute({
                predecessorId: predecesssorOwnSharedIdentityAttribute.shareInfo!.sourceAttribute!,
                successorContent: {
                    value: {
                        "@type": "Surname",
                        value: "Name 2"
                    }
                }
            })
        ).value;

        const response = await services1.consumption.attributes.shareRepositoryAttribute({
            attributeId: successorRepositoryAttribute.id,
            peer: services2.address
        });
        expect(response).toBeAnError(
            `The predecessor '${predecesssorOwnSharedIdentityAttribute.shareInfo!.sourceAttribute}' of the IdentityAttribute is already shared with the peer. Instead of sharing it, you should notify the peer about the Attribute succession.`,
            "error.consumption.requests.invalidRequestItem"
        );
    });

    test("should reject sharing an own shared identity attribute", async () => {
        const sOwnSharedIdentityAttribute = await executeFullShareRepositoryAttributeFlow(services1, services2, sRepositoryAttribute.id);

        const shareRequest: ShareRepositoryAttributeRequest = {
            attributeId: sOwnSharedIdentityAttribute.id,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareRepositoryAttribute(shareRequest);
        expect(shareRequestResult).toBeAnError(/.*/, "error.runtime.attributes.isNotRepositoryAttribute");
    });

    test("should reject sharing a peer shared identity attribute", async () => {
        const sOwnSharedIdentityAttribute = await executeFullShareRepositoryAttributeFlow(services1, services2, sRepositoryAttribute.id);
        const rPeerSharedIdentityAttribute = (await services2.consumption.attributes.getAttribute({ id: sOwnSharedIdentityAttribute.id })).value;

        const shareRequest: ShareRepositoryAttributeRequest = {
            attributeId: rPeerSharedIdentityAttribute.id,
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
                    value: "aString",
                    title: "aTitle"
                },
                confidentiality: RelationshipAttributeConfidentiality.Public
            },
            peer: services2.address
        };
        const sOwnSharedRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, createAndShareRelationshipAttributeRequest);

        const shareRequest: ShareRepositoryAttributeRequest = {
            attributeId: sOwnSharedRelationshipAttribute.id,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareRepositoryAttribute(shareRequest);
        expect(shareRequestResult).toBeAnError(/.*/, "error.runtime.attributes.isNotRepositoryAttribute");
    });

    test("should throw if repository attribute doesn't exist", async () => {
        const shareRequest: ShareRepositoryAttributeRequest = {
            attributeId: (await new CoreIdHelper("ATT").generate()).toString(),
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

    test("should trim the successor of a repository attribute", async () => {
        const createAttributeRequest: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
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
                    value: "    anotherGivenName    "
                },
                tags: ["tag1", "tag2"]
            }
        };
        const result = await services1.consumption.attributes.succeedRepositoryAttribute(succeedAttributeRequest);
        expect(result.isError).toBe(false);
        const { predecessor: updatedPredecessor, successor } = result.value;
        expect((successor as any).content.value.value).toBe("anotherGivenName");
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
            predecessorId: (await new CoreIdHelper("ATT").generate()).toString(),
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

    test("should throw if successor doesn't meet validation criteria", async () => {
        const createAttributeRequest: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "PhoneNumber",
                    value: "0123456789"
                }
            }
        };
        const predecessor = (await services1.consumption.attributes.createRepositoryAttribute(createAttributeRequest)).value;

        const succeedAttributeRequest: SucceedRepositoryAttributeRequest = {
            predecessorId: predecessor.id.toString(),
            successorContent: {
                value: {
                    "@type": "PhoneNumber",
                    value: ""
                }
            }
        };
        const result = await services1.consumption.attributes.succeedRepositoryAttribute(succeedAttributeRequest);
        expect(result).toBeAnError("Value is shorter than 3 characters", "error.consumption.attributes.successorIsNotAValidAttribute");
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
    let succeedRepositoryAttributeRequest1: SucceedRepositoryAttributeRequest;
    let succeedRepositoryAttributeRequest2: SucceedRepositoryAttributeRequest;
    let ownSharedIdentityAttributeVersion0: LocalAttributeDTO;
    let repositoryAttributeVersion1: LocalAttributeDTO;
    let repositoryAttributeVersion2: LocalAttributeDTO;
    beforeEach(async () => {
        ownSharedIdentityAttributeVersion0 = await executeFullCreateAndShareRepositoryAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        });

        succeedRepositoryAttributeRequest1 = {
            predecessorId: ownSharedIdentityAttributeVersion0.shareInfo!.sourceAttribute!,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Tina Turner"
                },
                tags: ["Bunsen", "Burner"]
            }
        };
        ({ successor: repositoryAttributeVersion1 } = (await services1.consumption.attributes.succeedRepositoryAttribute(succeedRepositoryAttributeRequest1)).value);

        succeedRepositoryAttributeRequest2 = {
            predecessorId: repositoryAttributeVersion1.id,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Martina Mustermann"
                }
            }
        };
        ({ successor: repositoryAttributeVersion2 } = (await services1.consumption.attributes.succeedRepositoryAttribute(succeedRepositoryAttributeRequest2)).value);
    });

    test("should successfully notify peer about attribute succession", async () => {
        const notificationResult = await services1.consumption.attributes.notifyPeerAboutRepositoryAttributeSuccession({
            attributeId: repositoryAttributeVersion1.id,
            peer: services2.address
        });
        expect(notificationResult.isSuccess).toBe(true);
    });

    test("should create sender own shared identity attribute and recipient peer shared identity attribute", async () => {
        const { successor: ownSharedIdentityAttributeVersion1 } = await executeFullNotifyPeerAboutAttributeSuccessionFlow(services1, services2, repositoryAttributeVersion1.id);
        expect(ownSharedIdentityAttributeVersion1.succeeds).toStrictEqual(ownSharedIdentityAttributeVersion0.id);
        expect(ownSharedIdentityAttributeVersion1.content.value).toStrictEqual(succeedRepositoryAttributeRequest1.successorContent.value);
        expect((ownSharedIdentityAttributeVersion1 as any).content.tags).toStrictEqual(succeedRepositoryAttributeRequest1.successorContent.tags);

        const recipientPeerSharedIdentityAttributeVersion1 = (await services2.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion1.id })).value;
        expect(recipientPeerSharedIdentityAttributeVersion1.content).toStrictEqual(ownSharedIdentityAttributeVersion1.content);
    });

    test("should allow to notify about successor having notified about predecessor", async () => {
        let { successor: ownSharedIdentityAttributeVersion1 } = await executeFullNotifyPeerAboutAttributeSuccessionFlow(services1, services2, repositoryAttributeVersion1.id);

        const successionResult = await executeFullNotifyPeerAboutAttributeSuccessionFlow(services1, services2, repositoryAttributeVersion2.id);
        ownSharedIdentityAttributeVersion1 = successionResult["predecessor"];
        const ownSharedIdentityAttributeVersion2 = successionResult["successor"];

        expect(ownSharedIdentityAttributeVersion1.succeededBy).toStrictEqual(ownSharedIdentityAttributeVersion2.id);
        expect(ownSharedIdentityAttributeVersion2.succeeds).toStrictEqual(ownSharedIdentityAttributeVersion1.id);
        expect(ownSharedIdentityAttributeVersion2.succeededBy).toBeUndefined();
    });

    test("should allow to notify about successor not having notified about predecessor", async () => {
        const { successor: ownSharedIdentityAttributeVersion2 } = await executeFullNotifyPeerAboutAttributeSuccessionFlow(services1, services2, repositoryAttributeVersion2.id);
        expect(ownSharedIdentityAttributeVersion2.succeeds).toStrictEqual(ownSharedIdentityAttributeVersion0.id);
    });

    test("should allow to notify about successor if the predecessor was deleted by peer but additional predecessor exists", async () => {
        const deleteResult = await services2.consumption.attributes.deletePeerSharedAttributeAndNotifyOwner({ attributeId: ownSharedIdentityAttributeVersion0.id });
        const notificationId = deleteResult.value.notificationId!;

        await syncUntilHasMessageWithNotification(services1.transport, notificationId);
        await services1.eventBus.waitForEvent(PeerSharedAttributeDeletedByPeerEvent, (e) => {
            return e.data.id === ownSharedIdentityAttributeVersion0.id;
        });
        const updatedOwnSharedIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion0.id })).value;
        expect(updatedOwnSharedIdentityAttribute.deletionInfo?.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);

        const ownSharedIdentityAttributeVersion0WithoutDeletionInfo = await executeFullShareRepositoryAttributeFlow(
            services1,
            services2,
            ownSharedIdentityAttributeVersion0.shareInfo!.sourceAttribute!
        );

        const result = await services1.consumption.attributes.notifyPeerAboutRepositoryAttributeSuccession({
            attributeId: repositoryAttributeVersion2.id,
            peer: services2.address
        });
        expect(result).toBeSuccessful();
        expect(result.value.predecessor.id).toBe(ownSharedIdentityAttributeVersion0WithoutDeletionInfo.id);
    });

    test("should throw if the predecessor repository attribute was deleted", async () => {
        const repositoryAttributeVersion0 = (await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion0.shareInfo!.sourceAttribute! })).value;
        await services1.consumption.attributes.deleteRepositoryAttribute({ attributeId: repositoryAttributeVersion0.id });

        const notificationResult = await services1.consumption.attributes.notifyPeerAboutRepositoryAttributeSuccession({
            attributeId: repositoryAttributeVersion1.id,
            peer: services2.address
        });
        expect(notificationResult).toBeAnError(/.*/, "error.runtime.attributes.noPreviousVersionOfRepositoryAttributeHasBeenSharedWithPeerBefore");
    });

    test("should throw if the successor repository attribute was deleted", async () => {
        await services1.consumption.attributes.deleteRepositoryAttribute({ attributeId: repositoryAttributeVersion1.id });

        const notificationResult = await services1.consumption.attributes.notifyPeerAboutRepositoryAttributeSuccession({
            attributeId: repositoryAttributeVersion1.id,
            peer: services2.address
        });
        expect(notificationResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("should throw if the predecessor was deleted by peer", async () => {
        const { successor: ownSharedIdentityAttributeVersion1 } = await executeFullNotifyPeerAboutAttributeSuccessionFlow(services1, services2, repositoryAttributeVersion1.id);
        const rPeerSharedIdentityAttributeVersion1 = (await services2.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion1.id })).value;

        const deleteResult = await services2.consumption.attributes.deletePeerSharedAttributeAndNotifyOwner({ attributeId: rPeerSharedIdentityAttributeVersion1.id });
        const notificationId = deleteResult.value.notificationId!;

        await syncUntilHasMessageWithNotification(services1.transport, notificationId);
        await services1.eventBus.waitForEvent(PeerSharedAttributeDeletedByPeerEvent, (e) => {
            return e.data.id === ownSharedIdentityAttributeVersion1.id;
        });
        const updatedOwnSharedIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion1.id })).value;
        expect(updatedOwnSharedIdentityAttribute.deletionInfo?.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);

        const notificationResult = await services1.consumption.attributes.notifyPeerAboutRepositoryAttributeSuccession({
            attributeId: repositoryAttributeVersion2.id,
            peer: services2.address
        });
        expect(notificationResult).toBeAnError(/.*/, "error.runtime.attributes.cannotSucceedAttributesWithDeletionInfo");
    });

    test("should throw if the same version of the attribute has been notified about already", async () => {
        await executeFullNotifyPeerAboutAttributeSuccessionFlow(services1, services2, repositoryAttributeVersion1.id);

        const result2 = await services1.consumption.attributes.notifyPeerAboutRepositoryAttributeSuccession({
            attributeId: repositoryAttributeVersion1.id,
            peer: services2.address
        });
        expect(result2).toBeAnError(/.*/, "error.runtime.attributes.repositoryAttributeHasAlreadyBeenSharedWithPeer");
    });

    test("should throw if a later version of the attribute has been notified about already", async () => {
        await executeFullNotifyPeerAboutAttributeSuccessionFlow(services1, services2, repositoryAttributeVersion2.id);

        const notificationResult = await services1.consumption.attributes.notifyPeerAboutRepositoryAttributeSuccession({
            attributeId: repositoryAttributeVersion1.id,
            peer: services2.address
        });
        expect(notificationResult).toBeAnError(/.*/, "error.consumption.attributes.successorSourceDoesNotSucceedPredecessorSource");
    });

    test("should throw if no other version of the attribute has been shared before", async () => {
        const newRepositoryAttribute = (
            await services1.consumption.attributes.createRepositoryAttribute({
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName"
                    }
                }
            })
        ).value;

        const result = await services1.consumption.attributes.notifyPeerAboutRepositoryAttributeSuccession({ attributeId: newRepositoryAttribute.id, peer: services2.address });
        expect(result).toBeAnError(/.*/, "error.runtime.attributes.noPreviousVersionOfRepositoryAttributeHasBeenSharedWithPeerBefore");
    });
});

describe(CreateAndShareRelationshipAttributeUseCase.name, () => {
    test("should create and share a relationship attribute", async () => {
        const createAndShareRelationshipAttributeRequest: CreateAndShareRelationshipAttributeRequest = {
            content: {
                key: "test key",
                value: {
                    "@type": "ProprietaryString",
                    value: "aString",
                    title: "aTitle"
                },
                confidentiality: RelationshipAttributeConfidentiality.Public
            },
            peer: services2.address
        };
        const requestResult = await services1.consumption.attributes.createAndShareRelationshipAttribute(createAndShareRelationshipAttributeRequest);
        expect(requestResult.isSuccess).toBe(true);

        const requestId = requestResult.value.id;
        const sOwnSharedRelationshipAttribute = await acceptIncomingShareAttributeRequest(services1, services2, requestId);
        const rPeerSharedRelationshipAttribute = (await services2.consumption.attributes.getAttribute({ id: sOwnSharedRelationshipAttribute.id })).value;

        expect(sOwnSharedRelationshipAttribute.content.value).toStrictEqual(createAndShareRelationshipAttributeRequest.content.value);
        expect(sOwnSharedRelationshipAttribute.content).toStrictEqual(rPeerSharedRelationshipAttribute.content);
    });

    test("should create and share a relationship attribute with metadata", async () => {
        const expiresAt = CoreDate.utc().add({ days: 1 }).toString();
        const createAndShareRelationshipAttributeRequest: CreateAndShareRelationshipAttributeRequest = {
            content: {
                key: "test key for metadata",
                value: {
                    "@type": "ProprietaryString",
                    value: "aString",
                    title: "aTitle"
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
    let sOwnSharedRelationshipAttribute: LocalAttributeDTO;
    beforeEach(async () => {
        sOwnSharedRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
            content: {
                key: "test key for succession",
                value: {
                    "@type": "ProprietaryString",
                    value: "aString",
                    title: "aTitle"
                },
                confidentiality: RelationshipAttributeConfidentiality.Public
            }
        });
    });

    test("should succeed a relationship attribute and notify peer", async () => {
        const result = await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
            predecessorId: sOwnSharedRelationshipAttribute.id,
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
            predecessorId: sOwnSharedRelationshipAttribute.id,
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

    test("should throw if the predecessor was deleted by peer", async () => {
        const rPeerSharedRelationshipAttribute = (await services2.consumption.attributes.getAttribute({ id: sOwnSharedRelationshipAttribute.id })).value;

        const deleteResult = await services2.consumption.attributes.deletePeerSharedAttributeAndNotifyOwner({ attributeId: rPeerSharedRelationshipAttribute.id });
        const notificationId = deleteResult.value.notificationId!;

        await syncUntilHasMessageWithNotification(services1.transport, notificationId);
        await services1.eventBus.waitForEvent(PeerSharedAttributeDeletedByPeerEvent, (e) => {
            return e.data.id === sOwnSharedRelationshipAttribute.id;
        });
        const updatedOwnSharedRelationshipAttribute = (await services1.consumption.attributes.getAttribute({ id: sOwnSharedRelationshipAttribute.id })).value;
        expect(updatedOwnSharedRelationshipAttribute.deletionInfo?.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);

        const result = await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
            predecessorId: sOwnSharedRelationshipAttribute.id,
            successorContent: {
                value: {
                    "@type": "ProprietaryString",
                    value: "another String",
                    title: "another title"
                }
            }
        });
        expect(result).toBeAnError(/.*/, "error.consumption.attributes.cannotSucceedAttributesWithDeletionInfo");
    });
});

describe(ChangeDefaultRepositoryAttributeUseCase.name, () => {
    test("should change default RepositoryAttribute", async () => {
        const defaultAttribute = (
            await appService.consumption.attributes.createRepositoryAttribute({
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "My default name"
                    }
                }
            })
        ).value;
        expect(defaultAttribute.isDefault).toBe(true);

        const desiredDefaultAttribute = (
            await appService.consumption.attributes.createRepositoryAttribute({
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "My new default name"
                    }
                }
            })
        ).value;
        expect(desiredDefaultAttribute.isDefault).toBeUndefined();

        const result = await appService.consumption.attributes.changeDefaultRepositoryAttribute({ attributeId: desiredDefaultAttribute.id });
        expect(result.isSuccess).toBe(true);
        const newDefaultAttribute = result.value;
        expect(newDefaultAttribute.isDefault).toBe(true);

        const updatedFormerDesiredDefaultAttribute = (await appService.consumption.attributes.getAttribute({ id: desiredDefaultAttribute.id })).value;
        expect(updatedFormerDesiredDefaultAttribute.isDefault).toBe(true);

        const updatedFormerDefaultAttribute = (await appService.consumption.attributes.getAttribute({ id: defaultAttribute.id })).value;
        expect(updatedFormerDefaultAttribute.isDefault).toBeUndefined();
    });

    test("should return an error if the new default attribute is not a RepositoryAttribute", async () => {
        await appService.consumption.attributes.createRepositoryAttribute({
            content: {
                value: {
                    "@type": "GivenName",
                    value: "My default name"
                }
            }
        });

        const desiredSharedDefaultAttribute = await executeFullCreateAndShareRepositoryAttributeFlow(appService, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "My new shared name"
                }
            }
        });
        const result = await appService.consumption.attributes.changeDefaultRepositoryAttribute({ attributeId: desiredSharedDefaultAttribute.id });
        expect(result).toBeAnError(`Attribute '${desiredSharedDefaultAttribute.id.toString()}' is not a RepositoryAttribute.`, "error.runtime.attributes.isNotRepositoryAttribute");
    });

    test("should return an error if the new default attribute has a successor", async () => {
        await appService.consumption.attributes.createRepositoryAttribute({
            content: {
                value: {
                    "@type": "GivenName",
                    value: "My default name"
                }
            }
        });

        const desiredDefaultAttribute = (
            await appService.consumption.attributes.createRepositoryAttribute({
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "My new default name"
                    }
                }
            })
        ).value;

        const successionResult = (
            await appService.consumption.attributes.succeedRepositoryAttribute({
                predecessorId: desiredDefaultAttribute.id,
                successorContent: {
                    value: {
                        "@type": "GivenName",
                        value: "My new successor default name"
                    }
                }
            })
        ).value;

        const updatedDesiredDefaultAttribute = successionResult.predecessor;
        const desiredDefaultAttributeSuccessor = successionResult.successor;

        const result = await appService.consumption.attributes.changeDefaultRepositoryAttribute({ attributeId: updatedDesiredDefaultAttribute.id });
        expect(result).toBeAnError(
            `Attribute '${updatedDesiredDefaultAttribute.id.toString()}' already has a successor ${desiredDefaultAttributeSuccessor.id.toString()}.`,
            "error.runtime.attributes.hasSuccessor"
        );
    });

    test("should return an error trying to set a default attribute if setDefaultRepositoryAttributes is false", async () => {
        const attribute = (
            await services1.consumption.attributes.createRepositoryAttribute({
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "My default name"
                    }
                }
            })
        ).value;
        expect(attribute.isDefault).toBeUndefined();

        const result = await services1.consumption.attributes.changeDefaultRepositoryAttribute({ attributeId: attribute.id });
        expect(result).toBeAnError("Setting default RepositoryAttributes is disabled for this Account.", "error.runtime.attributes.setDefaultRepositoryAttributesIsDisabled");
    });
});

describe("Get (shared) versions of attribute", () => {
    let sRepositoryAttributeVersion0: LocalAttributeDTO;
    let sRepositoryAttributeVersion1: LocalAttributeDTO;
    let sRepositoryAttributeVersion2: LocalAttributeDTO;
    let sRepositoryAttributeVersions: LocalAttributeDTO[];

    let sOwnSharedIdentityAttributeVersion0: LocalAttributeDTO;
    let sOwnSharedIdentityAttributeVersion2: LocalAttributeDTO;
    let sOwnSharedIdentityAttributeVersion2FurtherPeer: LocalAttributeDTO;

    let sOwnSharedRelationshipAttributeVersion0: LocalAttributeDTO;
    let sOwnSharedRelationshipAttributeVersion1: LocalAttributeDTO;
    let sOwnSharedRelationshipAttributeVersion2: LocalAttributeDTO;
    async function succeedVersion0(): Promise<void> {
        const succeedRepositoryAttributeRequest1: SucceedRepositoryAttributeRequest = {
            predecessorId: sRepositoryAttributeVersion0.id.toString(),
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Second Name"
                },
                tags: ["tag2"]
            }
        };
        const sRepositoryAttributeSuccessionResult1 = await services1.consumption.attributes.succeedRepositoryAttribute(succeedRepositoryAttributeRequest1);
        ({ predecessor: sRepositoryAttributeVersion0, successor: sRepositoryAttributeVersion1 } = sRepositoryAttributeSuccessionResult1.value);
    }

    async function succeedVersion1(): Promise<void> {
        const succeedRepositoryAttributeRequest2: SucceedRepositoryAttributeRequest = {
            predecessorId: sRepositoryAttributeVersion1.id.toString(),
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Third Name"
                },
                tags: ["tag3"]
            }
        };
        const sRepositoryAttributeSuccessionResult2 = await services1.consumption.attributes.succeedRepositoryAttribute(succeedRepositoryAttributeRequest2);
        ({ predecessor: sRepositoryAttributeVersion1, successor: sRepositoryAttributeVersion2 } = sRepositoryAttributeSuccessionResult2.value);
    }

    async function setUpRepositoryAttributeVersions() {
        sRepositoryAttributeVersion0 = (
            await services1.consumption.attributes.createRepositoryAttribute({
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "First Name"
                    },
                    tags: ["tag1"]
                }
            })
        ).value;
        await succeedVersion0();
        await succeedVersion1();
        sRepositoryAttributeVersions = [sRepositoryAttributeVersion2, sRepositoryAttributeVersion1, sRepositoryAttributeVersion0];
    }

    async function setUpIdentityAttributeVersions() {
        await createAndShareVersion0();
        await succeedVersion0();
        await succeedVersion1();
        sRepositoryAttributeVersions = [sRepositoryAttributeVersion2, sRepositoryAttributeVersion1, sRepositoryAttributeVersion0];

        await notifyPeerAboutVersion2();
        await shareVersion2WithFurtherPeer();

        async function createAndShareVersion0(): Promise<void> {
            sOwnSharedIdentityAttributeVersion0 = await executeFullCreateAndShareRepositoryAttributeFlow(services1, services2, {
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "First Name"
                    },
                    tags: ["tag1"]
                }
            });

            sRepositoryAttributeVersion0 = (await services1.consumption.attributes.getAttribute({ id: sOwnSharedIdentityAttributeVersion0.shareInfo!.sourceAttribute! })).value;
        }

        async function notifyPeerAboutVersion2(): Promise<void> {
            const notifyRequestResult = (
                await services1.consumption.attributes.notifyPeerAboutRepositoryAttributeSuccession({
                    attributeId: sRepositoryAttributeVersion2.id,
                    peer: services2.address
                })
            ).value;
            await waitForRecipientToReceiveNotification(services1, services2, notifyRequestResult);

            ({ predecessor: sOwnSharedIdentityAttributeVersion0, successor: sOwnSharedIdentityAttributeVersion2 } = notifyRequestResult);
        }

        async function shareVersion2WithFurtherPeer(): Promise<void> {
            const shareRequestResult = await services1.consumption.attributes.shareRepositoryAttribute({
                attributeId: sRepositoryAttributeVersion2.id,
                peer: services3.address
            });
            const shareRequestId = shareRequestResult.value.id;
            sOwnSharedIdentityAttributeVersion2FurtherPeer = await acceptIncomingShareAttributeRequest(services1, services3, shareRequestId);
        }
    }

    async function createAndShareRelationshipAttributeVersion0(): Promise<void> {
        sOwnSharedRelationshipAttributeVersion0 = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
            content: {
                key: "aKey",
                value: {
                    "@type": "ProprietaryInteger",
                    title: "Version",
                    value: 1
                },
                confidentiality: RelationshipAttributeConfidentiality.Public
            }
        });
    }

    async function setUpRelationshipAttributeVersions() {
        await createAndShareRelationshipAttributeVersion0();
        await succeedVersion0();
        await succeedVersion1();

        async function succeedVersion0(): Promise<void> {
            const sRepositoryAttributeSuccessionResult1 = await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
                predecessorId: sOwnSharedRelationshipAttributeVersion0.id.toString(),
                successorContent: {
                    value: {
                        "@type": "ProprietaryInteger",
                        title: "Version",
                        value: 2
                    }
                }
            });
            await waitForRecipientToReceiveNotification(services1, services2, sRepositoryAttributeSuccessionResult1.value);

            ({ predecessor: sOwnSharedRelationshipAttributeVersion0, successor: sOwnSharedRelationshipAttributeVersion1 } = sRepositoryAttributeSuccessionResult1.value);
        }

        async function succeedVersion1(): Promise<void> {
            const sRepositoryAttributeSuccessionResult2 = await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
                predecessorId: sOwnSharedRelationshipAttributeVersion1.id.toString(),
                successorContent: {
                    value: {
                        "@type": "ProprietaryInteger",
                        title: "Version",
                        value: 3
                    }
                }
            });
            await waitForRecipientToReceiveNotification(services1, services2, sRepositoryAttributeSuccessionResult2.value);

            ({ predecessor: sOwnSharedRelationshipAttributeVersion1, successor: sOwnSharedRelationshipAttributeVersion2 } = sRepositoryAttributeSuccessionResult2.value);
        }
    }

    describe(GetVersionsOfAttributeUseCase.name, () => {
        test("should get all versions of a repository attribute", async () => {
            await setUpRepositoryAttributeVersions();
            for (const version of sRepositoryAttributeVersions) {
                const result = await services1.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result.isSuccess).toBe(true);

                const returnedVersions = result.value;
                expect(returnedVersions).toStrictEqual(sRepositoryAttributeVersions);
            }
        });

        test("should get all versions of an own shared identity attribute shared with the same peer", async () => {
            await setUpIdentityAttributeVersions();
            const sOwnSharedIdentityAttributeVersions = [sOwnSharedIdentityAttributeVersion2, sOwnSharedIdentityAttributeVersion0];
            for (const version of sOwnSharedIdentityAttributeVersions) {
                const result1 = await services1.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result1.isSuccess).toBe(true);

                const returnedVersions1 = result1.value;
                expect(returnedVersions1).toStrictEqual(sOwnSharedIdentityAttributeVersions);
            }
        });

        test("should get all versions of a peer shared identity attribute", async () => {
            await setUpIdentityAttributeVersions();
            const rPeerSharedIdentityAttributeVersion2 = (await services2.consumption.attributes.getAttribute({ id: sOwnSharedIdentityAttributeVersion2.id })).value;
            const rPeerSharedIdentityAttributeVersion0 = (await services2.consumption.attributes.getAttribute({ id: sOwnSharedIdentityAttributeVersion0.id })).value;
            const rPeerSharedIdentityAttributeVersions = [rPeerSharedIdentityAttributeVersion2, rPeerSharedIdentityAttributeVersion0];

            for (const version of rPeerSharedIdentityAttributeVersions) {
                const result = await services2.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result.isSuccess).toBe(true);

                const returnedVersions = result.value;
                expect(returnedVersions).toStrictEqual(rPeerSharedIdentityAttributeVersions);
            }
        });

        test("should get all versions of an own shared relationship attribute", async () => {
            await setUpRelationshipAttributeVersions();
            const sOwnSharedRelationshipAttributeVersions = [
                sOwnSharedRelationshipAttributeVersion2,
                sOwnSharedRelationshipAttributeVersion1,
                sOwnSharedRelationshipAttributeVersion0
            ];
            for (const version of sOwnSharedRelationshipAttributeVersions) {
                const result = await services1.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result.isSuccess).toBe(true);

                const returnedVersions = result.value;
                expect(returnedVersions).toStrictEqual(sOwnSharedRelationshipAttributeVersions);
            }
        });

        test("should get all versions of a peer shared relationship attribute", async () => {
            await setUpRelationshipAttributeVersions();
            const rPeerSharedRelationshipAttributeVersion2 = (await services2.consumption.attributes.getAttribute({ id: sOwnSharedRelationshipAttributeVersion2.id })).value;
            const rPeerSharedRelationshipAttributeVersion1 = (await services2.consumption.attributes.getAttribute({ id: sOwnSharedRelationshipAttributeVersion1.id })).value;
            const rPeerSharedRelationshipAttributeVersion0 = (await services2.consumption.attributes.getAttribute({ id: sOwnSharedRelationshipAttributeVersion0.id })).value;
            const rPeerSharedRelationshipAttributeVersions = [
                rPeerSharedRelationshipAttributeVersion2,
                rPeerSharedRelationshipAttributeVersion1,
                rPeerSharedRelationshipAttributeVersion0
            ];

            for (const version of rPeerSharedRelationshipAttributeVersions) {
                const result = await services2.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result.isSuccess).toBe(true);

                const returnedVersions = result.value;
                expect(returnedVersions).toStrictEqual(rPeerSharedRelationshipAttributeVersions);
            }
        });

        test("should throw trying to call getVersionsOfAttribute with a nonexistent attributeId", async () => {
            const result = await services1.consumption.attributes.getVersionsOfAttribute({ attributeId: "ATTxxxxxxxxxxxxxxxxx" });
            expect(result).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });
    });

    describe(GetSharedVersionsOfAttributeUseCase.name, () => {
        beforeEach(async () => {
            await setUpIdentityAttributeVersions();
        });

        test("should get only latest shared version per peer of a repository attribute", async () => {
            for (const version of sRepositoryAttributeVersions) {
                const result1 = await services1.consumption.attributes.getSharedVersionsOfAttribute({ attributeId: version.id });
                expect(result1.isSuccess).toBe(true);
                const returnedVersions1 = result1.value;
                expect(returnedVersions1).toStrictEqual(expect.arrayContaining([sOwnSharedIdentityAttributeVersion2, sOwnSharedIdentityAttributeVersion2FurtherPeer]));

                const result2 = await services1.consumption.attributes.getSharedVersionsOfAttribute({ attributeId: version.id, onlyLatestVersions: true });
                expect(result2.isSuccess).toBe(true);
                const returnedVersions2 = result2.value;
                expect(returnedVersions2).toStrictEqual(expect.arrayContaining([sOwnSharedIdentityAttributeVersion2, sOwnSharedIdentityAttributeVersion2FurtherPeer]));
            }
        });

        test("should get all shared versions of a repository attribute", async () => {
            for (const version of sRepositoryAttributeVersions) {
                const result = await services1.consumption.attributes.getSharedVersionsOfAttribute({ attributeId: version.id, onlyLatestVersions: false });
                expect(result.isSuccess).toBe(true);

                const returnedVersions = result.value;
                expect(returnedVersions).toStrictEqual(
                    expect.arrayContaining([sOwnSharedIdentityAttributeVersion2, sOwnSharedIdentityAttributeVersion2FurtherPeer, sOwnSharedIdentityAttributeVersion0])
                );
            }
        });

        test("should get only latest shared version of a repository attribute for a specific peer", async () => {
            for (const version of sRepositoryAttributeVersions) {
                const result1 = await services1.consumption.attributes.getSharedVersionsOfAttribute({ attributeId: version.id, peers: [services2.address] });
                expect(result1.isSuccess).toBe(true);
                const returnedVersions1 = result1.value;
                expect(returnedVersions1).toStrictEqual([sOwnSharedIdentityAttributeVersion2]);

                const result2 = await services1.consumption.attributes.getSharedVersionsOfAttribute({ attributeId: version.id, peers: [services3.address] });
                expect(result2.isSuccess).toBe(true);
                const returnedVersions2 = result2.value;
                expect(returnedVersions2).toStrictEqual([sOwnSharedIdentityAttributeVersion2FurtherPeer]);
            }
        });

        test("should get all shared versions of a repository attribute for a specific peer", async () => {
            for (const version of sRepositoryAttributeVersions) {
                const result1 = await services1.consumption.attributes.getSharedVersionsOfAttribute({
                    attributeId: version.id,
                    peers: [services2.address],
                    onlyLatestVersions: false
                });
                expect(result1.isSuccess).toBe(true);
                const returnedVersions1 = result1.value;
                expect(returnedVersions1).toStrictEqual([sOwnSharedIdentityAttributeVersion2, sOwnSharedIdentityAttributeVersion0]);

                const result2 = await services1.consumption.attributes.getSharedVersionsOfAttribute({
                    attributeId: version.id,
                    peers: [services3.address],
                    onlyLatestVersions: false
                });
                expect(result2.isSuccess).toBe(true);
                const returnedVersions2 = result2.value;
                expect(returnedVersions2).toStrictEqual([sOwnSharedIdentityAttributeVersion2FurtherPeer]);
            }
        });

        test("should return all emitted ThirdPartyRelationshipAttributes of a source RelationshipAttribute", async () => {
            await createAndShareRelationshipAttributeVersion0();
            const requestParams = {
                peer: services1.address,
                content: {
                    items: [
                        ReadAttributeRequestItem.from({
                            query: ThirdPartyRelationshipAttributeQuery.from({
                                key: "aKey",
                                owner: ThirdPartyRelationshipAttributeQueryOwner.Recipient,
                                thirdParty: [services2.address]
                            }),
                            mustBeAccepted: true
                        }).toJSON()
                    ]
                }
            };
            const emittedThirdPartyRelationshipAttribute = await executeFullRequestAndAcceptExistingAttributeFlow(
                services1,
                services3,
                requestParams,
                sOwnSharedRelationshipAttributeVersion0.id
            );

            const result = await services1.consumption.attributes.getSharedVersionsOfAttribute({ attributeId: sOwnSharedRelationshipAttributeVersion0.id });
            expect(result.isSuccess).toBe(true);
            const returnedVersions = result.value;
            expect(returnedVersions).toStrictEqual([emittedThirdPartyRelationshipAttribute]);
        });

        test("should return an empty list if a relationship attribute without associated third party relationship attributes is queried", async () => {
            await createAndShareRelationshipAttributeVersion0();
            const result = await services1.consumption.attributes.getSharedVersionsOfAttribute({ attributeId: sOwnSharedRelationshipAttributeVersion0.id });
            expect(result.isSuccess).toBe(true);
            const returnedVersions = result.value;
            expect(returnedVersions).toStrictEqual([]);
        });

        test("should return an empty list calling getSharedVersionsOfAttribute with a nonexistent peer", async () => {
            const result = await services1.consumption.attributes.getSharedVersionsOfAttribute({
                attributeId: sRepositoryAttributeVersion2.id,
                peers: ["did:e:localhost:dids:0000000000000000000000"]
            });
            expect(result.isSuccess).toBe(true);
            const returnedVersions = result.value;
            expect(returnedVersions).toStrictEqual([]);
        });

        test("should throw trying to call getSharedVersionsOfAttribute with a nonexistent attributeId", async () => {
            const result2 = await services1.consumption.attributes.getSharedVersionsOfAttribute({ attributeId: "ATTxxxxxxxxxxxxxxxxx" });
            expect(result2).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });
    });
});

describe("DeleteAttributeUseCases", () => {
    let repositoryAttributeVersion0: LocalAttributeDTO;
    let repositoryAttributeVersion1: LocalAttributeDTO;
    let ownSharedIdentityAttributeVersion0: LocalAttributeDTO;
    let ownSharedIdentityAttributeVersion1: LocalAttributeDTO;

    beforeEach(async () => {
        ownSharedIdentityAttributeVersion0 = await executeFullCreateAndShareRepositoryAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["tag1", "tag2"]
            }
        });
        repositoryAttributeVersion0 = (await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion0.shareInfo!.sourceAttribute! })).value;

        ({ predecessor: ownSharedIdentityAttributeVersion0, successor: ownSharedIdentityAttributeVersion1 } = await executeFullSucceedRepositoryAttributeAndNotifyPeerFlow(
            services1,
            services2,
            {
                predecessorId: ownSharedIdentityAttributeVersion0.shareInfo!.sourceAttribute!,
                successorContent: {
                    value: {
                        "@type": "GivenName",
                        value: "anotherGivenName"
                    }
                }
            }
        ));
        repositoryAttributeVersion1 = (await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion1.shareInfo!.sourceAttribute! })).value;
    });

    describe(DeleteRepositoryAttributeUseCase.name, () => {
        test("should delete a repository attribute", async () => {
            const deletionResult = await services1.consumption.attributes.deleteRepositoryAttribute({ attributeId: repositoryAttributeVersion0.id });
            expect(deletionResult.isSuccess).toBe(true);

            const getDeletedAttributeResult = await services1.consumption.attributes.getAttribute({ id: repositoryAttributeVersion0.id });
            expect(getDeletedAttributeResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("should delete a succeeded repository attribute and its predecessors", async () => {
            const deletionResult = await services1.consumption.attributes.deleteRepositoryAttribute({ attributeId: repositoryAttributeVersion1.id });
            expect(deletionResult.isSuccess).toBe(true);

            const getDeletedAttributeResult = await services1.consumption.attributes.getAttribute({ id: repositoryAttributeVersion0.id });
            expect(getDeletedAttributeResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("should remove 'shareInfo.sourceAttribute' from own shared identity attribute copies of a deleted repository attribute", async () => {
            await services1.consumption.attributes.deleteRepositoryAttribute({ attributeId: repositoryAttributeVersion0.id });

            const updatedOwnSharedIdentityAttributeVersion0Result = await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion0.id });
            expect(updatedOwnSharedIdentityAttributeVersion0Result.isSuccess).toBe(true);
            const updatedOwnSharedIdentityAttributeVersion0 = updatedOwnSharedIdentityAttributeVersion0Result.value;
            expect(updatedOwnSharedIdentityAttributeVersion0.shareInfo).toBeDefined();
            expect(updatedOwnSharedIdentityAttributeVersion0.shareInfo!.sourceAttribute).toBeUndefined();
        });

        test("should remove 'shareInfo.sourceAttribute' from own shared identity attribute predecessors of a deleted repository attribute", async () => {
            await services1.consumption.attributes.deleteRepositoryAttribute({ attributeId: repositoryAttributeVersion1.id });

            const updatedOwnSharedIdentityAttributeVersion0Result = await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion0.id });
            expect(updatedOwnSharedIdentityAttributeVersion0Result.isSuccess).toBe(true);
            const updatedOwnSharedIdentityAttributeVersion0 = updatedOwnSharedIdentityAttributeVersion0Result.value;
            expect(updatedOwnSharedIdentityAttributeVersion0.shareInfo).toBeDefined();
            expect(updatedOwnSharedIdentityAttributeVersion0.shareInfo!.sourceAttribute).toBeUndefined();
        });

        test("should not change type of own shared identity attribute if 'shareInfo.sourceAttribute' is undefined", async () => {
            await services1.consumption.attributes.deleteRepositoryAttribute({ attributeId: repositoryAttributeVersion0.id });

            const updatedOwnSharedIdentityAttributeVersion0 = (await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion0.id })).value;
            expect(updatedOwnSharedIdentityAttributeVersion0.shareInfo!.sourceAttribute).toBeUndefined();

            // isOwnSharedIdentityAttribute
            expect(updatedOwnSharedIdentityAttributeVersion0.content["@type"]).toBe("IdentityAttribute");
            expect(updatedOwnSharedIdentityAttributeVersion0.shareInfo).toBeDefined();
            expect(updatedOwnSharedIdentityAttributeVersion0.content.owner).toBe(services1.address);
            expect(updatedOwnSharedIdentityAttributeVersion0.shareInfo!.peer).toBe(services2.address);
            expect(updatedOwnSharedIdentityAttributeVersion0.isDefault).toBeUndefined();
        });

        test("should set 'succeeds' of successor repository attribute to undefined if predecessor repository attribute is deleted", async () => {
            expect(repositoryAttributeVersion1.succeeds).toBeDefined();
            await services1.consumption.attributes.deleteRepositoryAttribute({ attributeId: repositoryAttributeVersion0.id });
            const updatedRepositoryAttributeVersion1 = (await services1.consumption.attributes.getAttribute({ id: repositoryAttributeVersion1.id })).value;
            expect(updatedRepositoryAttributeVersion1.succeeds).toBeUndefined();
        });

        test("should throw trying to call with an attribute that is not a repository attribute", async () => {
            const result = await services1.consumption.attributes.deleteRepositoryAttribute({ attributeId: ownSharedIdentityAttributeVersion1.id });
            expect(result).toBeAnError(/.*/, "error.runtime.attributes.isNotRepositoryAttribute");
        });

        test("should throw trying to call with an unknown attribute ID", async () => {
            const unknownAttributeId = "ATTxxxxxxxxxxxxxxxxx";
            const result = await services1.consumption.attributes.deleteRepositoryAttribute({ attributeId: unknownAttributeId });
            expect(result).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("should throw trying to call with a child of a complex attribute", async () => {
            const complexAttribute = (
                await services1.consumption.attributes.createRepositoryAttribute({
                    content: {
                        value: {
                            "@type": "StreetAddress",
                            recipient: "aRecipient",
                            street: "aStreet",
                            houseNo: "aHouseNo",
                            zipCode: "aZipCode",
                            city: "aCity",
                            country: "DE"
                        }
                    }
                })
            ).value;

            const childAttributes = (
                await services1.consumption.attributes.getAttributes({
                    query: {
                        parentId: complexAttribute.id
                    }
                })
            ).value;
            expect(childAttributes).toHaveLength(5);

            const result = await services1.consumption.attributes.deleteRepositoryAttribute({ attributeId: childAttributes[0].id });
            expect(result).toBeAnError(
                `Attribute '${childAttributes[0].id.toString()}' is a child of a complex Attribute. If you want to delete it, you must delete its parent.`,
                "error.runtime.attributes.cannotSeparatelyDeleteChildOfComplexAttribute"
            );
        });
    });

    describe(DeleteOwnSharedAttributeAndNotifyPeerUseCase.name, () => {
        test("should delete an own shared identity attribute", async () => {
            expect(ownSharedIdentityAttributeVersion0).toBeDefined();

            const deletionResult = await services1.consumption.attributes.deleteOwnSharedAttributeAndNotifyPeer({ attributeId: ownSharedIdentityAttributeVersion0.id });
            expect(deletionResult.isSuccess).toBe(true);

            const getDeletedAttributeResult = await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion0.id });
            expect(getDeletedAttributeResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("should delete a succeeded own shared identity attribute and its predecessors", async () => {
            expect(ownSharedIdentityAttributeVersion1).toBeDefined();

            const deletionResult = await services1.consumption.attributes.deleteOwnSharedAttributeAndNotifyPeer({ attributeId: ownSharedIdentityAttributeVersion1.id });
            expect(deletionResult.isSuccess).toBe(true);

            const getDeletedPredecessorResult = await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion0.id });
            expect(getDeletedPredecessorResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("should remove 'shareInfo.sourceAttribute' from emitted ThirdPartyRelationshipAttribute copies of a deleted RepositoryAttribute", async () => {
            const ownSharedRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services3, {
                content: {
                    value: {
                        "@type": "ProprietaryString",
                        value: "aStringValue",
                        title: "aTitle"
                    },
                    key: "aKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }
            });

            const requestParams = {
                peer: services1.address,
                content: {
                    items: [
                        ReadAttributeRequestItem.from({
                            query: ThirdPartyRelationshipAttributeQuery.from({
                                key: "aKey",
                                owner: ThirdPartyRelationshipAttributeQueryOwner.Recipient,
                                thirdParty: [services3.address]
                            }),
                            mustBeAccepted: true
                        }).toJSON()
                    ]
                }
            };

            const emittedThirdPartyRelationshipAttribute = await executeFullRequestAndAcceptExistingAttributeFlow(
                services1,
                services2,
                requestParams,
                ownSharedRelationshipAttribute.id
            );

            await services1.consumption.attributes.deleteOwnSharedAttributeAndNotifyPeer({ attributeId: ownSharedRelationshipAttribute.id });

            const updatedEmittedThirdPartyRelationshipAttributeResult = await services1.consumption.attributes.getAttribute({ id: emittedThirdPartyRelationshipAttribute.id });
            expect(updatedEmittedThirdPartyRelationshipAttributeResult.isSuccess).toBe(true);
            const updatedEmittedThirdPartyRelationshipAttribute = updatedEmittedThirdPartyRelationshipAttributeResult.value;
            expect(updatedEmittedThirdPartyRelationshipAttribute.shareInfo).toBeDefined();
            expect(updatedEmittedThirdPartyRelationshipAttribute.shareInfo!.sourceAttribute).toBeUndefined();
        });

        test("should set the 'succeeds' property of the own shared identity attribute successor to undefined", async () => {
            expect(ownSharedIdentityAttributeVersion1.succeeds).toBeDefined();
            await services1.consumption.attributes.deleteOwnSharedAttributeAndNotifyPeer({ attributeId: ownSharedIdentityAttributeVersion0.id });
            const updatedOwnSharedIdentityAttributeVersion1 = (await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion1.id })).value;
            expect(updatedOwnSharedIdentityAttributeVersion1.succeeds).toBeUndefined();
        });

        test("should notify about identity attribute deletion by owner", async () => {
            const notificationId = (await services1.consumption.attributes.deleteOwnSharedAttributeAndNotifyPeer({ attributeId: ownSharedIdentityAttributeVersion0.id })).value
                .notificationId!;
            const timeBeforeUpdate = CoreDate.utc();
            await syncUntilHasMessageWithNotification(services2.transport, notificationId);
            await services2.eventBus.waitForEvent(OwnSharedAttributeDeletedByOwnerEvent, (e) => {
                return e.data.id.toString() === ownSharedIdentityAttributeVersion0.id;
            });
            const timeAfterUpdate = CoreDate.utc();

            const result = await services2.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion0.id });
            expect(result.isSuccess).toBe(true);
            const updatedAttribute = result.value;
            expect(updatedAttribute.deletionInfo?.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByOwner);
            expect(CoreDate.from(updatedAttribute.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))).toBe(true);
        });

        test("should notify about identity attribute deletion of succeeded attribute by owner", async () => {
            const notificationId = (await services1.consumption.attributes.deleteOwnSharedAttributeAndNotifyPeer({ attributeId: ownSharedIdentityAttributeVersion1.id })).value
                .notificationId!;
            const timeBeforeUpdate = CoreDate.utc();
            await syncUntilHasMessageWithNotification(services2.transport, notificationId);
            await services2.eventBus.waitForEvent(OwnSharedAttributeDeletedByOwnerEvent, (e) => {
                return e.data.id.toString() === ownSharedIdentityAttributeVersion1.id;
            });
            const timeAfterUpdate = CoreDate.utc();

            const updatedPredecessor = (await services2.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion0.id })).value;
            expect(updatedPredecessor.deletionInfo?.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByOwner);
            expect(CoreDate.from(updatedPredecessor.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))).toBe(true);
        });

        test("should throw an error trying to delete an own shared Attribute when the Relationship is in status Pending", async () => {
            const [services1, services2] = await runtimeServiceProvider.launch(2, {
                enableRequestModule: true,
                enableDeciderModule: true,
                enableNotificationModule: true
            });

            const repositoryAttribute = (
                await services2.consumption.attributes.createRepositoryAttribute({
                    content: {
                        value: {
                            "@type": "GivenName",
                            value: "aGivenName"
                        }
                    }
                })
            ).value;

            const item: ReadAttributeRequestItemJSON = {
                "@type": "ReadAttributeRequestItem",
                mustBeAccepted: true,
                query: {
                    "@type": "IdentityAttributeQuery",
                    valueType: "GivenName"
                }
            };

            const relationshipTemplateContent: RelationshipTemplateContentJSON = {
                "@type": "RelationshipTemplateContent",
                title: "aTitle",
                onNewRelationship: {
                    items: [item],
                    "@type": "Request"
                }
            };
            await createRelationshipWithStatusPending(services1, services2, relationshipTemplateContent, [
                {
                    accept: true,
                    existingAttributeId: repositoryAttribute.id
                } as AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON
            ]);

            const ownSharedAttribute = await services2.consumption.attributes.getAttributes({
                query: {
                    "shareInfo.sourceAttribute": repositoryAttribute.id
                }
            });

            const attributeDeletionResult = await services2.consumption.attributes.deleteOwnSharedAttributeAndNotifyPeer({ attributeId: ownSharedAttribute.value[0].id });
            expect(attributeDeletionResult).toBeAnError(
                "The shared Attribute cannot be deleted while the Relationship to the peer is in status 'Pending'.",
                "error.runtime.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending"
            );
        });
    });

    describe(DeletePeerSharedAttributeAndNotifyOwnerUseCase.name, () => {
        test("should delete a peer shared identity attribute", async () => {
            const recipientPeerSharedIdentityAttributeVersion0 = (await services2.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion0.id })).value;
            expect(recipientPeerSharedIdentityAttributeVersion0).toBeDefined();

            const deletionResult = await services2.consumption.attributes.deletePeerSharedAttributeAndNotifyOwner({ attributeId: ownSharedIdentityAttributeVersion0.id });
            expect(deletionResult.isSuccess).toBe(true);

            const getDeletedAttributeResult = await services2.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion0.id });
            expect(getDeletedAttributeResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("should delete the predecessor of a peer shared identity attribute", async () => {
            const recipientPeerSharedIdentityAttributeVersion1 = (await services2.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion1.id })).value;
            expect(recipientPeerSharedIdentityAttributeVersion1).toBeDefined();

            const deletionResult = await services2.consumption.attributes.deletePeerSharedAttributeAndNotifyOwner({ attributeId: ownSharedIdentityAttributeVersion1.id });
            expect(deletionResult.isSuccess).toBe(true);

            const getDeletedPredecessorResult = await services2.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion0.id });
            expect(getDeletedPredecessorResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("should remove 'shareInfo.sourceAttribute' from emitted ThirdPartyRelationshipAttribute copies of a deleted peer shared RelationshipAttribute", async () => {
            const peerSharedRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services3, services1, {
                content: {
                    value: {
                        "@type": "ProprietaryString",
                        value: "aStringValue",
                        title: "aTitle"
                    },
                    key: "aKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }
            });

            const requestParams = {
                peer: services1.address,
                content: {
                    items: [
                        ReadAttributeRequestItem.from({
                            query: ThirdPartyRelationshipAttributeQuery.from({
                                key: "aKey",
                                owner: ThirdPartyRelationshipAttributeQueryOwner.ThirdParty,
                                thirdParty: [services3.address]
                            }),
                            mustBeAccepted: true
                        }).toJSON()
                    ]
                }
            };

            const emittedThirdPartyRelationshipAttribute = await executeFullRequestAndAcceptExistingAttributeFlow(
                services1,
                services2,
                requestParams,
                peerSharedRelationshipAttribute.id
            );

            await services1.consumption.attributes.deletePeerSharedAttributeAndNotifyOwner({ attributeId: peerSharedRelationshipAttribute.id });

            const updatedEmittedThirdPartyRelationshipAttributeResult = await services1.consumption.attributes.getAttribute({
                id: emittedThirdPartyRelationshipAttribute.id
            });
            expect(updatedEmittedThirdPartyRelationshipAttributeResult.isSuccess).toBe(true);
            const updatedEmittedThirdPartyRelationshipAttribute = updatedEmittedThirdPartyRelationshipAttributeResult.value;
            expect(updatedEmittedThirdPartyRelationshipAttribute.shareInfo).toBeDefined();
            expect(updatedEmittedThirdPartyRelationshipAttribute.shareInfo!.sourceAttribute).toBeUndefined();
        });

        test("should set the 'succeeds' property of the peer shared identity attribute successor to undefined", async () => {
            const recipientPeerSharedIdentityAttributeVersion1 = (await services2.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion1.id })).value;
            expect(recipientPeerSharedIdentityAttributeVersion1.succeeds).toBeDefined();
            await services2.consumption.attributes.deletePeerSharedAttributeAndNotifyOwner({ attributeId: ownSharedIdentityAttributeVersion0.id });
            const updatedRecipientPeerSharedIdentityAttributeVersion1 = (
                await services2.consumption.attributes.getAttribute({ id: recipientPeerSharedIdentityAttributeVersion1.id })
            ).value;
            expect(updatedRecipientPeerSharedIdentityAttributeVersion1.succeeds).toBeUndefined();
        });

        test("should notify about identity attribute deletion by peer", async () => {
            const notificationId = (await services2.consumption.attributes.deletePeerSharedAttributeAndNotifyOwner({ attributeId: ownSharedIdentityAttributeVersion0.id })).value
                .notificationId!;
            const timeBeforeUpdate = CoreDate.utc();
            await syncUntilHasMessageWithNotification(services1.transport, notificationId);
            await services1.eventBus.waitForEvent(PeerSharedAttributeDeletedByPeerEvent, (e) => {
                return e.data.id.toString() === ownSharedIdentityAttributeVersion0.id;
            });

            const timeAfterUpdate = CoreDate.utc();

            const result = await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion0.id });
            expect(result.isSuccess).toBe(true);
            const updatedAttribute = result.value;
            expect(updatedAttribute.deletionInfo?.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);
            expect(CoreDate.from(updatedAttribute.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))).toBe(true);
        });

        test("should notify about identity attribute deletion of succeeded attribute by peer", async () => {
            const notificationId = (await services2.consumption.attributes.deletePeerSharedAttributeAndNotifyOwner({ attributeId: ownSharedIdentityAttributeVersion1.id })).value
                .notificationId!;
            const timeBeforeUpdate = CoreDate.utc();
            await syncUntilHasMessageWithNotification(services1.transport, notificationId);
            await services1.eventBus.waitForEvent(PeerSharedAttributeDeletedByPeerEvent, (e) => {
                return e.data.id.toString() === ownSharedIdentityAttributeVersion1.id;
            });

            const timeAfterUpdate = CoreDate.utc();

            const updatedPredecessor = (await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion0.id })).value;
            expect(updatedPredecessor.deletionInfo?.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);
            expect(CoreDate.from(updatedPredecessor.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))).toBe(true);
        });

        test("should throw an error trying to delete a peer shared Attribute when the Relationship is in status Pending", async () => {
            const [services1, services2] = await runtimeServiceProvider.launch(2, {
                enableRequestModule: true,
                enableDeciderModule: true,
                enableNotificationModule: true
            });

            const repositoryAttribute = (
                await services1.consumption.attributes.createRepositoryAttribute({
                    content: {
                        value: {
                            "@type": "GivenName",
                            value: "aGivenName"
                        }
                    }
                })
            ).value;

            const item: ShareAttributeRequestItemJSON = {
                "@type": "ShareAttributeRequestItem",
                mustBeAccepted: true,
                attribute: repositoryAttribute.content,
                sourceAttributeId: repositoryAttribute.id
            };

            const relationshipTemplateContent: CreateOwnRelationshipTemplateRequest["content"] = {
                "@type": "RelationshipTemplateContent",
                title: "aTitle",
                onNewRelationship: {
                    items: [item],
                    "@type": "Request"
                }
            };

            await createRelationshipWithStatusPending(services1, services2, relationshipTemplateContent, [
                {
                    accept: true
                } as AcceptRequestItemParametersJSON
            ]);

            const peerSharedAttribute = await services2.consumption.attributes.getAttributes({
                query: {
                    "shareInfo.peer": services1.address
                }
            });

            const attributeDeletionResult = await services2.consumption.attributes.deletePeerSharedAttributeAndNotifyOwner({ attributeId: peerSharedAttribute.value[0].id });
            expect(attributeDeletionResult).toBeAnError(
                "The shared Attribute cannot be deleted while the Relationship to the peer is in status 'Pending'.",
                "error.runtime.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending"
            );
        });
    });

    describe(DeleteThirdPartyRelationshipAttributeAndNotifyPeerUseCase.name, () => {
        let peerSharedRelationshipAttribute: LocalAttributeDTO;
        let emittedThirdPartyRelationshipAttribute: LocalAttributeDTO;
        beforeEach(async () => {
            peerSharedRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services3, services1, {
                content: {
                    value: {
                        "@type": "ProprietaryString",
                        value: "aString",
                        title: "aTitle"
                    },
                    key: "aKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }
            });

            const requestParams = {
                peer: services1.address,
                content: {
                    items: [
                        ReadAttributeRequestItem.from({
                            query: ThirdPartyRelationshipAttributeQuery.from({
                                key: "aKey",
                                owner: ThirdPartyRelationshipAttributeQueryOwner.ThirdParty,
                                thirdParty: [services3.address]
                            }),
                            mustBeAccepted: true
                        }).toJSON()
                    ]
                }
            };

            emittedThirdPartyRelationshipAttribute = await executeFullRequestAndAcceptExistingAttributeFlow(
                services1,
                services2,
                requestParams,
                peerSharedRelationshipAttribute.id
            );
        });

        test("should delete a ThirdPartyRelationshipAttribute as the emitter of it", async () => {
            expect(emittedThirdPartyRelationshipAttribute).toBeDefined();

            const deletionResult = await services1.consumption.attributes.deleteThirdPartyRelationshipAttributeAndNotifyPeer({
                attributeId: emittedThirdPartyRelationshipAttribute.id
            });
            expect(deletionResult.isSuccess).toBe(true);

            const getDeletedAttributeResult = await services1.consumption.attributes.getAttribute({ id: emittedThirdPartyRelationshipAttribute.id });
            expect(getDeletedAttributeResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("should delete a ThirdPartyRelationshipAttribute as the recipient of it", async () => {
            const receivedThirdPartyRelationshipAttribute = (await services2.consumption.attributes.getAttribute({ id: emittedThirdPartyRelationshipAttribute.id })).value;
            expect(receivedThirdPartyRelationshipAttribute).toBeDefined();

            const deletionResult = await services2.consumption.attributes.deleteThirdPartyRelationshipAttributeAndNotifyPeer({
                attributeId: receivedThirdPartyRelationshipAttribute.id
            });
            expect(deletionResult.isSuccess).toBe(true);

            const getDeletedAttributeResult = await services2.consumption.attributes.getAttribute({ id: receivedThirdPartyRelationshipAttribute.id });
            expect(getDeletedAttributeResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("should notify about ThirdPartyRelationshipAttribute as the emitter of it", async () => {
            const notificationId = (
                await services1.consumption.attributes.deleteThirdPartyRelationshipAttributeAndNotifyPeer({ attributeId: emittedThirdPartyRelationshipAttribute.id })
            ).value.notificationId!;
            const timeBeforeUpdate = CoreDate.utc();
            await syncUntilHasMessageWithNotification(services2.transport, notificationId);
            await services2.eventBus.waitForEvent(ThirdPartyRelationshipAttributeDeletedByPeerEvent, (e) => {
                return e.data.id.toString() === emittedThirdPartyRelationshipAttribute.id;
            });

            const timeAfterUpdate = CoreDate.utc();

            const result = await services2.consumption.attributes.getAttribute({ id: emittedThirdPartyRelationshipAttribute.id });
            expect(result.isSuccess).toBe(true);
            const updatedAttribute = result.value;
            expect(updatedAttribute.deletionInfo?.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);
            expect(CoreDate.from(updatedAttribute.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))).toBe(true);
        });

        test("should notify about ThirdPartyRelationshipAttribute as the recipient of it", async () => {
            const notificationId = (
                await services2.consumption.attributes.deleteThirdPartyRelationshipAttributeAndNotifyPeer({ attributeId: emittedThirdPartyRelationshipAttribute.id })
            ).value.notificationId!;
            const timeBeforeUpdate = CoreDate.utc();
            await syncUntilHasMessageWithNotification(services1.transport, notificationId);
            await services1.eventBus.waitForEvent(ThirdPartyRelationshipAttributeDeletedByPeerEvent, (e) => {
                return e.data.id.toString() === emittedThirdPartyRelationshipAttribute.id;
            });

            const timeAfterUpdate = CoreDate.utc();

            const result = await services1.consumption.attributes.getAttribute({ id: emittedThirdPartyRelationshipAttribute.id });
            expect(result.isSuccess).toBe(true);
            const updatedAttribute = result.value;
            expect(updatedAttribute.deletionInfo?.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);
            expect(CoreDate.from(updatedAttribute.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))).toBe(true);
        });

        test("should delete a ThirdPartyRelationshipAttribute as the emitter of it using the deprecated function deleteThirdPartyOwnedRelationshipAttributeAndNotifyPeer", async () => {
            expect(emittedThirdPartyRelationshipAttribute).toBeDefined();

            const deletionResult = await services1.consumption.attributes.deleteThirdPartyOwnedRelationshipAttributeAndNotifyPeer({
                attributeId: emittedThirdPartyRelationshipAttribute.id
            });
            expect(deletionResult.isSuccess).toBe(true);

            const getDeletedAttributeResult = await services1.consumption.attributes.getAttribute({ id: emittedThirdPartyRelationshipAttribute.id });
            expect(getDeletedAttributeResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("should throw an error trying to delete a ThirdPartyRelationshipAttribute when the Relationship is in status Pending", async () => {
            const [services1, services2, services3] = await runtimeServiceProvider.launch(3, {
                enableRequestModule: true,
                enableDeciderModule: true,
                enableNotificationModule: true
            });
            await establishRelationship(services1.transport, services2.transport);
            const peerSharedRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services2, services1, {
                content: {
                    value: {
                        "@type": "ProprietaryString",
                        value: "aString",
                        title: "aTitle"
                    },
                    key: "aKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }
            });

            const item: ShareAttributeRequestItemJSON = {
                "@type": "ShareAttributeRequestItem",
                mustBeAccepted: true,
                attribute: peerSharedRelationshipAttribute.content,
                sourceAttributeId: peerSharedRelationshipAttribute.id,
                thirdPartyAddress: services1.address
            };

            const relationshipTemplateContent: CreateOwnRelationshipTemplateRequest["content"] = {
                "@type": "RelationshipTemplateContent",
                title: "aTitle",
                onNewRelationship: {
                    items: [item],
                    "@type": "Request"
                }
            };

            await createRelationshipWithStatusPending(services2, services3, relationshipTemplateContent, [
                {
                    accept: true
                } as AcceptRequestItemParametersJSON
            ]);

            const thirdPartyRelationshipAttribute = await services3.consumption.attributes.getAttributes({
                query: {
                    "shareInfo.peer": services2.address
                }
            });
            const attributeDeletionResult = await services3.consumption.attributes.deletePeerSharedAttributeAndNotifyOwner({
                attributeId: thirdPartyRelationshipAttribute.value[0].id
            });
            expect(attributeDeletionResult).toBeAnError(
                "The shared Attribute cannot be deleted while the Relationship to the peer is in status 'Pending'.",
                "error.runtime.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending"
            );
        });
    });
});

describe("ThirdPartyRelationshipAttributes", () => {
    let localAttribute: LocalAttributeDTO;
    beforeEach(async () => {
        localAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
            content: {
                key: "ThirdPartyKey",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "ThirdPartyValue",
                    title: "ThirdPartyTitle"
                },
                isTechnical: true
            }
        });
    });

    test("should share a RelationshipAttribute that was created by the sharing identity", async () => {
        const localThirdPartyAttribute = await executeFullShareAndAcceptAttributeRequestFlow(
            services1,
            services3,
            ShareAttributeRequestItem.from({
                attribute: localAttribute.content,
                sourceAttributeId: localAttribute.id,
                thirdPartyAddress: services2.address,
                mustBeAccepted: true
            })
        );

        const services1AttributesResult = (await services1.consumption.attributes.getAttribute({ id: localThirdPartyAttribute.id })).value;
        const services3AttributesResult = (await services3.consumption.attributes.getAttribute({ id: localThirdPartyAttribute.id })).value;

        expect(services1AttributesResult.shareInfo!.thirdPartyAddress).toStrictEqual(services2.address);
        expect(services3AttributesResult.shareInfo!.thirdPartyAddress).toStrictEqual(services2.address);
    });

    test("should share a RelationshipAttribute that was shared with the sharing identity", async () => {
        const localThirdPartyAttribute = await executeFullShareAndAcceptAttributeRequestFlow(
            services2,
            services3,
            ShareAttributeRequestItem.from({
                attribute: localAttribute.content,
                sourceAttributeId: localAttribute.id,
                thirdPartyAddress: services1.address,
                mustBeAccepted: true
            })
        );

        const services2AttributesResult = (await services2.consumption.attributes.getAttribute({ id: localThirdPartyAttribute.id })).value;
        const services3AttributesResult = (await services3.consumption.attributes.getAttribute({ id: localThirdPartyAttribute.id })).value;

        expect(services2AttributesResult.shareInfo!.thirdPartyAddress).toStrictEqual(services1.address);
        expect(services3AttributesResult.shareInfo!.thirdPartyAddress).toStrictEqual(services1.address);
    });

    test("should request a ThirdPartyRelationshipAttribute from the initial owner", async () => {
        const localThirdPartyAttribute = await executeFullRequestAndAcceptExistingAttributeFlow(
            services1,
            services3,
            {
                peer: services1.address,
                content: {
                    items: [
                        ReadAttributeRequestItem.from({
                            query: ThirdPartyRelationshipAttributeQuery.from({
                                key: "ThirdPartyKey",
                                owner: ThirdPartyRelationshipAttributeQueryOwner.Recipient,
                                thirdParty: [services2.address]
                            }),
                            mustBeAccepted: true
                        }).toJSON()
                    ]
                }
            },
            localAttribute.id
        );
        const services1AttributesResult = (await services1.consumption.attributes.getAttribute({ id: localThirdPartyAttribute.id })).value;
        const services3AttributesResult = (await services3.consumption.attributes.getAttribute({ id: localThirdPartyAttribute.id })).value;

        expect(services1AttributesResult.shareInfo!.thirdPartyAddress).toStrictEqual(services2.address);
        expect(services3AttributesResult.shareInfo!.thirdPartyAddress).toStrictEqual(services2.address);
    });

    test("should request a ThirdPartyRelationshipAttribute from the initial peer", async () => {
        const localThirdPartyAttribute = await executeFullRequestAndAcceptExistingAttributeFlow(
            services2,
            services3,
            {
                peer: services2.address,
                content: {
                    items: [
                        ReadAttributeRequestItem.from({
                            query: ThirdPartyRelationshipAttributeQuery.from({
                                key: "ThirdPartyKey",
                                owner: ThirdPartyRelationshipAttributeQueryOwner.ThirdParty,
                                thirdParty: [services1.address]
                            }),
                            mustBeAccepted: true
                        }).toJSON()
                    ]
                }
            },
            localAttribute.id
        );
        const services2AttributesResult = (await services2.consumption.attributes.getAttribute({ id: localThirdPartyAttribute.id })).value;
        const services3AttributesResult = (await services3.consumption.attributes.getAttribute({ id: localThirdPartyAttribute.id })).value;

        expect(services2AttributesResult.shareInfo!.thirdPartyAddress).toStrictEqual(services1.address);
        expect(services3AttributesResult.shareInfo!.thirdPartyAddress).toStrictEqual(services1.address);
    });
});

describe(SetAttributeDeletionInfoOfDeletionProposedRelationshipUseCase.name, () => {
    let services1: TestRuntimeServices;
    let services2: TestRuntimeServices;
    let relationshipId: string;

    beforeEach(async () => {
        [services1, services2] = await runtimeServiceProvider.launch(2, { enableRequestModule: true, enableDeciderModule: true, enableNotificationModule: true });
        const relationship = await ensureActiveRelationship(services1.transport, services2.transport);
        relationshipId = relationship.id;
    }, 30000);

    test("peer shared Attributes should be marked as deleted for peer", async () => {
        await executeFullCreateAndShareRepositoryAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenNameServices1"
                }
            }
        });

        await services1.transport.relationships.terminateRelationship({ relationshipId });
        await services1.transport.relationships.decomposeRelationship({ relationshipId });
        await syncUntilHasRelationships(services2.transport);
        await services2.eventBus.waitForEvent(RelationshipChangedEvent, (e) => e.data.status === RelationshipStatus.DeletionProposed);

        const result = await services2.consumption.attributes.setAttributeDeletionInfoOfDeletionProposedRelationship({ relationshipId });
        expect(result).toBeSuccessful();

        const peerSharedAttributes = (await services2.consumption.attributes.getPeerSharedAttributes({ peer: services1.address })).value;
        expect(peerSharedAttributes).toHaveLength(1);
        expect(peerSharedAttributes[0].deletionInfo!.deletionStatus).toBe(LocalAttributeDeletionStatus.DeletedByOwner);

        const relationship = (await services2.transport.relationships.getRelationship({ id: relationshipId })).value;
        const deletionDate = relationship.auditLog[relationship.auditLog.length - 1].createdAt;
        expect(peerSharedAttributes[0].deletionInfo!.deletionDate).toStrictEqual(deletionDate);
    });

    test("own shared Attributes should be marked as deleted for peer", async () => {
        await executeFullCreateAndShareRepositoryAttributeFlow(services2, services1, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenNameServices2"
                }
            }
        });

        await services1.transport.relationships.terminateRelationship({ relationshipId });
        await services1.transport.relationships.decomposeRelationship({ relationshipId });
        await syncUntilHasRelationships(services2.transport);
        await services2.eventBus.waitForEvent(RelationshipChangedEvent, (e) => e.data.status === RelationshipStatus.DeletionProposed);

        const result = await services2.consumption.attributes.setAttributeDeletionInfoOfDeletionProposedRelationship({ relationshipId });
        expect(result).toBeSuccessful();

        const ownSharedAttributes = (await services2.consumption.attributes.getOwnSharedAttributes({ peer: services1.address })).value;
        expect(ownSharedAttributes).toHaveLength(1);
        expect(ownSharedAttributes[0].deletionInfo!.deletionStatus).toBe(LocalAttributeDeletionStatus.DeletedByPeer);

        const relationship = (await services2.transport.relationships.getRelationship({ id: relationshipId })).value;
        const deletionDate = relationship.auditLog[relationship.auditLog.length - 1].createdAt;
        expect(ownSharedAttributes[0].deletionInfo!.deletionDate).toStrictEqual(deletionDate);
    });

    test("peer shared Attributes should not be updated if they are already marked as deleted", async () => {
        const sharedAttribute = await executeFullCreateAndShareRepositoryAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenNameServices1"
                }
            }
        });

        const notificationId = (await services1.consumption.attributes.deleteOwnSharedAttributeAndNotifyPeer({ attributeId: sharedAttribute.id })).value.notificationId!;
        await syncUntilHasMessageWithNotification(services2.transport, notificationId);
        await services2.eventBus.waitForEvent(OwnSharedAttributeDeletedByOwnerEvent, (e) => {
            return e.data.id.toString() === sharedAttribute.id;
        });

        const peerSharedAttributeAfterDeletion = (await services2.consumption.attributes.getAttribute({ id: sharedAttribute.id })).value;
        const dateOfAttributeDeletion = peerSharedAttributeAfterDeletion.deletionInfo!.deletionDate;
        expect(dateOfAttributeDeletion).toBeDefined();

        await services1.transport.relationships.terminateRelationship({ relationshipId });
        await services1.transport.relationships.decomposeRelationship({ relationshipId });
        await syncUntilHasRelationships(services2.transport);
        await services2.eventBus.waitForEvent(RelationshipChangedEvent, (e) => e.data.status === RelationshipStatus.DeletionProposed);

        const result = await services2.consumption.attributes.setAttributeDeletionInfoOfDeletionProposedRelationship({ relationshipId });
        expect(result).toBeSuccessful();

        const peerSharedAttributeAfterDecomposition = (await services2.consumption.attributes.getAttribute({ id: sharedAttribute.id })).value;
        expect(peerSharedAttributeAfterDecomposition.deletionInfo!.deletionStatus).toBe(LocalAttributeDeletionStatus.DeletedByOwner);
        expect(peerSharedAttributeAfterDecomposition.deletionInfo!.deletionDate).toStrictEqual(dateOfAttributeDeletion);
    });

    test("own shared Attributes should not be updated if they are already marked as deleted", async () => {
        const sharedAttribute = await executeFullCreateAndShareRepositoryAttributeFlow(services2, services1, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenNameServices2"
                }
            }
        });

        const notificationId = (await services1.consumption.attributes.deletePeerSharedAttributeAndNotifyOwner({ attributeId: sharedAttribute.id })).value.notificationId!;
        await syncUntilHasMessageWithNotification(services2.transport, notificationId);
        await services2.eventBus.waitForEvent(PeerSharedAttributeDeletedByPeerEvent, (e) => {
            return e.data.id.toString() === sharedAttribute.id;
        });

        const ownSharedAttributeAfterDeletion = (await services2.consumption.attributes.getAttribute({ id: sharedAttribute.id })).value;
        const dateOfAttributeDeletion = ownSharedAttributeAfterDeletion.deletionInfo!.deletionDate;
        expect(dateOfAttributeDeletion).toBeDefined();

        await services1.transport.relationships.terminateRelationship({ relationshipId });
        await services1.transport.relationships.decomposeRelationship({ relationshipId });
        await syncUntilHasRelationships(services2.transport);
        await services2.eventBus.waitForEvent(RelationshipChangedEvent, (e) => e.data.status === RelationshipStatus.DeletionProposed);

        const result = await services2.consumption.attributes.setAttributeDeletionInfoOfDeletionProposedRelationship({ relationshipId });
        expect(result).toBeSuccessful();

        const ownSharedAttributeAfterDecomposition = (await services2.consumption.attributes.getAttribute({ id: sharedAttribute.id })).value;
        expect(ownSharedAttributeAfterDecomposition.deletionInfo!.deletionStatus).toBe(LocalAttributeDeletionStatus.DeletedByPeer);
        expect(ownSharedAttributeAfterDecomposition.deletionInfo!.deletionDate).toStrictEqual(dateOfAttributeDeletion);
    });

    test("should return an error if there is no matching Relationship", async () => {
        await services1.transport.relationships.terminateRelationship({ relationshipId });
        await services1.transport.relationships.decomposeRelationship({ relationshipId });

        const result = await services1.consumption.attributes.setAttributeDeletionInfoOfDeletionProposedRelationship({ relationshipId });
        expect(result).toBeAnError("'Relationship' not found.", "error.transport.recordNotFound");
    });

    test("should return an error if the Relationship doesn't have status 'DeletionProposed'", async () => {
        const result = await services2.consumption.attributes.setAttributeDeletionInfoOfDeletionProposedRelationship({ relationshipId });
        expect(result).toBeAnError(
            "In order to manually set the deletionInfo of an Attribute, the corresponding Relationship must have status 'DeletionProposed'.",
            "error.consumption.attributes.wrongRelationshipStatusToSetDeletionInfo"
        );
    });
});

describe(MarkAttributeAsViewedUseCase.name, () => {
    test("should mark an Attribute as viewed", async () => {
        const request: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                }
            }
        };
        const localAttribute = (await services1.consumption.attributes.createRepositoryAttribute(request)).value;
        expect(localAttribute.wasViewedAt).toBeUndefined();

        const expectedViewingTime = CoreDate.utc();
        const updatedLocalAttribute = (await services1.consumption.attributes.markAttributeAsViewed({ attributeId: localAttribute.id })).value;

        expect(updatedLocalAttribute.wasViewedAt).toBeDefined();
        const actualViewingTime = CoreDate.from(updatedLocalAttribute.wasViewedAt!);
        expect(actualViewingTime.isSameOrAfter(expectedViewingTime)).toBe(true);

        await expect(services1.eventBus).toHavePublished(AttributeWasViewedAtChangedEvent, (m) => m.data.id === localAttribute.id);
    });
});
