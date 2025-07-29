import { AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON, AcceptRequestItemParametersJSON } from "@nmshd/consumption";
import {
    DeleteAttributeRequestItem,
    GivenNameJSON,
    ReadAttributeRequestItem,
    ReadAttributeRequestItemJSON,
    RelationshipAttributeConfidentiality,
    RelationshipTemplateContentJSON,
    ShareAttributeRequestItem,
    ShareAttributeRequestItemJSON,
    ThirdPartyRelationshipAttributeQuery,
    ThirdPartyRelationshipAttributeQueryOwner
} from "@nmshd/content";
import { CoreDate, CoreId, CoreIdHelper } from "@nmshd/core-types";
import assert from "assert";
import {
    AttributeCreatedEvent,
    AttributeWasViewedAtChangedEvent,
    CanCreateOwnIdentityAttributeRequest,
    CanCreateOwnIdentityAttributeUseCase,
    ChangeDefaultOwnIdentityAttributeUseCase,
    CreateAndShareRelationshipAttributeRequest,
    CreateAndShareRelationshipAttributeUseCase,
    CreateOwnIdentityAttributeRequest,
    CreateOwnIdentityAttributeUseCase,
    CreateOwnRelationshipTemplateRequest,
    DeleteOwnIdentityAttributeAndNotifyPeersUseCase,
    DeleteOwnRelationshipAttributeAndNotifyPeersUseCase,
    DeletePeerIdentityAttributeAndNotifyOwnerUseCase,
    DeleteThirdPartyRelationshipAttributeAndNotifyPeerUseCase,
    ExecuteIdentityAttributeQueryUseCase,
    ExecuteRelationshipAttributeQueryUseCase,
    ExecuteThirdPartyRelationshipAttributeQueryUseCase,
    GetAttributeUseCase,
    GetAttributesUseCase,
    GetOwnAttributesSharedWithPeerUseCase,
    GetOwnIdentityAttributesUseCase,
    GetPeerAttributesUseCase,
    GetSharedVersionsOfAttributeUseCase,
    GetVersionsOfAttributeUseCase,
    LocalAttributeDTO,
    LocalAttributeDeletionStatus,
    MarkAttributeAsViewedUseCase,
    NotifyPeerAboutOwnIdentityAttributeSuccessionUseCase,
    OwnSharedAttributeDeletedByOwnerEvent,
    PeerSharedAttributeDeletedByPeerEvent,
    RelationshipChangedEvent,
    RelationshipStatus,
    RepositoryAttributeSucceededEvent,
    SetAttributeDeletionInfoOfDeletionProposedRelationshipUseCase,
    ShareOwnIdentityAttributeRequest,
    ShareOwnIdentityAttributeUseCase,
    SucceedOwnIdentityAttributeRequest,
    SucceedOwnIdentityAttributeUseCase,
    SucceedRelationshipAttributeAndNotifyPeerUseCase,
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
    executeFullCreateAndShareOwnIdentityAttributeFlow,
    executeFullCreateAndShareRelationshipAttributeFlow,
    executeFullNotifyPeerAboutAttributeSuccessionFlow,
    executeFullRequestAndAcceptExistingAttributeFlow,
    executeFullShareAndAcceptAttributeRequestFlow,
    executeFullShareOwnIdentityAttributeFlow,
    executeFullSucceedOwnIdentityAttributeAndNotifyPeerFlow,
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
        const senderRequests: CreateOwnIdentityAttributeRequest[] = [
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
            const identityAttribute = (await services1.consumption.attributes.createOwnIdentityAttribute(request)).value;
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
            const appAttribute = (await appService.consumption.attributes.createOwnIdentityAttribute(request)).value;
            appAttributeIds.push(appAttribute.id);
        }
    });

    describe(GetAttributeUseCase.name, () => {
        test("should allow to get an Attribute by id", async function () {
            const result = await services1.consumption.attributes.getAttribute({ id: relationshipAttributeId });
            expect(result).toBeSuccessful();
            const receivedAttributeId = result.value.id;
            expect(receivedAttributeId).toStrictEqual(relationshipAttributeId);
        });
    });

    describe(GetAttributesUseCase.name, () => {
        test("should list all Attributes with empty query", async () => {
            const result = await services1.consumption.attributes.getAttributes({ query: {} });
            expect(result).toBeSuccessful();
            const attributes = result.value;
            expect(attributes).toHaveLength(4);
            const attributeIds = attributes.map((attribute) => attribute.id);
            expect(attributeIds).toContain(relationshipAttributeId);
            expect(attributeIds).toStrictEqual(expect.arrayContaining(identityAttributeIds));
        });

        test("should allow to get an Attribute by value type", async function () {
            const result = await services1.consumption.attributes.getAttributes({
                query: { "content.value.@type": "GivenName" }
            });

            expect(result).toBeSuccessful();

            const attributes = result.value;
            expect(attributes).toHaveLength(1);
            expect(attributes[0].id).toStrictEqual(identityAttributeIds[0]);
        });

        test("should allow to get an Attribute by multiple value types", async function () {
            const result = await services1.consumption.attributes.getAttributes({
                query: { "content.value.@type": ["Surname", "GivenName"] }
            });

            expect(result).toBeSuccessful();

            const attributes = result.value;
            expect(attributes).toHaveLength(3);

            const attributeIds = attributes.map((attribute) => attribute.id);
            expect(attributeIds).toStrictEqual(expect.arrayContaining(identityAttributeIds));
        });

        test("should hide technical Attributes when hideTechnical=true", async () => {
            const result = await services1.consumption.attributes.getAttributes({ query: {}, hideTechnical: true });
            expect(result).toBeSuccessful();
            const attributes = result.value;
            expect(attributes.filter((a) => a.id === relationshipAttributeId)).toHaveLength(0);
            expect(attributes).toHaveLength(3);
            const attributeIds = attributes.map((attribute) => attribute.id);
            expect(attributeIds).toStrictEqual(identityAttributeIds);
        });

        test("should return technical Attributes when hideTechnical=false", async () => {
            const getAttributesResponse = await services1.consumption.attributes.getAttributes({ query: {}, hideTechnical: false });
            expect(getAttributesResponse.isSuccess).toBe(true);
            const attributes = getAttributesResponse.value;
            expect(attributes.filter((a) => a.id === relationshipAttributeId)).toHaveLength(1);
            expect(attributes).toHaveLength(4);
            const attributeIds = attributes.map((attribute) => attribute.id);
            expect(attributeIds).toContain(relationshipAttributeId);
            expect(attributeIds).toStrictEqual(expect.arrayContaining(identityAttributeIds));
        });

        test("should allow to get only default own IdentityAttributes", async function () {
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

        test("should allow get Attributes that are not default own IdentityAttributes", async function () {
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
    let ownIdentityAttribute: LocalAttributeDTO;
    let ownRelationshipAttribute: LocalAttributeDTO;

    beforeEach(async function () {
        const createOwnIdentityAttributeRequest: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "PhoneNumber",
                    value: "012345678910"
                }
            }
        };
        ownIdentityAttribute = (await services1.consumption.attributes.createOwnIdentityAttribute(createOwnIdentityAttributeRequest)).value;

        ownRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
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
        test("should allow to execute an IdentityAttributeQuery", async function () {
            const result = await services1.consumption.attributes.executeIdentityAttributeQuery({ query: { "@type": "IdentityAttributeQuery", valueType: "PhoneNumber" } });
            expect(result).toBeSuccessful();
            const receivedAttributes = result.value;
            const receivedAttributeIds = receivedAttributes.map((attribute) => attribute.id);
            expect(receivedAttributeIds.sort()).toStrictEqual([ownIdentityAttribute.id]);
        });
    });

    describe(ExecuteRelationshipAttributeQueryUseCase.name, () => {
        test("should allow to execute a RelationshipAttributeQuery", async function () {
            const result = await services1.consumption.attributes.executeRelationshipAttributeQuery({
                query: {
                    "@type": "RelationshipAttributeQuery",
                    key: "website",
                    owner: services1.address,
                    attributeCreationHints: { valueType: "ProprietaryString", title: "AnAttributeHint", confidentiality: RelationshipAttributeConfidentiality.Protected }
                }
            });
            expect(result).toBeSuccessful();
            const receivedAttribute = result.value;
            expect(receivedAttribute.id).toStrictEqual(ownRelationshipAttribute.id);
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
            expect(receivedAttribute[0].id).toStrictEqual(ownRelationshipAttribute.id);
        });
    });
});

describe("get own IdentityAttributes, own Attributes shared with peer and peer Attributes", () => {
    // own = services1, peer = services 2
    let services1OwnSurnameV0: LocalAttributeDTO;
    let services1OwnSurnameV1: LocalAttributeDTO;

    let services1OwnGivenNameV0: LocalAttributeDTO;
    let services1OwnGivenNameV1: LocalAttributeDTO;

    let services1OwnRelationshipAttributeV0: LocalAttributeDTO;
    let services1OwnRelationshipAttributeV1: LocalAttributeDTO;

    let services1TechnicalOwnRelationshipAttribute: LocalAttributeDTO;

    beforeEach(async function () {
        services1OwnSurnameV0 = (
            await services1.consumption.attributes.createOwnIdentityAttribute({
                content: {
                    value: {
                        "@type": "Surname",
                        value: "A surname"
                    }
                }
            })
        ).value;

        ({ predecessor: services1OwnSurnameV0, successor: services1OwnSurnameV1 } = (
            await services1.consumption.attributes.succeedOwnIdentityAttribute({
                predecessorId: services1OwnSurnameV0.id,
                successorContent: {
                    value: {
                        "@type": "Surname",
                        value: "Another surname"
                    }
                }
            })
        ).value);

        services1OwnGivenNameV0 = await executeFullCreateAndShareOwnIdentityAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "A given name"
                }
            }
        });

        ({ predecessor: services1OwnGivenNameV0, successor: services1OwnGivenNameV1 } = await executeFullSucceedOwnIdentityAttributeAndNotifyPeerFlow(services1, services2, {
            predecessorId: services1OwnGivenNameV0.id,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Another given name"
                }
            }
        }));

        await executeFullCreateAndShareOwnIdentityAttributeFlow(services2, services1, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "A peer name"
                }
            }
        });

        services1OwnRelationshipAttributeV0 = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
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

        ({ predecessor: services1OwnRelationshipAttributeV0, successor: services1OwnRelationshipAttributeV1 } = (
            await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
                predecessorId: services1OwnRelationshipAttributeV0.id,
                successorContent: {
                    value: {
                        "@type": "ProprietaryString",
                        value: "another String",
                        title: "another title"
                    }
                }
            })
        ).value);

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

        services1TechnicalOwnRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
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

    describe(GetOwnIdentityAttributesUseCase.name, () => {
        test("get only latest version of own IdentityAttributes", async () => {
            const result = await services1.consumption.attributes.getOwnIdentityAttributes({});
            expect(result).toBeSuccessful();
            const ownIdentityAttributes = result.value;
            expect(ownIdentityAttributes).toStrictEqual([services1OwnSurnameV1, services1OwnGivenNameV1]);
        });

        test("get all versions of own IdentityAttributes", async () => {
            const result = await services1.consumption.attributes.getOwnIdentityAttributes({ onlyLatestVersions: false });
            expect(result).toBeSuccessful();
            const ownIdentityAttributes = result.value;
            expect(ownIdentityAttributes).toStrictEqual([services1OwnSurnameV0, services1OwnSurnameV1, services1OwnGivenNameV0, services1OwnGivenNameV1]);
        });

        test("should allow to get only default attributes", async function () {
            const defaultGivenName = (
                await appService.consumption.attributes.createOwnIdentityAttribute({
                    content: {
                        value: {
                            "@type": "GivenName",
                            value: "aGivenName"
                        }
                    }
                })
            ).value;

            const defaultSurname = (
                await appService.consumption.attributes.createOwnIdentityAttribute({
                    content: {
                        value: {
                            "@type": "Surname",
                            value: "aSurname"
                        }
                    }
                })
            ).value;

            const otherSurname = (
                await appService.consumption.attributes.createOwnIdentityAttribute({
                    content: {
                        value: {
                            "@type": "Surname",
                            value: "AnotherSurname"
                        }
                    }
                })
            ).value;

            const result = await appService.consumption.attributes.getOwnIdentityAttributes({
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

    describe(GetOwnAttributesSharedWithPeerUseCase.name, () => {
        test("should return only latest versions of own Attributes shared with peer", async function () {
            const requests = [{ peer: services2.address }, { peer: services2.address, onlyLatestVersions: true }, { peer: services2.address, hideTechnical: false }];
            for (const request of requests) {
                const result = await services1.consumption.attributes.getOwnAttributesSharedWithPeer(request);
                expect(result).toBeSuccessful();
                const ownAttributesSharedWithPeer = result.value;
                expect(ownAttributesSharedWithPeer).toStrictEqual([services1OwnGivenNameV1, services1OwnRelationshipAttributeV1, services1TechnicalOwnRelationshipAttribute]);
            }
        });

        test("should return all version of own Attributes shared with peer", async function () {
            const result = await services1.consumption.attributes.getOwnAttributesSharedWithPeer({ peer: services2.address, onlyLatestVersions: false });
            expect(result).toBeSuccessful();
            const ownAttributesSharedWithPeer = result.value;
            expect(ownAttributesSharedWithPeer).toStrictEqual([
                services1OwnGivenNameV0,
                services1OwnGivenNameV1,
                services1OwnRelationshipAttributeV0,
                services1OwnRelationshipAttributeV1,
                services1TechnicalOwnRelationshipAttribute
            ]);
        });

        test("should hide technical own Attributes shared with peer when hideTechnical=true", async () => {
            const result = await services1.consumption.attributes.getOwnAttributesSharedWithPeer({ peer: services2.address, hideTechnical: true });
            expect(result).toBeSuccessful();
            const ownAttributesSharedWithPeer = result.value;
            expect(ownAttributesSharedWithPeer).toStrictEqual([services1OwnGivenNameV1, services1OwnRelationshipAttributeV1]);
        });
    });

    describe(GetPeerAttributesUseCase.name, () => {
        // point of view of services 2 => own shared attributes are peer shared attributes
        let allReceivedAttributes: LocalAttributeDTO[];
        let onlyLatestReceivedAttributes: LocalAttributeDTO[];
        let notTechnicalReceivedAttributes: LocalAttributeDTO[];
        beforeEach(async function () {
            const services1SharedAttributeIds = [
                services1OwnGivenNameV0,
                services1OwnGivenNameV1,
                services1OwnRelationshipAttributeV0,
                services1OwnRelationshipAttributeV1,
                services1TechnicalOwnRelationshipAttribute
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

        test("should return only latest shared versions of peer Attributes", async () => {
            const requests = [{ peer: services1.address }, { peer: services1.address, onlyLatestVersions: true }, { peer: services1.address, hideTechnical: false }];
            for (const request of requests) {
                const result = await services2.consumption.attributes.getPeerAttributes(request);
                expect(result).toBeSuccessful();
                const peerAttributes = result.value;
                expect(peerAttributes).toStrictEqual(onlyLatestReceivedAttributes);
            }
        });

        test("should return all versions of peer Attributes", async () => {
            const result = await services2.consumption.attributes.getPeerAttributes({ peer: services1.address, onlyLatestVersions: false });
            expect(result).toBeSuccessful();
            const peerAttributes = result.value;
            expect(peerAttributes).toStrictEqual(allReceivedAttributes);
        });

        test("should hide technical peer Attributes when hideTechnical=true", async () => {
            const result = await services2.consumption.attributes.getPeerAttributes({ peer: services1.address, hideTechnical: true, onlyLatestVersions: false });
            expect(result).toBeSuccessful();
            const peerAttributes = result.value;
            expect(peerAttributes).toStrictEqual(notTechnicalReceivedAttributes);
        });
    });
});

describe(CanCreateOwnIdentityAttributeUseCase.name, () => {
    const canCreateRepositoryAttributeRequest: CanCreateOwnIdentityAttributeRequest = {
        content: {
            value: {
                "@type": "GivenName",
                value: "aGivenName"
            },
            tags: ["x:tag1", "x:tag2"]
        }
    };

    describe("validation errors for the attribute content", () => {
        test("should not allow to create a number as GivenName", async () => {
            const request: CanCreateOwnIdentityAttributeRequest = {
                content: {
                    value: {
                        "@type": "GivenName",
                        value: 5
                    },
                    tags: ["x:tag1", "x:tag2"]
                } as any
            };
            const result = await services1.consumption.attributes.canCreateOwnIdentityAttribute(request);

            assert(!result.value.isSuccess);

            expect(result.value.isSuccess).toBe(false);
            expect(result.value.message).toBe("GivenName :: value must be string");
            expect(result.value.code).toBe("error.runtime.validation.invalidPropertyValue");
        });

        test("should not allow to create a string as year of BirthDate", async () => {
            const request: CanCreateOwnIdentityAttributeRequest = {
                content: {
                    value: {
                        "@type": "BirthDate",
                        day: 5,
                        month: 5,
                        year: "a-string"
                    },
                    tags: ["x:tag1", "x:tag2"]
                } as any
            };
            const result = await services1.consumption.attributes.canCreateOwnIdentityAttribute(request);

            assert(!result.value.isSuccess);

            expect(result.value.isSuccess).toBe(false);
            expect(result.value.message).toBe("BirthDate :: year must be number");
            expect(result.value.code).toBe("error.runtime.validation.invalidPropertyValue");
        });

        test("should not allow to create a BirthDate with a missing year", async () => {
            const request: CanCreateOwnIdentityAttributeRequest = {
                content: {
                    value: {
                        "@type": "BirthDate",
                        day: 5,
                        month: 5
                    },
                    tags: ["x:tag1", "x:tag2"]
                } as any
            };
            const result = await services1.consumption.attributes.canCreateOwnIdentityAttribute(request);

            assert(!result.value.isSuccess);

            expect(result.value.isSuccess).toBe(false);
            expect(result.value.message).toBe("BirthDate :: must have required property 'year'");
            expect(result.value.code).toBe("error.runtime.validation.invalidPropertyValue");
        });

        test("should not allow to create 14 as BirthMonth", async () => {
            const request: CanCreateOwnIdentityAttributeRequest = {
                content: {
                    value: {
                        "@type": "BirthDate",
                        day: 14,
                        month: 14,
                        year: 1990
                    },
                    tags: ["x:tag1", "x:tag2"]
                }
            };
            const result = await services1.consumption.attributes.canCreateOwnIdentityAttribute(request);

            assert(!result.value.isSuccess);

            expect(result.value.isSuccess).toBe(false);
            expect(result.value.message).toBe("BirthMonth.value:Number :: must be an integer value between 1 and 12");
            expect(result.value.code).toBe("error.runtime.validation.invalidPropertyValue");
        });

        test("should not allow to accept an additional property", async () => {
            const request: CanCreateOwnIdentityAttributeRequest = {
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName",
                        additionalProperty: 1
                    },
                    tags: ["x:tag1", "x:tag2"]
                } as any
            };
            const result = await services1.consumption.attributes.canCreateOwnIdentityAttribute(request);

            assert(!result.value.isSuccess);

            expect(result.value.isSuccess).toBe(false);
            expect(result.value.message).toBe("GivenName :: must NOT have additional properties");
            expect(result.value.code).toBe("error.runtime.validation.invalidPropertyValue");
        });

        test("should not allow to accept an invalid @type", async () => {
            const request: CanCreateOwnIdentityAttributeRequest = {
                content: {
                    value: {
                        "@type": "invalid-type"
                    }
                }
            } as any;
            const result = await services1.consumption.attributes.canCreateOwnIdentityAttribute(request);

            assert(!result.value.isSuccess);

            expect(result.value.isSuccess).toBe(false);
            expect(result.value.message).toBe("content.value.@type must match one of the allowed Attribute value types for IdentityAttributes");
            expect(result.value.code).toBe("error.runtime.validation.invalidPropertyValue");
        });
    });

    test("should allow to create a RepositoryAttribute", async () => {
        const result = await services1.consumption.attributes.canCreateOwnIdentityAttribute(canCreateRepositoryAttributeRequest);
        expect(result.value.isSuccess).toBe(true);
    });

    test("should not allow to create a RepositoryAttribute duplicate", async () => {
        const repositoryAttribute = (await services1.consumption.attributes.createOwnIdentityAttribute(canCreateRepositoryAttributeRequest)).value;

        const result = await services1.consumption.attributes.canCreateOwnIdentityAttribute(canCreateRepositoryAttributeRequest);

        assert(!result.value.isSuccess);

        expect(result.value.isSuccess).toBe(false);
        expect(result.value.message).toBe(
            `The RepositoryAttribute cannot be created because it has the same content.value as the already existing RepositoryAttribute with id '${repositoryAttribute.id.toString()}'.`
        );
        expect(result.value.code).toBe("error.runtime.attributes.cannotCreateDuplicateRepositoryAttribute");
    });

    test("should not allow to create a RepositoryAttribute if there exists a duplicate after trimming", async () => {
        const canCreateUntrimmedRepositoryAttributeRequest: CanCreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "    aGivenName  "
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };
        const repositoryAttribute = (await services1.consumption.attributes.createOwnIdentityAttribute(canCreateRepositoryAttributeRequest)).value;

        const result = await services1.consumption.attributes.canCreateOwnIdentityAttribute(canCreateUntrimmedRepositoryAttributeRequest);

        assert(!result.value.isSuccess);

        expect(result.value.isSuccess).toBe(false);
        expect(result.value.message).toBe(
            `The RepositoryAttribute cannot be created because it has the same content.value as the already existing RepositoryAttribute with id '${repositoryAttribute.id.toString()}'.`
        );
        expect(result.value.code).toBe("error.runtime.attributes.cannotCreateDuplicateRepositoryAttribute");
    });

    test("should not allow to create a duplicate RepositoryAttribute even if the tags are different", async () => {
        const createAttributeRequest: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };
        const repositoryAttribute = (await services1.consumption.attributes.createOwnIdentityAttribute(createAttributeRequest)).value;

        const canCreateAttributeRequest: CanCreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["x:tag3"]
            }
        };

        const result = await services1.consumption.attributes.canCreateOwnIdentityAttribute(canCreateAttributeRequest);

        assert(!result.value.isSuccess);

        expect(result.value.isSuccess).toBe(false);
        expect(result.value.message).toBe(
            `The RepositoryAttribute cannot be created because it has the same content.value as the already existing RepositoryAttribute with id '${repositoryAttribute.id.toString()}'.`
        );
        expect(result.value.code).toBe("error.runtime.attributes.cannotCreateDuplicateRepositoryAttribute");
    });

    test("should allow to create another RepositoryAttribute even if the tags are duplicates", async () => {
        const request: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };
        await services1.consumption.attributes.createOwnIdentityAttribute(request);

        const request2: CanCreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "anotherGivenName"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };

        const result = await services1.consumption.attributes.canCreateOwnIdentityAttribute(request2);
        expect(result.value.isSuccess).toBe(true);
    });

    test("should allow to create a RepositoryAttribute duplicate of a predecessor", async () => {
        const predecessor = await services1.consumption.attributes.createOwnIdentityAttribute(canCreateRepositoryAttributeRequest);
        await services1.consumption.attributes.succeedOwnIdentityAttribute({
            predecessorId: predecessor.value.id,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "anotherGivenName"
                }
            }
        });

        const result = await services1.consumption.attributes.canCreateOwnIdentityAttribute(canCreateRepositoryAttributeRequest);
        expect(result.value.isSuccess).toBe(true);
    });

    test("should allow to create a RepositoryAttribute that is the same as an existing RepositoryAttribute without an optional property", async () => {
        const createAttributeWithOptionalPropertyRequest: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "StreetAddress",
                    street: "aStreet",
                    houseNo: "aHouseNo",
                    zipCode: "aZipCode",
                    city: "aCity",
                    country: "DE",
                    state: "aState",
                    recipient: "aRecipient"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };

        const canCreateAttributeWithoutOptionalPropertyRequest: CanCreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "StreetAddress",
                    street: "aStreet",
                    houseNo: "aHouseNo",
                    zipCode: "aZipCode",
                    city: "aCity",
                    country: "DE",
                    recipient: "aRecipient"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };

        await services1.consumption.attributes.createOwnIdentityAttribute(createAttributeWithOptionalPropertyRequest);

        const result = await services1.consumption.attributes.canCreateOwnIdentityAttribute(canCreateAttributeWithoutOptionalPropertyRequest);
        expect(result.value.isSuccess).toBe(true);
    });

    test("should not allow to create a RepositoryAttribute with invalid tags", async () => {
        const canCreateAttributeRequest: CanCreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["x:valid-tag", "invalid-tag"]
            }
        };

        const result = await services1.consumption.attributes.canCreateOwnIdentityAttribute(canCreateAttributeRequest);

        assert(!result.value.isSuccess);

        expect(result.value.isSuccess).toBe(false);
        expect(result.value.message).toBe("Detected invalidity of the following tags: 'invalid-tag'.");
        expect(result.value.code).toBe("error.consumption.attributes.invalidTags");
    });
});

describe(CreateOwnIdentityAttributeUseCase.name, () => {
    test("should create a repository attribute", async () => {
        const request: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };

        const result = await services1.consumption.attributes.createOwnIdentityAttribute(request);
        expect(result).toBeSuccessful();
        const attribute = result.value;
        expect(attribute.content).toMatchObject(request.content);
        await services1.eventBus.waitForEvent(AttributeCreatedEvent, (e) => e.data.id === attribute.id);
    });

    test("should trim a repository attribute before creation", async () => {
        const request: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "    aGivenName  "
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };

        const result = await services1.consumption.attributes.createOwnIdentityAttribute(request);
        expect(result).toBeSuccessful();
        const attribute = result.value;
        expect((attribute.content.value as GivenNameJSON).value).toBe("aGivenName");
        await services1.eventBus.waitForEvent(AttributeCreatedEvent, (e) => e.data.id === attribute.id);
    });

    test("should create a RepositoryAttribute that is the default if it is the first of its value type", async () => {
        const request: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "Pseudonym",
                    value: "A pseudonym"
                }
            }
        };
        const result = await appService.consumption.attributes.createOwnIdentityAttribute(request);
        const attribute = result.value;
        expect(attribute.isDefault).toBe(true);
    });

    test("should create a RepositoryAttribute that is not the default if it is not the first of its value type", async () => {
        const request: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "JobTitle",
                    value: "First job title"
                }
            }
        };
        const request2: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "JobTitle",
                    value: "Second job title"
                }
            }
        };
        await appService.consumption.attributes.createOwnIdentityAttribute(request);
        const result = await appService.consumption.attributes.createOwnIdentityAttribute(request2);
        const attribute = result.value;
        expect(attribute.isDefault).toBeUndefined();
    });

    describe("validation errors for the attribute content", () => {
        test("should not create a number as GivenName", async () => {
            const request: CreateOwnIdentityAttributeRequest = {
                content: {
                    value: {
                        "@type": "GivenName",
                        value: 5
                    },
                    tags: ["x:tag1", "x:tag2"]
                } as any
            };
            const result = await services1.consumption.attributes.createOwnIdentityAttribute(request);
            expect(result.error.message).toBe("GivenName :: value must be string");
            expect(result.error.code).toBe("error.runtime.validation.invalidPropertyValue");
        });

        test("should not create a string as year of BirthDate", async () => {
            const request: CreateOwnIdentityAttributeRequest = {
                content: {
                    value: {
                        "@type": "BirthDate",
                        day: 5,
                        month: 5,
                        year: "a-string"
                    },
                    tags: ["x:tag1", "x:tag2"]
                } as any
            };
            const result = await services1.consumption.attributes.createOwnIdentityAttribute(request);
            expect(result.error.message).toBe("BirthDate :: year must be number");
            expect(result.error.code).toBe("error.runtime.validation.invalidPropertyValue");
        });

        test("should not create a BirthDate with a missing year", async () => {
            const request: CreateOwnIdentityAttributeRequest = {
                content: {
                    value: {
                        "@type": "BirthDate",
                        day: 5,
                        month: 5
                    },
                    tags: ["x:tag1", "x:tag2"]
                } as any
            };
            const result = await services1.consumption.attributes.createOwnIdentityAttribute(request);
            expect(result.error.message).toBe("BirthDate :: must have required property 'year'");
            expect(result.error.code).toBe("error.runtime.validation.invalidPropertyValue");
        });

        test("should not create 14 as BirthMonth", async () => {
            const request: CreateOwnIdentityAttributeRequest = {
                content: {
                    value: {
                        "@type": "BirthDate",
                        day: 14,
                        month: 14,
                        year: 1990
                    },
                    tags: ["x:tag1", "x:tag2"]
                }
            };
            const result = await services1.consumption.attributes.createOwnIdentityAttribute(request);
            expect(result.error.message).toBe("BirthMonth.value:Number :: must be an integer value between 1 and 12");
            expect(result.error.code).toBe("error.runtime.requestDeserialization");
        });

        test("should not accept an additional property", async () => {
            const request: CreateOwnIdentityAttributeRequest = {
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName",
                        additionalProperty: 1
                    },
                    tags: ["x:tag1", "x:tag2"]
                } as any
            };
            const result = await services1.consumption.attributes.createOwnIdentityAttribute(request);
            expect(result.error.message).toBe("GivenName :: must NOT have additional properties");
            expect(result.error.code).toBe("error.runtime.validation.invalidPropertyValue");
        });

        test("should not accept an invalid @type", async () => {
            const request: CreateOwnIdentityAttributeRequest = {
                content: {
                    value: {
                        "@type": "invalid-type"
                    }
                }
            } as any;
            const result = await services1.consumption.attributes.createOwnIdentityAttribute(request);
            expect(result.error.message).toBe("content.value.@type must match one of the allowed Attribute value types for IdentityAttributes");
            expect(result.error.code).toBe("error.runtime.validation.invalidPropertyValue");
        });
    });

    test("should not create a duplicate RepositoryAttribute", async () => {
        const request: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };

        const result = await services1.consumption.attributes.createOwnIdentityAttribute(request);
        expect(result).toBeSuccessful();

        const result2 = await services1.consumption.attributes.createOwnIdentityAttribute(request);
        expect(result2).toBeAnError(
            `The RepositoryAttribute cannot be created because it has the same content.value as the already existing RepositoryAttribute with id '${result.value.id.toString()}'.`,
            "error.runtime.attributes.cannotCreateDuplicateRepositoryAttribute"
        );
    });

    test("should not create a RepositoryAttribute if there would be a duplicate after trimming", async () => {
        const request: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };

        const untrimmedRequest: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "    aGivenName  "
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };

        const result = await services1.consumption.attributes.createOwnIdentityAttribute(request);
        expect(result).toBeSuccessful();

        const result2 = await services1.consumption.attributes.createOwnIdentityAttribute(untrimmedRequest);
        expect(result2).toBeAnError(
            `The RepositoryAttribute cannot be created because it has the same content.value as the already existing RepositoryAttribute with id '${result.value.id.toString()}'.`,
            "error.runtime.attributes.cannotCreateDuplicateRepositoryAttribute"
        );
    });

    test("should not prevent the creation when the RepositoryAttribute duplicate got succeeded", async () => {
        const request: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };

        const result = await services1.consumption.attributes.createOwnIdentityAttribute(request);
        expect(result).toBeSuccessful();

        const successionResult = await services1.consumption.attributes.succeedOwnIdentityAttribute({
            predecessorId: result.value.id,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "AnotherGivenName"
                }
            }
        });
        expect(successionResult).toBeSuccessful();

        const result2 = await services1.consumption.attributes.createOwnIdentityAttribute(request);
        expect(result2).toBeSuccessful();
    });

    test("should create a RepositoryAttribute that is the same as an existing RepositoryAttribute without an optional property", async () => {
        const request: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "StreetAddress",
                    street: "aStreet",
                    houseNo: "aHouseNo",
                    zipCode: "aZipCode",
                    city: "aCity",
                    country: "DE",
                    state: "aState",
                    recipient: "aRecipient"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };

        const request2: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "StreetAddress",
                    street: "aStreet",
                    houseNo: "aHouseNo",
                    zipCode: "aZipCode",
                    city: "aCity",
                    country: "DE",
                    recipient: "aRecipient"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };

        const result = await services1.consumption.attributes.createOwnIdentityAttribute(request);
        expect(result).toBeSuccessful();

        const result2 = await services1.consumption.attributes.createOwnIdentityAttribute(request2);
        expect(result2).toBeSuccessful();
    });

    test("should not create a duplicate RepositoryAttribute even if the tags are different", async () => {
        const request: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };

        const result = await services1.consumption.attributes.createOwnIdentityAttribute(request);
        expect(result).toBeSuccessful();

        const request2: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };

        const result2 = await services1.consumption.attributes.createOwnIdentityAttribute(request2);
        expect(result2).toBeAnError(
            `The RepositoryAttribute cannot be created because it has the same content.value as the already existing RepositoryAttribute with id '${result.value.id.toString()}'.`,
            "error.runtime.attributes.cannotCreateDuplicateRepositoryAttribute"
        );

        const request3: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };

        const result3 = await services1.consumption.attributes.createOwnIdentityAttribute(request3);
        expect(result3).toBeAnError(
            `The RepositoryAttribute cannot be created because it has the same content.value as the already existing RepositoryAttribute with id '${result.value.id.toString()}'.`,
            "error.runtime.attributes.cannotCreateDuplicateRepositoryAttribute"
        );

        const request4: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                }
            }
        };

        const result4 = await services1.consumption.attributes.createOwnIdentityAttribute(request4);
        expect(result4).toBeAnError(
            `The RepositoryAttribute cannot be created because it has the same content.value as the already existing RepositoryAttribute with id '${result.value.id.toString()}'.`,
            "error.runtime.attributes.cannotCreateDuplicateRepositoryAttribute"
        );
    });

    test("should create a RepositoryAttribute even if the tags are duplicates", async () => {
        const request: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };

        const result = await services1.consumption.attributes.createOwnIdentityAttribute(request);
        expect(result).toBeSuccessful();

        const request2: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName2"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };

        const result2 = await services1.consumption.attributes.createOwnIdentityAttribute(request2);
        expect(result2).toBeSuccessful();
    });
});

describe(ShareOwnIdentityAttributeUseCase.name, () => {
    let sOwnIdentityAttribute: LocalAttributeDTO;
    beforeEach(async () => {
        sOwnIdentityAttribute = (
            await services1.consumption.attributes.createOwnIdentityAttribute({
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName"
                    },
                    tags: ["x:tag1", "x:tag2"]
                }
            })
        ).value;
    });

    test("should send a sharing request containing an own IdentityAttribute", async () => {
        const shareRequest: ShareOwnIdentityAttributeRequest = {
            attributeId: sOwnIdentityAttribute.id,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareOwnIdentityAttribute(shareRequest);
        expect(shareRequestResult).toBeSuccessful();

        const shareRequestId = shareRequestResult.value.id;
        const sUpdatedOwnIdentityAttribute = await acceptIncomingShareAttributeRequest(services1, services2, shareRequestId);
        expect(sUpdatedOwnIdentityAttribute.forwardedSharingInfos![0].peer).toBe(services2.address);
        expect(sUpdatedOwnIdentityAttribute.forwardedSharingInfos![0].sourceReference).toBe(shareRequestId);

        const rPeerIdentityAttribute = (await services2.consumption.attributes.getAttribute({ id: sOwnIdentityAttribute.id })).value;
        expect(sOwnIdentityAttribute.content).toStrictEqual(rPeerIdentityAttribute.content);
        expect(sOwnIdentityAttribute.id).toBe(rPeerIdentityAttribute.id);
    });

    test("should send a sharing request containing an own IdentityAttribute with metadata", async () => {
        const expiresAt = CoreDate.utc().add({ days: 1 }).toString();
        const shareRequest: ShareOwnIdentityAttributeRequest = {
            attributeId: sOwnIdentityAttribute.id,
            peer: services2.address,
            requestMetadata: {
                title: "A request title",
                description: "A request description",
                metadata: { aKey: "aValue" },
                expiresAt
            },
            requestItemMetadata: {
                description: "An item description",
                metadata: { aKey: "aValue" }
            }
        };
        const shareRequestResult = await services1.consumption.attributes.shareOwnIdentityAttribute(shareRequest);
        expect(shareRequestResult).toBeSuccessful();
        const request = shareRequestResult.value;

        expect(request.content.title).toBe("A request title");
        expect(request.content.description).toBe("A request description");
        expect(request.content.metadata).toStrictEqual({ aKey: "aValue" });
        expect(request.content.expiresAt).toBe(expiresAt);

        expect(request.content.items[0].description).toBe("An item description");
        expect(request.content.items[0].metadata).toStrictEqual({ aKey: "aValue" });
    });

    test("should send a sharing request containing an own IdentityAttribute that was already shared but deleted by the peer", async () => {
        const shareRequest: ShareOwnIdentityAttributeRequest = {
            attributeId: sOwnIdentityAttribute.id,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareOwnIdentityAttribute(shareRequest);

        const shareRequestId = shareRequestResult.value.id;
        await acceptIncomingShareAttributeRequest(services1, services2, shareRequestId);

        const rPeerIdentityAttribute = (await services2.consumption.attributes.getAttribute({ id: sOwnIdentityAttribute.id })).value;
        const deleteResult = await services2.consumption.attributes.deletePeerIdentityAttributeAndNotifyOwner({ attributeId: rPeerIdentityAttribute.id });
        const notificationId = deleteResult.value.notificationId!;

        await syncUntilHasMessageWithNotification(services1.transport, notificationId);
        await services1.eventBus.waitForEvent(PeerSharedAttributeDeletedByPeerEvent, (e) => {
            return e.data.id === sOwnIdentityAttribute.id;
        });
        const sUpdatedOwnIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: sOwnIdentityAttribute.id })).value;
        expect(sUpdatedOwnIdentityAttribute.forwardedSharingInfos![0].deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);

        const shareRequestResult2 = await services1.consumption.attributes.shareOwnIdentityAttribute(shareRequest);
        expect(shareRequestResult2).toBeSuccessful();
    });

    test("should send a sharing request containing an own IdentityAttribute that was already shared but is to be deleted by the peer", async () => {
        const shareRequest: ShareOwnIdentityAttributeRequest = {
            attributeId: sOwnIdentityAttribute.id,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareOwnIdentityAttribute(shareRequest);

        const shareRequestId = shareRequestResult.value.id;
        await acceptIncomingShareAttributeRequest(services1, services2, shareRequestId);

        const requestParams = {
            content: {
                items: [
                    DeleteAttributeRequestItem.from({
                        attributeId: sOwnIdentityAttribute.id,
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

        const sUpdatedOwnIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: sOwnIdentityAttribute.id })).value;
        expect(sUpdatedOwnIdentityAttribute.forwardedSharingInfos![0].deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.ToBeDeletedByPeer);

        const shareRequestResult2 = await services1.consumption.attributes.shareOwnIdentityAttribute(shareRequest);
        expect(shareRequestResult2).toBeSuccessful();
    });

    test("should reject attempts to share the same own IdentityAttribute more than once with the same peer", async () => {
        await executeFullShareOwnIdentityAttributeFlow(services1, services3, sOwnIdentityAttribute.id);

        const repeatedShareRequestResult = await services1.consumption.attributes.shareOwnIdentityAttribute({
            attributeId: sOwnIdentityAttribute.id,
            peer: services3.address
        });

        expect(repeatedShareRequestResult).toBeAnError(
            `The IdentityAttribute with the given sourceAttributeId '${sOwnIdentityAttribute.id}' is already shared with the peer.`,
            "error.consumption.requests.invalidRequestItem"
        );
    });

    test("should reject sharing an attribute, of which a previous version has been shared", async () => {
        const predecesssorOwnIdentityAttribute = await executeFullCreateAndShareOwnIdentityAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "Surname",
                    value: "Name 1"
                }
            }
        });

        const { successor: successorRepositoryAttribute } = (
            await services1.consumption.attributes.succeedOwnIdentityAttribute({
                predecessorId: predecesssorOwnIdentityAttribute.id,
                successorContent: {
                    value: {
                        "@type": "Surname",
                        value: "Name 2"
                    }
                }
            })
        ).value;

        const response = await services1.consumption.attributes.shareOwnIdentityAttribute({
            attributeId: successorRepositoryAttribute.id,
            peer: services2.address
        });
        expect(response).toBeAnError(
            `The predecessor '${predecesssorOwnIdentityAttribute.id}' of the IdentityAttribute is already shared with the peer. Instead of sharing it, you should notify the peer about the Attribute succession.`,
            "error.consumption.requests.invalidRequestItem"
        );
    });

    test("should reject sharing a peer IdentityAttribute", async () => {
        await executeFullShareOwnIdentityAttributeFlow(services1, services2, sOwnIdentityAttribute.id);
        const rPeerIdentityAttribute = (await services2.consumption.attributes.getAttribute({ id: sOwnIdentityAttribute.id })).value;

        const shareRequest: ShareOwnIdentityAttributeRequest = {
            attributeId: rPeerIdentityAttribute.id,
            peer: services1.address
        };
        const shareRequestResult = await services2.consumption.attributes.shareOwnIdentityAttribute(shareRequest);
        expect(shareRequestResult).toBeAnError(/.*/, "error.runtime.attributes.isNotOwnIdentityAttribute");
    });

    test("should reject sharing a RelationshipAttribute", async () => {
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
        const sOwnRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, createAndShareRelationshipAttributeRequest);

        const shareRequest: ShareOwnIdentityAttributeRequest = {
            attributeId: sOwnRelationshipAttribute.id,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareOwnIdentityAttribute(shareRequest);
        expect(shareRequestResult).toBeAnError(/.*/, "error.runtime.attributes.isNotOwnIdentityAttribute");
    });

    test("should throw if own IdentityAttribute doesn't exist", async () => {
        const shareRequest: ShareOwnIdentityAttributeRequest = {
            attributeId: (await new CoreIdHelper("ATT").generate()).toString(),
            peer: services1.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareOwnIdentityAttribute(shareRequest);
        expect(shareRequestResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("should throw if id of own IdentityAttribute is invalid ", async () => {
        const shareRequest: ShareOwnIdentityAttributeRequest = {
            attributeId: CoreId.from("faulty").toString(),
            peer: services1.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareOwnIdentityAttribute(shareRequest);
        expect(shareRequestResult).toBeAnError(/.*/, "error.runtime.validation.invalidPropertyValue");
    });
});

describe(SucceedOwnIdentityAttributeUseCase.name, () => {
    test("should succeed a repository attribute", async () => {
        const createAttributeRequest: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };
        const predecessor = (await services1.consumption.attributes.createOwnIdentityAttribute(createAttributeRequest)).value;

        const succeedAttributeRequest: SucceedOwnIdentityAttributeRequest = {
            predecessorId: predecessor.id.toString(),
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "anotherGivenName"
                },
                tags: ["x:tag3", "x:tag4"]
            }
        };
        const result = await services1.consumption.attributes.succeedOwnIdentityAttribute(succeedAttributeRequest);
        expect(result.isError).toBe(false);
        const { predecessor: updatedPredecessor, successor } = result.value;
        expect(updatedPredecessor.succeededBy).toStrictEqual(successor.id);
        expect((successor as any).content.value.value).toBe("anotherGivenName");
        await services1.eventBus.waitForEvent(RepositoryAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === updatedPredecessor.id && e.data.successor.id === successor.id;
        });
    });

    test("should trim the successor of a repository attribute", async () => {
        const createAttributeRequest: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };
        const predecessor = (await services1.consumption.attributes.createOwnIdentityAttribute(createAttributeRequest)).value;

        const succeedAttributeRequest: SucceedOwnIdentityAttributeRequest = {
            predecessorId: predecessor.id.toString(),
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "    anotherGivenName    "
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };
        const result = await services1.consumption.attributes.succeedOwnIdentityAttribute(succeedAttributeRequest);
        expect(result.isError).toBe(false);
        const { predecessor: updatedPredecessor, successor } = result.value;
        expect((successor as any).content.value.value).toBe("anotherGivenName");
        await services1.eventBus.waitForEvent(RepositoryAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === updatedPredecessor.id && e.data.successor.id === successor.id;
        });
    });

    test("should throw if predecessor id is invalid", async () => {
        const succeedAttributeRequest: SucceedOwnIdentityAttributeRequest = {
            predecessorId: CoreId.from("faulty").toString(),
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };
        const result = await services1.consumption.attributes.succeedOwnIdentityAttribute(succeedAttributeRequest);
        expect(result).toBeAnError(/.*/, "error.consumption.attributes.predecessorDoesNotExist");
    });

    test("should throw if predecessor doesn't exist", async () => {
        const succeedAttributeRequest: SucceedOwnIdentityAttributeRequest = {
            predecessorId: (await new CoreIdHelper("ATT").generate()).toString(),
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };
        const result = await services1.consumption.attributes.succeedOwnIdentityAttribute(succeedAttributeRequest);
        expect(result).toBeAnError(/.*/, "error.consumption.attributes.predecessorDoesNotExist");
    });

    test("should throw if successor doesn't meet validation criteria", async () => {
        const createAttributeRequest: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "PhoneNumber",
                    value: "0123456789"
                }
            }
        };
        const predecessor = (await services1.consumption.attributes.createOwnIdentityAttribute(createAttributeRequest)).value;

        const succeedAttributeRequest: SucceedOwnIdentityAttributeRequest = {
            predecessorId: predecessor.id.toString(),
            successorContent: {
                value: {
                    "@type": "PhoneNumber",
                    value: ""
                }
            }
        };
        const result = await services1.consumption.attributes.succeedOwnIdentityAttribute(succeedAttributeRequest);
        expect(result).toBeAnError("Value is shorter than 3 characters", "error.consumption.attributes.successorIsNotAValidAttribute");
    });

    test("validation should catch attempts of changing the value type", async () => {
        const createAttributeRequest: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };
        const predecessor = (await services1.consumption.attributes.createOwnIdentityAttribute(createAttributeRequest)).value;

        const succeedAttributeRequest: SucceedOwnIdentityAttributeRequest = {
            predecessorId: predecessor.id.toString(),
            successorContent: {
                value: {
                    "@type": "PhoneNumber",
                    value: "+4915155253460"
                },
                tags: ["x:tag3", "x:tag4"]
            }
        };
        const result = await services1.consumption.attributes.succeedOwnIdentityAttribute(succeedAttributeRequest);
        expect(result).toBeAnError(/.*/, "error.consumption.attributes.successionMustNotChangeValueType");
    });
});

describe(NotifyPeerAboutOwnIdentityAttributeSuccessionUseCase.name, () => {
    let succeedOwnIdentityAttributeRequest1: SucceedOwnIdentityAttributeRequest;
    let succeedOwnIdentityAttributeRequest2: SucceedOwnIdentityAttributeRequest;
    let ownIdentityAttributeVersion0: LocalAttributeDTO;
    let ownIdentityAttributeVersion1: LocalAttributeDTO;
    let ownIdentityAttributeVersion2: LocalAttributeDTO;
    beforeEach(async () => {
        ownIdentityAttributeVersion0 = await executeFullCreateAndShareOwnIdentityAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        });

        succeedOwnIdentityAttributeRequest1 = {
            predecessorId: ownIdentityAttributeVersion0.id,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "anotherGivenName"
                },
                tags: ["x:tag3", "x:tag4"]
            }
        };
        ({ successor: ownIdentityAttributeVersion1 } = (await services1.consumption.attributes.succeedOwnIdentityAttribute(succeedOwnIdentityAttributeRequest1)).value);

        succeedOwnIdentityAttributeRequest2 = {
            predecessorId: ownIdentityAttributeVersion1.id,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "aFurtherGivenName"
                }
            }
        };
        ({ successor: ownIdentityAttributeVersion2 } = (await services1.consumption.attributes.succeedOwnIdentityAttribute(succeedOwnIdentityAttributeRequest2)).value);
    });

    test("should successfully notify peer about attribute succession", async () => {
        const notificationResult = await services1.consumption.attributes.notifyPeerAboutOwnIdentityAttributeSuccession({
            attributeId: ownIdentityAttributeVersion1.id,
            peer: services2.address
        });
        expect(notificationResult).toBeSuccessful();
    });

    test("should add forwardedSharingInfo to successor of own IdentityAttribute of sender", async () => {
        const { successor: updatedOwnIdentityAttributeVersion1 } = await executeFullNotifyPeerAboutAttributeSuccessionFlow(services1, services2, ownIdentityAttributeVersion1.id);
        expect(updatedOwnIdentityAttributeVersion1.forwardedSharingInfos![0].peer).toBe(services2.address);
    });

    test("should create successor peer IdentityAttribute for recipient", async () => {
        await executeFullNotifyPeerAboutAttributeSuccessionFlow(services1, services2, ownIdentityAttributeVersion1.id);

        const recipientPeerIdentityAttributeVersion1 = (await services2.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion1.id })).value;
        expect(recipientPeerIdentityAttributeVersion1.content).toStrictEqual(ownIdentityAttributeVersion1.content);
        expect(recipientPeerIdentityAttributeVersion1.succeeds).toBe(ownIdentityAttributeVersion0.id);

        const recipientPeerIdentityAttributeVersion0 = (await services2.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion0.id })).value;
        expect(recipientPeerIdentityAttributeVersion0.succeededBy).toBe(recipientPeerIdentityAttributeVersion1.id);
    });

    test("should allow to notify about successor not having notified about predecessor", async () => {
        await executeFullNotifyPeerAboutAttributeSuccessionFlow(services1, services2, ownIdentityAttributeVersion2.id);

        const recipientPeerIdentityAttributeVersion2 = (await services2.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion2.id })).value;
        const recipientPeerIdentityAttributeVersion0 = (await services2.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion0.id })).value;
        expect(recipientPeerIdentityAttributeVersion2.succeeds).toBe(recipientPeerIdentityAttributeVersion0.id);
        expect(recipientPeerIdentityAttributeVersion0.succeededBy).toBe(recipientPeerIdentityAttributeVersion2.id);
    });

    test("should allow to notify about successor if the predecessor was deleted by the peer but was shared again", async () => {
        const deleteResult = await services2.consumption.attributes.deletePeerIdentityAttributeAndNotifyOwner({ attributeId: ownIdentityAttributeVersion0.id });
        const notificationId = deleteResult.value.notificationId!;

        await syncUntilHasMessageWithNotification(services1.transport, notificationId);
        await services1.eventBus.waitForEvent(PeerSharedAttributeDeletedByPeerEvent, (e) => {
            return e.data.id === ownIdentityAttributeVersion0.id;
        });
        const updatedOwnIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion0.id })).value;
        expect(updatedOwnIdentityAttribute.forwardedSharingInfos![0].deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);

        await executeFullShareOwnIdentityAttributeFlow(services1, services2, ownIdentityAttributeVersion0.id);

        const result = await services1.consumption.attributes.notifyPeerAboutOwnIdentityAttributeSuccession({
            attributeId: ownIdentityAttributeVersion2.id,
            peer: services2.address
        });
        expect(result).toBeSuccessful();
    });

    test("should throw if the predecessor was deleted by the peer", async () => {
        const deleteResult = await services2.consumption.attributes.deletePeerIdentityAttributeAndNotifyOwner({ attributeId: ownIdentityAttributeVersion0.id });
        const notificationId = deleteResult.value.notificationId!;

        await syncUntilHasMessageWithNotification(services1.transport, notificationId);
        await services1.eventBus.waitForEvent(PeerSharedAttributeDeletedByPeerEvent, (e) => {
            return e.data.id === ownIdentityAttributeVersion0.id;
        });
        const updatedOwnIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion0.id })).value;
        expect(updatedOwnIdentityAttribute.forwardedSharingInfos![0].deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);

        const notificationResult = await services1.consumption.attributes.notifyPeerAboutOwnIdentityAttributeSuccession({
            attributeId: ownIdentityAttributeVersion1.id,
            peer: services2.address
        });
        expect(notificationResult).toBeAnError(/.*/, "error.runtime.attributes.peerHasNoPreviousVersionOfAttribute");
    });

    test("should throw if the successor own IdentityAttribute was deleted", async () => {
        await services1.consumption.attributes.deleteOwnIdentityAttributeAndNotifyPeers({ attributeId: ownIdentityAttributeVersion1.id });

        const notificationResult = await services1.consumption.attributes.notifyPeerAboutOwnIdentityAttributeSuccession({
            attributeId: ownIdentityAttributeVersion1.id,
            peer: services2.address
        });
        expect(notificationResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("should throw if the same version of the attribute has been notified about already", async () => {
        await executeFullNotifyPeerAboutAttributeSuccessionFlow(services1, services2, ownIdentityAttributeVersion1.id);

        const result2 = await services1.consumption.attributes.notifyPeerAboutOwnIdentityAttributeSuccession({
            attributeId: ownIdentityAttributeVersion1.id,
            peer: services2.address
        });
        expect(result2).toBeAnError(/.*/, "error.runtime.attributes.ownIdentityAttributeHasAlreadyBeenSharedWithPeer");
    });

    test("should throw if a later version of the attribute has been notified about already", async () => {
        await executeFullNotifyPeerAboutAttributeSuccessionFlow(services1, services2, ownIdentityAttributeVersion2.id);

        const notificationResult = await services1.consumption.attributes.notifyPeerAboutOwnIdentityAttributeSuccession({
            attributeId: ownIdentityAttributeVersion1.id,
            peer: services2.address
        });
        expect(notificationResult).toBeAnError(/.*/, "error.consumption.attributes.successorSourceDoesNotSucceedPredecessorSource");
    });

    test("should throw if no other version of the attribute has been shared before", async () => {
        const newOwnIdentityAttribute = (
            await services1.consumption.attributes.createOwnIdentityAttribute({
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName"
                    }
                }
            })
        ).value;

        const result = await services1.consumption.attributes.notifyPeerAboutOwnIdentityAttributeSuccession({ attributeId: newOwnIdentityAttribute.id, peer: services2.address });
        expect(result).toBeAnError(/.*/, "error.runtime.attributes.peerHasNoPreviousVersionOfAttribute");
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
        expect(requestResult).toBeSuccessful();

        const requestId = requestResult.value.id;
        const sOwnRelationshipAttribute = await acceptIncomingShareAttributeRequest(services1, services2, requestId);
        const rPeerRelationshipAttribute = (await services2.consumption.attributes.getAttribute({ id: sOwnRelationshipAttribute.id })).value;

        expect(sOwnRelationshipAttribute.content.value).toStrictEqual(createAndShareRelationshipAttributeRequest.content.value);
        expect(sOwnRelationshipAttribute.content).toStrictEqual(rPeerRelationshipAttribute.content);
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
                description: "An item Description",
                metadata: { aKey: "aValue" }
            }
        };
        const requestResult = await services1.consumption.attributes.createAndShareRelationshipAttribute(createAndShareRelationshipAttributeRequest);
        expect(requestResult).toBeSuccessful();

        const request = requestResult.value;

        expect(request.content.title).toBe("A request Title");
        expect(request.content.description).toBe("A request Description");
        expect(request.content.metadata).toStrictEqual({ aKey: "aValue" });
        expect(request.content.expiresAt).toBe(expiresAt);

        expect(request.content.items[0].description).toBe("An item Description");
        expect(request.content.items[0].metadata).toStrictEqual({ aKey: "aValue" });
    });
});

describe(SucceedRelationshipAttributeAndNotifyPeerUseCase.name, () => {
    let sOwnRelationshipAttribute: LocalAttributeDTO;
    beforeEach(async () => {
        sOwnRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
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

    test("should succeed an own RelationshipAttribute and notify peer", async () => {
        const result = await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
            predecessorId: sOwnRelationshipAttribute.id,
            successorContent: {
                value: {
                    "@type": "ProprietaryString",
                    value: "another String",
                    title: "another title"
                }
            }
        });
        expect(result).toBeSuccessful();

        await waitForRecipientToReceiveNotification(services1, services2, result.value);

        const senderPredecessor = result.value.predecessor;
        const senderSuccessor = result.value.successor;
        const recipientPredecessor = (await services2.consumption.attributes.getAttribute({ id: senderPredecessor.id })).value;
        const recipientSuccessor = (await services2.consumption.attributes.getAttribute({ id: senderSuccessor.id })).value;

        expect(senderSuccessor.content).toStrictEqual(recipientSuccessor.content);
        expect(senderSuccessor.peerSharingInfo!.sourceReference).toBe(recipientSuccessor.peerSharingInfo!.sourceReference);
        expect(senderSuccessor.peerSharingInfo!.peer).toBe(services2.address);
        expect(recipientSuccessor.peerSharingInfo!.peer).toBe(services1.address);
        expect(senderSuccessor.succeeds).toBe(senderPredecessor.id);
        expect(recipientSuccessor.succeeds).toBe(recipientPredecessor.id);
        expect(senderPredecessor.succeededBy).toBe(senderSuccessor.id);
        expect(recipientPredecessor.succeededBy).toBe(recipientSuccessor.id);
    });

    test("should throw trying to change the value type succeeding an own RelationshipAttribute", async () => {
        const result = await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
            predecessorId: sOwnRelationshipAttribute.id,
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
        const rPeerRelationshipAttribute = (await services2.consumption.attributes.getAttribute({ id: sOwnRelationshipAttribute.id })).value;

        const deleteResult = await services2.consumption.attributes.deletePeerRelationshipAttributeAndNotifyPeers({ attributeId: rPeerRelationshipAttribute.id });
        const notificationId = deleteResult.value.notificationId!;

        await syncUntilHasMessageWithNotification(services1.transport, notificationId);
        await services1.eventBus.waitForEvent(PeerSharedAttributeDeletedByPeerEvent, (e) => {
            return e.data.id === sOwnRelationshipAttribute.id;
        });
        const updatedOwnRelationshipAttribute = (await services1.consumption.attributes.getAttribute({ id: sOwnRelationshipAttribute.id })).value;
        expect(updatedOwnRelationshipAttribute.peerSharingInfo!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);

        const result = await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
            predecessorId: sOwnRelationshipAttribute.id,
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

describe(ChangeDefaultOwnIdentityAttributeUseCase.name, () => {
    test("should change default own IdentityAttribute", async () => {
        const defaultAttribute = (
            await appService.consumption.attributes.createOwnIdentityAttribute({
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
            await appService.consumption.attributes.createOwnIdentityAttribute({
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "My new default name"
                    }
                }
            })
        ).value;
        expect(desiredDefaultAttribute.isDefault).toBeUndefined();

        const result = await appService.consumption.attributes.changeDefaultOwnIdentityAttribute({ attributeId: desiredDefaultAttribute.id });
        expect(result).toBeSuccessful();
        const newDefaultAttribute = result.value;
        expect(newDefaultAttribute.isDefault).toBe(true);

        const updatedFormerDesiredDefaultAttribute = (await appService.consumption.attributes.getAttribute({ id: desiredDefaultAttribute.id })).value;
        expect(updatedFormerDesiredDefaultAttribute.isDefault).toBe(true);

        const updatedFormerDefaultAttribute = (await appService.consumption.attributes.getAttribute({ id: defaultAttribute.id })).value;
        expect(updatedFormerDefaultAttribute.isDefault).toBeUndefined();
    });

    test("should return an error if the new default Attribute is not an own IdentityAttribute", async () => {
        await appService.consumption.attributes.createOwnIdentityAttribute({
            content: {
                value: {
                    "@type": "GivenName",
                    value: "My default name"
                }
            }
        });

        const desiredSharedDefaultAttribute = await executeFullCreateAndShareOwnIdentityAttributeFlow(services2, appService, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "My peer's name"
                }
            }
        });
        const result = await appService.consumption.attributes.changeDefaultOwnIdentityAttribute({ attributeId: desiredSharedDefaultAttribute.id });
        expect(result).toBeAnError(
            `Attribute '${desiredSharedDefaultAttribute.id.toString()}' is not an own IdentityAttribute.`,
            "error.runtime.attributes.isNotOwnIdentityAttribute"
        );
    });

    test("should return an error if the new default attribute has a successor", async () => {
        await appService.consumption.attributes.createOwnIdentityAttribute({
            content: {
                value: {
                    "@type": "GivenName",
                    value: "My default name"
                }
            }
        });

        const desiredDefaultAttribute = (
            await appService.consumption.attributes.createOwnIdentityAttribute({
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "My new default name"
                    }
                }
            })
        ).value;

        const successionResult = (
            await appService.consumption.attributes.succeedOwnIdentityAttribute({
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

        const result = await appService.consumption.attributes.changeDefaultOwnIdentityAttribute({ attributeId: updatedDesiredDefaultAttribute.id });
        expect(result).toBeAnError(
            `Attribute '${updatedDesiredDefaultAttribute.id.toString()}' already has a successor ${desiredDefaultAttributeSuccessor.id.toString()}.`,
            "error.runtime.attributes.hasSuccessor"
        );
    });

    test("should return an error trying to set a default attribute if setDefaultIOwnIdentityAttributes is false", async () => {
        const attribute = (
            await services1.consumption.attributes.createOwnIdentityAttribute({
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "My default name"
                    }
                }
            })
        ).value;
        expect(attribute.isDefault).toBeUndefined();

        const result = await services1.consumption.attributes.changeDefaultOwnIdentityAttribute({ attributeId: attribute.id });
        expect(result).toBeAnError("Setting default own IdentityAttributes is disabled for this Account.", "error.runtime.attributes.setDefaultOwnIdentityAttributesIsDisabled");
    });
});

describe("Get (shared) versions of Attribute", () => {
    let sOwnIdentityAttributeVersion0: LocalAttributeDTO;
    let sOwnIdentityAttributeVersion1: LocalAttributeDTO;
    let sOwnIdentityAttributeVersion2: LocalAttributeDTO;
    let sOwnIdentityAttributeVersions: LocalAttributeDTO[];

    let sOwnRelationshipAttributeVersion0: LocalAttributeDTO;
    let sOwnRelationshipAttributeVersion1: LocalAttributeDTO;
    let sOwnRelationshipAttributeVersion2: LocalAttributeDTO;

    async function succeedVersion0(): Promise<void> {
        const succeedOwnIdentityAttributeRequest1: SucceedOwnIdentityAttributeRequest = {
            predecessorId: sOwnIdentityAttributeVersion0.id.toString(),
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Second Name"
                },
                tags: ["x:tag2"]
            }
        };
        ({ predecessor: sOwnIdentityAttributeVersion0, successor: sOwnIdentityAttributeVersion1 } = (
            await services1.consumption.attributes.succeedOwnIdentityAttribute(succeedOwnIdentityAttributeRequest1)
        ).value);
    }

    async function succeedVersion1(): Promise<void> {
        const succeedOwnIdentityAttributeRequest2: SucceedOwnIdentityAttributeRequest = {
            predecessorId: sOwnIdentityAttributeVersion1.id.toString(),
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Third Name"
                },
                tags: ["x:tag3"]
            }
        };
        ({ predecessor: sOwnIdentityAttributeVersion1, successor: sOwnIdentityAttributeVersion2 } = (
            await services1.consumption.attributes.succeedOwnIdentityAttribute(succeedOwnIdentityAttributeRequest2)
        ).value);
    }

    async function setUpOwnIdentityAttributeVersions() {
        sOwnIdentityAttributeVersion0 = (
            await services1.consumption.attributes.createOwnIdentityAttribute({
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "First Name"
                    },
                    tags: ["x:tag1"]
                }
            })
        ).value;
        await succeedVersion0();
        await succeedVersion1();
        sOwnIdentityAttributeVersions = [sOwnIdentityAttributeVersion2, sOwnIdentityAttributeVersion1, sOwnIdentityAttributeVersion0];
    }

    async function setUpIdentityAttributeVersions() {
        await createAndShareVersion0();
        await succeedVersion0();
        await succeedVersion1();
        sOwnIdentityAttributeVersions = [sOwnIdentityAttributeVersion2, sOwnIdentityAttributeVersion1, sOwnIdentityAttributeVersion0];

        await notifyPeerAboutVersion2();
        await shareVersion2WithFurtherPeer();

        async function createAndShareVersion0(): Promise<void> {
            sOwnIdentityAttributeVersion0 = await executeFullCreateAndShareOwnIdentityAttributeFlow(services1, services2, {
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "First Name"
                    },
                    tags: ["x:tag1"]
                }
            });
        }

        async function notifyPeerAboutVersion2(): Promise<void> {
            const notifyResult = (
                await services1.consumption.attributes.notifyPeerAboutOwnIdentityAttributeSuccession({
                    attributeId: sOwnIdentityAttributeVersion2.id,
                    peer: services2.address
                })
            ).value;
            await waitForRecipientToReceiveNotification(services1, services2, notifyResult);

            ({ predecessor: sOwnIdentityAttributeVersion0, successor: sOwnIdentityAttributeVersion2 } = notifyResult);
        }

        async function shareVersion2WithFurtherPeer(): Promise<void> {
            const shareRequestResult = await services1.consumption.attributes.shareOwnIdentityAttribute({
                attributeId: sOwnIdentityAttributeVersion2.id,
                peer: services3.address
            });
            const shareRequestId = shareRequestResult.value.id;
            sOwnIdentityAttributeVersion2 = await acceptIncomingShareAttributeRequest(services1, services3, shareRequestId);
        }
    }

    async function createAndShareRelationshipAttributeVersion0(): Promise<void> {
        sOwnRelationshipAttributeVersion0 = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
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
            const sOwnRelationshipAttributeSuccessionResult1 = await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
                predecessorId: sOwnRelationshipAttributeVersion0.id.toString(),
                successorContent: {
                    value: {
                        "@type": "ProprietaryInteger",
                        title: "Version",
                        value: 2
                    }
                }
            });
            await waitForRecipientToReceiveNotification(services1, services2, sOwnRelationshipAttributeSuccessionResult1.value);

            ({ predecessor: sOwnRelationshipAttributeVersion0, successor: sOwnRelationshipAttributeVersion1 } = sOwnRelationshipAttributeSuccessionResult1.value);
        }

        async function succeedVersion1(): Promise<void> {
            const sOwnRelationshipAttributeSuccessionResult2 = await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
                predecessorId: sOwnRelationshipAttributeVersion1.id.toString(),
                successorContent: {
                    value: {
                        "@type": "ProprietaryInteger",
                        title: "Version",
                        value: 3
                    }
                }
            });
            await waitForRecipientToReceiveNotification(services1, services2, sOwnRelationshipAttributeSuccessionResult2.value);

            ({ predecessor: sOwnRelationshipAttributeVersion1, successor: sOwnRelationshipAttributeVersion2 } = sOwnRelationshipAttributeSuccessionResult2.value);
        }
    }

    describe(GetVersionsOfAttributeUseCase.name, () => {
        test("should get all versions of an own IdentityAttribute", async () => {
            await setUpOwnIdentityAttributeVersions();
            for (const version of sOwnIdentityAttributeVersions) {
                const result = await services1.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result).toBeSuccessful();

                const returnedVersions = result.value;
                expect(returnedVersions).toStrictEqual(sOwnIdentityAttributeVersions);
            }
        });

        test("should get all versions of an own IdentityAttribute shared with the same peer", async () => {
            await setUpIdentityAttributeVersions();
            // TODO: we could here also give the not shared version as test input
            const sOwnIdentityAttributeVersionsSharedWithPeer = [sOwnIdentityAttributeVersion2, sOwnIdentityAttributeVersion0];
            for (const version of sOwnIdentityAttributeVersionsSharedWithPeer) {
                const result1 = await services1.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result1.isSuccess).toBe(true);

                const returnedVersions1 = result1.value;
                expect(returnedVersions1).toStrictEqual(sOwnIdentityAttributeVersionsSharedWithPeer);
            }
        });

        test("should get all versions of a peer IdentityAttribute", async () => {
            await setUpIdentityAttributeVersions();
            const rPeerIdentityAttributeVersion2 = (await services2.consumption.attributes.getAttribute({ id: sOwnIdentityAttributeVersion2.id })).value;
            const rPeerIdentityAttributeVersion0 = (await services2.consumption.attributes.getAttribute({ id: sOwnIdentityAttributeVersion0.id })).value;
            const rPeerIdentityAttributeVersions = [rPeerIdentityAttributeVersion2, rPeerIdentityAttributeVersion0];

            for (const version of rPeerIdentityAttributeVersions) {
                const result = await services2.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result).toBeSuccessful();

                const returnedVersions = result.value;
                expect(returnedVersions).toStrictEqual(rPeerIdentityAttributeVersions);
            }
        });

        test("should get all versions of an own RelationshipAttribute", async () => {
            await setUpRelationshipAttributeVersions();
            const sOwnRelationshipAttributeVersions = [sOwnRelationshipAttributeVersion2, sOwnRelationshipAttributeVersion1, sOwnRelationshipAttributeVersion0];
            for (const version of sOwnRelationshipAttributeVersions) {
                const result = await services1.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result).toBeSuccessful();

                const returnedVersions = result.value;
                expect(returnedVersions).toStrictEqual(sOwnRelationshipAttributeVersions);
            }
        });

        test("should get all versions of a peer RelationshipAttribute", async () => {
            await setUpRelationshipAttributeVersions();
            const rPeerRelationshipAttributeVersion2 = (await services2.consumption.attributes.getAttribute({ id: sOwnRelationshipAttributeVersion2.id })).value;
            const rPeerRelationshipAttributeVersion1 = (await services2.consumption.attributes.getAttribute({ id: sOwnRelationshipAttributeVersion1.id })).value;
            const rPeerRelationshipAttributeVersion0 = (await services2.consumption.attributes.getAttribute({ id: sOwnRelationshipAttributeVersion0.id })).value;
            const rPeerRelationshipAttributeVersions = [rPeerRelationshipAttributeVersion2, rPeerRelationshipAttributeVersion1, rPeerRelationshipAttributeVersion0];

            for (const version of rPeerRelationshipAttributeVersions) {
                const result = await services2.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result).toBeSuccessful();

                const returnedVersions = result.value;
                expect(returnedVersions).toStrictEqual(rPeerRelationshipAttributeVersions);
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

        test("should get only latest version of an own IdentityAttribute shared with a peer", async () => {
            for (const version of sOwnIdentityAttributeVersions) {
                const result1 = await services1.consumption.attributes.getSharedVersionsOfAttribute({ attributeId: version.id, peer: services2.address });
                expect(result1.isSuccess).toBe(true);
                const returnedVersions1 = result1.value;
                expect(returnedVersions1).toStrictEqual(expect.arrayContaining([sOwnIdentityAttributeVersion2, sOwnIdentityAttributeVersion2]));

                const result2 = await services1.consumption.attributes.getSharedVersionsOfAttribute({ attributeId: version.id, peer: services2.address, onlyLatestVersions: true });
                expect(result2.isSuccess).toBe(true);
                const returnedVersions2 = result2.value;
                expect(returnedVersions2).toStrictEqual(expect.arrayContaining([sOwnIdentityAttributeVersion2, sOwnIdentityAttributeVersion2]));
            }
        });

        test("should get all versions of an own IdentityAttribute shared with a peer", async () => {
            for (const version of sOwnIdentityAttributeVersions) {
                const returnedVersionsForPeer2 = (
                    await services1.consumption.attributes.getSharedVersionsOfAttribute({
                        attributeId: version.id,
                        peer: services2.address,
                        onlyLatestVersions: false
                    })
                ).value;
                expect(returnedVersionsForPeer2).toStrictEqual(expect.arrayContaining([sOwnIdentityAttributeVersion2, sOwnIdentityAttributeVersion0]));

                const returnedVersionsForPeer3 = (
                    await services1.consumption.attributes.getSharedVersionsOfAttribute({
                        attributeId: version.id,
                        peer: services3.address,
                        onlyLatestVersions: false
                    })
                ).value;
                expect(returnedVersionsForPeer3).toStrictEqual([sOwnIdentityAttributeVersion2]);
            }
        });

        test("should return all RelationshipAttributes forwarded to a third party", async () => {
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
            const forwardedRelationshipAttribute = await executeFullRequestAndAcceptExistingAttributeFlow(
                services1,
                services3,
                requestParams,
                sOwnRelationshipAttributeVersion0.id
            );

            const result = await services1.consumption.attributes.getSharedVersionsOfAttribute({ attributeId: sOwnRelationshipAttributeVersion0.id, peer: services3.address });
            expect(result).toBeSuccessful();
            const returnedVersions = result.value;
            expect(returnedVersions).toStrictEqual([forwardedRelationshipAttribute]);
        });

        test("should return an empty list if a RelationshipAttribute that hasn't been forwarded is queried", async () => {
            await createAndShareRelationshipAttributeVersion0();
            const result = await services1.consumption.attributes.getSharedVersionsOfAttribute({ attributeId: sOwnRelationshipAttributeVersion0.id, peer: services3.address });
            expect(result).toBeSuccessful();
            const returnedVersions = result.value;
            expect(returnedVersions).toStrictEqual([]);
        });

        test("should return an empty list calling getSharedVersionsOfAttribute with a nonexistent peer", async () => {
            const result = await services1.consumption.attributes.getSharedVersionsOfAttribute({
                attributeId: sOwnIdentityAttributeVersion2.id,
                peer: "did:e:localhost:dids:0000000000000000000000"
            });
            expect(result).toBeSuccessful();
            const returnedVersions = result.value;
            expect(returnedVersions).toStrictEqual([]);
        });

        test("should throw trying to call getSharedVersionsOfAttribute with a nonexistent attributeId", async () => {
            const result2 = await services1.consumption.attributes.getSharedVersionsOfAttribute({ attributeId: "ATTxxxxxxxxxxxxxxxxx", peer: services3.address });
            expect(result2).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });
    });
});

describe("DeleteAttributeUseCases", () => {
    describe("Delete IdentityAttributes", () => {
        let ownIdentityAttributeVersion0: LocalAttributeDTO;
        let ownIdentityAttributeVersion1: LocalAttributeDTO;

        beforeEach(async () => {
            ownIdentityAttributeVersion0 = await executeFullCreateAndShareOwnIdentityAttributeFlow(services1, services2, {
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "aGivenName"
                    },
                    tags: ["x:tag1", "x:tag2"]
                }
            });

            ({ predecessor: ownIdentityAttributeVersion0, successor: ownIdentityAttributeVersion1 } = await executeFullSucceedOwnIdentityAttributeAndNotifyPeerFlow(
                services1,
                services2,
                {
                    predecessorId: ownIdentityAttributeVersion0.id,
                    successorContent: {
                        value: {
                            "@type": "GivenName",
                            value: "anotherGivenName"
                        }
                    }
                }
            ));
        });

        describe(DeleteOwnIdentityAttributeAndNotifyPeersUseCase.name, () => {
            test("should delete an own IdentityAttribute", async () => {
                const deletionResult = await services1.consumption.attributes.deleteOwnIdentityAttributeAndNotifyPeers({ attributeId: ownIdentityAttributeVersion0.id });
                expect(deletionResult).toBeSuccessful();

                const getDeletedAttributeResult = await services1.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion0.id });
                expect(getDeletedAttributeResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
            });

            test("should delete a succeeded own IdentityAttribute and its predecessors", async () => {
                const deletionResult = await services1.consumption.attributes.deleteOwnIdentityAttributeAndNotifyPeers({ attributeId: ownIdentityAttributeVersion1.id });
                expect(deletionResult).toBeSuccessful();

                const getDeletedAttributeResult = await services1.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion0.id });
                expect(getDeletedAttributeResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
            });

            test("should set 'succeeds' of successor own IdentityAttribute to undefined if predecessor own IdentityAttribute is deleted", async () => {
                expect(ownIdentityAttributeVersion1.succeeds).toBeDefined();
                await services1.consumption.attributes.deleteOwnIdentityAttributeAndNotifyPeers({ attributeId: ownIdentityAttributeVersion0.id });
                const updatedOwnIdentityAttributeVersion1 = (await services1.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion1.id })).value;
                expect(updatedOwnIdentityAttributeVersion1.succeeds).toBeUndefined();
            });

            test("should notify about deletion of own IdentityAttribute", async () => {
                await services1.consumption.attributes.deleteOwnIdentityAttributeAndNotifyPeers({ attributeId: ownIdentityAttributeVersion0.id });

                const timeBeforeUpdate = CoreDate.utc();
                // await syncUntilHasMessageWithNotification(services2.transport, notificationId);
                await services2.eventBus.waitForEvent(OwnSharedAttributeDeletedByOwnerEvent, (e) => {
                    return e.data.id.toString() === ownIdentityAttributeVersion0.id;
                });
                const timeAfterUpdate = CoreDate.utc();

                const updatedPeerIdentityAttribute = (await services2.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion0.id })).value;
                expect(updatedPeerIdentityAttribute.peerSharingInfo!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByOwner);
                expect(CoreDate.from(updatedPeerIdentityAttribute.peerSharingInfo!.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))).toBe(true);
            });

            test("should notify about deletion of succeeded own IdentityAttribute", async () => {
                await services1.consumption.attributes.deleteOwnIdentityAttributeAndNotifyPeers({ attributeId: ownIdentityAttributeVersion1.id });

                const timeBeforeUpdate = CoreDate.utc();
                // await syncUntilHasMessageWithNotification(services2.transport, notificationId);
                await services2.eventBus.waitForEvent(OwnSharedAttributeDeletedByOwnerEvent, (e) => {
                    return e.data.id.toString() === ownIdentityAttributeVersion1.id;
                });
                const timeAfterUpdate = CoreDate.utc();

                const updatedPeerIdentityAttributePredecessor = (await services2.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion0.id })).value;
                expect(updatedPeerIdentityAttributePredecessor.peerSharingInfo!.deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByOwner);
                expect(CoreDate.from(updatedPeerIdentityAttributePredecessor.peerSharingInfo!.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))).toBe(
                    true
                );
            });

            test("should throw trying to call with an attribute that is not an own IdentityAttribute", async () => {
                const peerIdentityAttribute = (await services2.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion0.id })).value;
                const result = await services2.consumption.attributes.deleteOwnIdentityAttributeAndNotifyPeers({ attributeId: peerIdentityAttribute.id });
                expect(result).toBeAnError(/.*/, "error.runtime.attributes.isNotOwnIdentityAttribute");
            });

            test("should throw trying to call with an unknown attribute ID", async () => {
                const unknownAttributeId = "ATTxxxxxxxxxxxxxxxxx";
                const result = await services1.consumption.attributes.deleteOwnIdentityAttributeAndNotifyPeers({ attributeId: unknownAttributeId });
                expect(result).toBeAnError(/.*/, "error.runtime.recordNotFound");
            });
        });

        describe(DeletePeerIdentityAttributeAndNotifyOwnerUseCase.name, () => {
            test("should delete a peer IdentityAttribute", async () => {
                const recipientPeerIdentityAttributeVersion0 = (await services2.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion0.id })).value;
                expect(recipientPeerIdentityAttributeVersion0).toBeDefined();

                const deletionResult = await services2.consumption.attributes.deletePeerIdentityAttributeAndNotifyOwner({ attributeId: ownIdentityAttributeVersion0.id });
                expect(deletionResult).toBeSuccessful();

                const getDeletedAttributeResult = await services2.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion0.id });
                expect(getDeletedAttributeResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
            });

            test("should delete the predecessor of a peer IdentityAttribute", async () => {
                const recipientPeerSharedIdentityAttributeVersion1 = (await services2.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion1.id })).value;
                expect(recipientPeerSharedIdentityAttributeVersion1).toBeDefined();

                const deletionResult = await services2.consumption.attributes.deletePeerIdentityAttributeAndNotifyOwner({ attributeId: ownIdentityAttributeVersion1.id });
                expect(deletionResult).toBeSuccessful();

                const getDeletedPredecessorResult = await services2.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion0.id });
                expect(getDeletedPredecessorResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
            });

            test("should set the 'succeeds' property of the peer IdentityAttribute successor to undefined", async () => {
                const recipientPeerSharedIdentityAttributeVersion1 = (await services2.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion1.id })).value;
                expect(recipientPeerSharedIdentityAttributeVersion1.succeeds).toBeDefined();
                await services2.consumption.attributes.deletePeerIdentityAttributeAndNotifyOwner({ attributeId: ownIdentityAttributeVersion0.id });
                const updatedRecipientPeerSharedIdentityAttributeVersion1 = (
                    await services2.consumption.attributes.getAttribute({ id: recipientPeerSharedIdentityAttributeVersion1.id })
                ).value;
                expect(updatedRecipientPeerSharedIdentityAttributeVersion1.succeeds).toBeUndefined();
            });

            test("should notify about deletion of peer IdentityAttribute", async () => {
                await services2.consumption.attributes.deletePeerIdentityAttributeAndNotifyOwner({ attributeId: ownIdentityAttributeVersion0.id });

                const timeBeforeUpdate = CoreDate.utc();
                // await syncUntilHasMessageWithNotification(services1.transport, notificationId);
                await services1.eventBus.waitForEvent(PeerSharedAttributeDeletedByPeerEvent, (e) => {
                    return e.data.id.toString() === ownIdentityAttributeVersion0.id;
                });

                const timeAfterUpdate = CoreDate.utc();

                const updatedOwnIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion0.id })).value;
                expect(updatedOwnIdentityAttribute.forwardedSharingInfos![0].deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);
                expect(CoreDate.from(updatedOwnIdentityAttribute.forwardedSharingInfos![0].deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))).toBe(
                    true
                );
            });

            test("should notify about deletion of succeeded peer IdentityAttribute", async () => {
                await services2.consumption.attributes.deletePeerIdentityAttributeAndNotifyOwner({ attributeId: ownIdentityAttributeVersion1.id });

                const timeBeforeUpdate = CoreDate.utc();
                // await syncUntilHasMessageWithNotification(services1.transport, notificationId);
                await services1.eventBus.waitForEvent(PeerSharedAttributeDeletedByPeerEvent, (e) => {
                    return e.data.id.toString() === ownIdentityAttributeVersion1.id;
                });

                const timeAfterUpdate = CoreDate.utc();

                const updatedOwnIdentityAttributePredecessor = (await services1.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion0.id })).value;
                expect(updatedOwnIdentityAttributePredecessor.forwardedSharingInfos![0].deletionInfo!.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);
                expect(
                    CoreDate.from(updatedOwnIdentityAttributePredecessor.forwardedSharingInfos![0].deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))
                ).toBe(true);
            });

            // TODO: is this actually the expected behavior?
            test("should throw an error trying to delete a peer IdentityAttribute when the Relationship is in status Pending", async () => {
                const [services1, services2] = await runtimeServiceProvider.launch(2, {
                    enableRequestModule: true,
                    enableDeciderModule: true,
                    enableNotificationModule: true
                });

                const ownIdentityAttribute = (
                    await services1.consumption.attributes.createOwnIdentityAttribute({
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
                    attribute: ownIdentityAttribute.content,
                    sourceAttributeId: ownIdentityAttribute.id
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

                const peerIdentityAttribute = (await services2.consumption.attributes.getAttribute({ id: ownIdentityAttribute.id })).value;

                const attributeDeletionResult = await services2.consumption.attributes.deletePeerIdentityAttributeAndNotifyOwner({ attributeId: peerIdentityAttribute.id });
                expect(attributeDeletionResult).toBeAnError(
                    "The shared Attribute cannot be deleted while the Relationship to the peer is in status 'Pending'.",
                    "error.runtime.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending"
                );
            });
        });
    });

    // TODO:
    describe(DeleteOwnRelationshipAttributeAndNotifyPeersUseCase.name, () => {
        test("should delete an own RelationshipAttribute", async () => {
            expect(ownSharedIdentityAttributeVersion0).toBeDefined();

            const deletionResult = await services1.consumption.attributes.deleteOwnRelationshipAttributeAndNotifyPeers({ attributeId: ownSharedIdentityAttributeVersion0.id });
            expect(deletionResult).toBeSuccessful();

            const getDeletedAttributeResult = await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion0.id });
            expect(getDeletedAttributeResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("should delete a succeeded own RelationshipAttribute and its predecessors", async () => {
            expect(ownSharedIdentityAttributeVersion1).toBeDefined();

            const deletionResult = await services1.consumption.attributes.deleteOwnRelationshipAttributeAndNotifyPeers({ attributeId: ownSharedIdentityAttributeVersion1.id });
            expect(deletionResult).toBeSuccessful();

            const getDeletedPredecessorResult = await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion0.id });
            expect(getDeletedPredecessorResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("should set the 'succeeds' property of the own RelationshipAttribute successor to undefined", async () => {
            expect(ownSharedIdentityAttributeVersion1.succeeds).toBeDefined();
            await services1.consumption.attributes.deleteOwnRelationshipAttributeAndNotifyPeers({ attributeId: ownSharedIdentityAttributeVersion0.id });
            const updatedOwnSharedIdentityAttributeVersion1 = (await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion1.id })).value;
            expect(updatedOwnSharedIdentityAttributeVersion1.succeeds).toBeUndefined();
        });

        test("should notify about deletion of own RelationshipAttribute", async () => {
            const notificationId = (await services1.consumption.attributes.deleteOwnRelationshipAttributeAndNotifyPeers({ attributeId: ownSharedIdentityAttributeVersion0.id }))
                .value.notificationId!;
            const timeBeforeUpdate = CoreDate.utc();
            await syncUntilHasMessageWithNotification(services2.transport, notificationId);
            await services2.eventBus.waitForEvent(OwnSharedAttributeDeletedByOwnerEvent, (e) => {
                return e.data.id.toString() === ownSharedIdentityAttributeVersion0.id;
            });
            const timeAfterUpdate = CoreDate.utc();

            const result = await services2.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion0.id });
            expect(result).toBeSuccessful();
            const updatedAttribute = result.value;
            expect(updatedAttribute.deletionInfo?.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByOwner);
            expect(CoreDate.from(updatedAttribute.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))).toBe(true);
        });

        test("should notify about deletion of succeeded own RelationshipAttribute", async () => {
            const notificationId = (await services1.consumption.attributes.deleteOwnRelationshipAttributeAndNotifyPeers({ attributeId: ownSharedIdentityAttributeVersion1.id }))
                .value.notificationId!;
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

        test("should throw an error trying to delete an own RelationshipAttribute if the Relationship is in status Pending", async () => {
            const [services1, services2] = await runtimeServiceProvider.launch(2, {
                enableRequestModule: true,
                enableDeciderModule: true,
                enableNotificationModule: true
            });

            const repositoryAttribute = (
                await services2.consumption.attributes.createOwnIdentityAttribute({
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

            const attributeDeletionResult = await services2.consumption.attributes.deleteOwnRelationshipAttributeAndNotifyPeers({ attributeId: ownSharedAttribute.value[0].id });
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
            expect(deletionResult).toBeSuccessful();

            const getDeletedAttributeResult = await services1.consumption.attributes.getAttribute({ id: emittedThirdPartyRelationshipAttribute.id });
            expect(getDeletedAttributeResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("should delete a ThirdPartyRelationshipAttribute as the recipient of it", async () => {
            const receivedThirdPartyRelationshipAttribute = (await services2.consumption.attributes.getAttribute({ id: emittedThirdPartyRelationshipAttribute.id })).value;
            expect(receivedThirdPartyRelationshipAttribute).toBeDefined();

            const deletionResult = await services2.consumption.attributes.deleteThirdPartyRelationshipAttributeAndNotifyPeer({
                attributeId: receivedThirdPartyRelationshipAttribute.id
            });
            expect(deletionResult).toBeSuccessful();

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
            expect(result).toBeSuccessful();
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
            expect(result).toBeSuccessful();
            const updatedAttribute = result.value;
            expect(updatedAttribute.deletionInfo?.deletionStatus).toStrictEqual(LocalAttributeDeletionStatus.DeletedByPeer);
            expect(CoreDate.from(updatedAttribute.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))).toBe(true);
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
            const attributeDeletionResult = await services3.consumption.attributes.deletePeerIdentityAttributeAndNotifyOwner({
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
        await executeFullCreateAndShareOwnIdentityAttributeFlow(services1, services2, {
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

        const peerSharedAttributes = (await services2.consumption.attributes.getPeerAttributes({ peer: services1.address })).value;
        expect(peerSharedAttributes).toHaveLength(1);
        expect(peerSharedAttributes[0].deletionInfo!.deletionStatus).toBe(LocalAttributeDeletionStatus.DeletedByOwner);

        const relationship = (await services2.transport.relationships.getRelationship({ id: relationshipId })).value;
        const deletionDate = relationship.auditLog[relationship.auditLog.length - 1].createdAt;
        expect(peerSharedAttributes[0].deletionInfo!.deletionDate).toStrictEqual(deletionDate);
    });

    test("own shared Attributes should be marked as deleted for peer", async () => {
        await executeFullCreateAndShareOwnIdentityAttributeFlow(services2, services1, {
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

        const ownSharedAttributes = (await services2.consumption.attributes.getOwnAttributesSharedWithPeer({ peer: services1.address })).value;
        expect(ownSharedAttributes).toHaveLength(1);
        expect(ownSharedAttributes[0].deletionInfo!.deletionStatus).toBe(LocalAttributeDeletionStatus.DeletedByPeer);

        const relationship = (await services2.transport.relationships.getRelationship({ id: relationshipId })).value;
        const deletionDate = relationship.auditLog[relationship.auditLog.length - 1].createdAt;
        expect(ownSharedAttributes[0].deletionInfo!.deletionDate).toStrictEqual(deletionDate);
    });

    test("peer shared Attributes should not be updated if they are already marked as deleted", async () => {
        const sharedAttribute = await executeFullCreateAndShareOwnIdentityAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenNameServices1"
                }
            }
        });

        const notificationId = (await services1.consumption.attributes.deleteOwnRelationshipAttributeAndNotifyPeers({ attributeId: sharedAttribute.id })).value.notificationId!;
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
        const sharedAttribute = await executeFullCreateAndShareOwnIdentityAttributeFlow(services2, services1, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenNameServices2"
                }
            }
        });

        const notificationId = (await services1.consumption.attributes.deletePeerIdentityAttributeAndNotifyOwner({ attributeId: sharedAttribute.id })).value.notificationId!;
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
        const request: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                }
            }
        };
        const localAttribute = (await services1.consumption.attributes.createOwnIdentityAttribute(request)).value;
        expect(localAttribute.wasViewedAt).toBeUndefined();

        const expectedViewingTime = CoreDate.utc();
        const updatedLocalAttribute = (await services1.consumption.attributes.markAttributeAsViewed({ attributeId: localAttribute.id })).value;

        expect(updatedLocalAttribute.wasViewedAt).toBeDefined();
        const actualViewingTime = CoreDate.from(updatedLocalAttribute.wasViewedAt!);
        expect(actualViewingTime.isSameOrAfter(expectedViewingTime)).toBe(true);

        await expect(services1.eventBus).toHavePublished(AttributeWasViewedAtChangedEvent, (m) => m.data.id === localAttribute.id);
    });
});
