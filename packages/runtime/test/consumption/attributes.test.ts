import { AcceptRequestItemParametersJSON } from "@nmshd/consumption";
import {
    CreateAttributeRequestItemJSON,
    DeleteAttributeRequestItem,
    GivenNameJSON,
    ReadAttributeRequestItem,
    RelationshipAttributeConfidentiality,
    ShareAttributeRequestItem,
    ShareAttributeRequestItemJSON,
    ThirdPartyRelationshipAttributeQuery,
    ThirdPartyRelationshipAttributeQueryOwner
} from "@nmshd/content";
import { CoreDate, CoreId, CoreIdHelper } from "@nmshd/core-types";
import assert from "assert";
import {
    AttributeCreatedEvent,
    AttributeSucceededEvent,
    AttributeWasViewedAtChangedEvent,
    CanCreateOwnIdentityAttributeRequest,
    CanCreateOwnIdentityAttributeUseCase,
    ChangeDefaultOwnIdentityAttributeUseCase,
    CreateAndShareRelationshipAttributeRequest,
    CreateAndShareRelationshipAttributeUseCase,
    CreateOwnIdentityAttributeRequest,
    CreateOwnIdentityAttributeUseCase,
    CreateOwnRelationshipTemplateRequest,
    DeleteAttributeAndNotifyUseCase,
    ExecuteIdentityAttributeQueryUseCase,
    ExecuteRelationshipAttributeQueryUseCase,
    ExecuteThirdPartyRelationshipAttributeQueryUseCase,
    ForwardedAttributeDeletedByPeerEvent,
    GetAttributeUseCase,
    GetAttributesUseCase,
    GetOwnAttributesSharedWithPeerUseCase,
    GetOwnIdentityAttributesUseCase,
    GetPeerAttributesUseCase,
    GetVersionsOfAttributeSharedWithPeerUseCase,
    GetVersionsOfAttributeUseCase,
    LocalAttributeDTO,
    MarkAttributeAsViewedUseCase,
    NotifyPeerAboutOwnIdentityAttributeSuccessionUseCase,
    OutgoingRequestFromRelationshipCreationCreatedAndCompletedEvent,
    OwnAttributeDeletedByOwnerEvent,
    PeerRelationshipAttributeDeletedByPeerEvent,
    RelationshipChangedEvent,
    RelationshipStatus,
    SetAttributeDeletionInfoOfDeletionProposedRelationshipUseCase,
    ShareOwnIdentityAttributeRequest,
    ShareOwnIdentityAttributeUseCase,
    SucceedOwnIdentityAttributeRequest,
    SucceedOwnIdentityAttributeUseCase,
    SucceedRelationshipAttributeAndNotifyPeerUseCase
} from "../../src";
import {
    RuntimeServiceProvider,
    TestRuntimeServices,
    acceptIncomingCreateOrShareAttributeRequest,
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
            enableDefaultOwnIdentityAttributes: true,
            enableRequestModule: true,
            enableDeciderModule: true
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

        test("should allow to get an Attribute by type", async function () {
            const result = await services1.consumption.attributes.getAttributes({ query: { "@type": "OwnIdentityAttribute" } });
            expect(result).toBeSuccessful();

            const attributes = result.value;
            expect(attributes).toHaveLength(3);
            expect(attributes.map((attribute) => attribute.id)).toStrictEqual(expect.arrayContaining(identityAttributeIds));
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

        test("should allow to get only default OwnIdentityAttributes", async function () {
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

        test("should allow get Attributes that are not default OwnIdentityAttributes", async function () {
            const result = await appService.consumption.attributes.getAttributes({
                query: { isDefault: "!true" }
            });
            expect(result).toBeSuccessful();

            const attributes = result.value;
            expect(attributes).toHaveLength(1);

            expect(attributes[0].id).toBe(appAttributeIds[2]);
        });

        test("should allow to get an Attribute by peer of peerSharingDetails", async function () {
            const result = await services1.consumption.attributes.getAttributes({ query: { "peerSharingDetails.peer": services2.address } });
            expect(result).toBeSuccessful();

            const attributes = result.value;
            expect(attributes).toHaveLength(1);
            expect(attributes[0].id).toBe(relationshipAttributeId);
        });

        test("should allow to get an Attribute by peer of forwardedSharingDetails", async function () {
            const identityAttribute = (await services1.consumption.attributes.getAttribute({ id: identityAttributeIds[0] })).value;
            await executeFullShareAndAcceptAttributeRequestFlow(
                services1,
                services2,
                ShareAttributeRequestItem.from({
                    attribute: identityAttribute.content,
                    attributeId: identityAttribute.id,
                    mustBeAccepted: true
                })
            );

            const result = await services1.consumption.attributes.getAttributes({ query: { "forwardedSharingDetails.peer": services2.address } });
            expect(result).toBeSuccessful();

            const attributes = result.value;
            expect(attributes).toHaveLength(1);
            expect(attributes[0].id).toBe(identityAttribute.id);
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

describe("get OwnIdentityAttributes, own Attributes shared with peer and peer Attributes", () => {
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
        test("get only latest version of OwnIdentityAttributes", async () => {
            const result = await services1.consumption.attributes.getOwnIdentityAttributes({});
            expect(result).toBeSuccessful();
            const ownIdentityAttributes = result.value;
            expect(ownIdentityAttributes).toStrictEqual([services1OwnSurnameV1, services1OwnGivenNameV1]);
        });

        test("get all versions of OwnIdentityAttributes", async () => {
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
        // point of view of services 2 => own attributes are peer attributes
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
    const canCreateOwnIdentityAttributeRequest: CanCreateOwnIdentityAttributeRequest = {
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

    test("should allow to create an OwnIdentityAttribute", async () => {
        const result = await services1.consumption.attributes.canCreateOwnIdentityAttribute(canCreateOwnIdentityAttributeRequest);
        expect(result.value.isSuccess).toBe(true);
    });

    test("should not allow to create an OwnIdentityAttribute duplicate", async () => {
        const ownIdentityAttribute = (await services1.consumption.attributes.createOwnIdentityAttribute(canCreateOwnIdentityAttributeRequest)).value;

        const result = await services1.consumption.attributes.canCreateOwnIdentityAttribute(canCreateOwnIdentityAttributeRequest);

        assert(!result.value.isSuccess);

        expect(result.value.isSuccess).toBe(false);
        expect(result.value.message).toBe(
            `The OwnIdentityAttribute cannot be created because it has the same content.value as the already existing OwnIdentityAttribute with id '${ownIdentityAttribute.id.toString()}'.`
        );
        expect(result.value.code).toBe("error.runtime.attributes.cannotCreateDuplicateOwnIdentityAttribute");
    });

    test("should not allow to create an OwnIdentityAttribute if there exists a duplicate after trimming", async () => {
        const canCreateUntrimmedOwnIdentityAttributeRequest: CanCreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "    aGivenName  "
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };
        const ownIdentityAttribute = (await services1.consumption.attributes.createOwnIdentityAttribute(canCreateOwnIdentityAttributeRequest)).value;

        const result = await services1.consumption.attributes.canCreateOwnIdentityAttribute(canCreateUntrimmedOwnIdentityAttributeRequest);

        assert(!result.value.isSuccess);

        expect(result.value.isSuccess).toBe(false);
        expect(result.value.message).toBe(
            `The OwnIdentityAttribute cannot be created because it has the same content.value as the already existing OwnIdentityAttribute with id '${ownIdentityAttribute.id.toString()}'.`
        );
        expect(result.value.code).toBe("error.runtime.attributes.cannotCreateDuplicateOwnIdentityAttribute");
    });

    test("should not allow to create a duplicate OwnIdentityAttribute even if the tags are different", async () => {
        const createAttributeRequest: CreateOwnIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenName"
                },
                tags: ["x:tag1", "x:tag2"]
            }
        };
        const ownIdentityAttribute = (await services1.consumption.attributes.createOwnIdentityAttribute(createAttributeRequest)).value;

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
            `The OwnIdentityAttribute cannot be created because it has the same content.value as the already existing OwnIdentityAttribute with id '${ownIdentityAttribute.id.toString()}'.`
        );
        expect(result.value.code).toBe("error.runtime.attributes.cannotCreateDuplicateOwnIdentityAttribute");
    });

    test("should allow to create another OwnIdentityAttribute even if the tags are duplicates", async () => {
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

    test("should allow to create an OwnIdentityAttribute duplicate of a predecessor", async () => {
        const predecessor = await services1.consumption.attributes.createOwnIdentityAttribute(canCreateOwnIdentityAttributeRequest);
        await services1.consumption.attributes.succeedOwnIdentityAttribute({
            predecessorId: predecessor.value.id,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "anotherGivenName"
                }
            }
        });

        const result = await services1.consumption.attributes.canCreateOwnIdentityAttribute(canCreateOwnIdentityAttributeRequest);
        expect(result.value.isSuccess).toBe(true);
    });

    test("should allow to create an OwnIdentityAttribute that is the same as an existing OwnIdentityAttribute without an optional property", async () => {
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

    test("should not allow to create an OwnIdentityAttribute with invalid tags", async () => {
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
    test("should create an OwnIdentityAttribute", async () => {
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

    test("should trim an OwnIdentityAttribute before creation", async () => {
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

    test("should create an OwnIdentityAttribute that is the default if it is the first of its value type", async () => {
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

    test("should create an OwnIdentityAttribute that is not the default if it is not the first of its value type", async () => {
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

    test("should not create a duplicate OwnIdentityAttribute", async () => {
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
            `The OwnIdentityAttribute cannot be created because it has the same content.value as the already existing OwnIdentityAttribute with id '${result.value.id.toString()}'.`,
            "error.runtime.attributes.cannotCreateDuplicateOwnIdentityAttribute"
        );
    });

    test("should not create an OwnIdentityAttribute if there would be a duplicate after trimming", async () => {
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
            `The OwnIdentityAttribute cannot be created because it has the same content.value as the already existing OwnIdentityAttribute with id '${result.value.id.toString()}'.`,
            "error.runtime.attributes.cannotCreateDuplicateOwnIdentityAttribute"
        );
    });

    test("should not prevent the creation when the OwnIdentityAttribute duplicate got succeeded", async () => {
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

    test("should create an OwnIdentityAttribute that is the same as an existing OwnIdentityAttribute without an optional property", async () => {
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

    test("should not create a duplicate OwnIdentityAttribute even if the tags are different", async () => {
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
            `The OwnIdentityAttribute cannot be created because it has the same content.value as the already existing OwnIdentityAttribute with id '${result.value.id.toString()}'.`,
            "error.runtime.attributes.cannotCreateDuplicateOwnIdentityAttribute"
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
            `The OwnIdentityAttribute cannot be created because it has the same content.value as the already existing OwnIdentityAttribute with id '${result.value.id.toString()}'.`,
            "error.runtime.attributes.cannotCreateDuplicateOwnIdentityAttribute"
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
            `The OwnIdentityAttribute cannot be created because it has the same content.value as the already existing OwnIdentityAttribute with id '${result.value.id.toString()}'.`,
            "error.runtime.attributes.cannotCreateDuplicateOwnIdentityAttribute"
        );
    });

    test("should create an OwnIdentityAttribute even if the tags are duplicates", async () => {
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

    test("should send a sharing request containing an OwnIdentityAttribute", async () => {
        const shareRequest: ShareOwnIdentityAttributeRequest = {
            attributeId: sOwnIdentityAttribute.id,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareOwnIdentityAttribute(shareRequest);
        expect(shareRequestResult).toBeSuccessful();

        const shareRequestId = shareRequestResult.value.id;
        const sUpdatedOwnIdentityAttribute = await acceptIncomingCreateOrShareAttributeRequest(services1, services2, shareRequestId);
        expect(sUpdatedOwnIdentityAttribute.forwardedSharingDetails![0].peer).toBe(services2.address);
        expect(sUpdatedOwnIdentityAttribute.forwardedSharingDetails![0].sourceReference).toBe(shareRequestId);

        const rPeerIdentityAttribute = (await services2.consumption.attributes.getAttribute({ id: sOwnIdentityAttribute.id })).value;
        expect(sOwnIdentityAttribute.content).toStrictEqual(rPeerIdentityAttribute.content);
        expect(sOwnIdentityAttribute.id).toBe(rPeerIdentityAttribute.id);
    });

    test("should send a sharing request containing an OwnIdentityAttribute with metadata", async () => {
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

    test("should send a sharing request containing an OwnIdentityAttribute that was already shared but deleted by the peer", async () => {
        const shareRequest: ShareOwnIdentityAttributeRequest = {
            attributeId: sOwnIdentityAttribute.id,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareOwnIdentityAttribute(shareRequest);

        const shareRequestId = shareRequestResult.value.id;
        await acceptIncomingCreateOrShareAttributeRequest(services1, services2, shareRequestId);

        const rPeerIdentityAttribute = (await services2.consumption.attributes.getAttribute({ id: sOwnIdentityAttribute.id })).value;
        const deleteResult = await services2.consumption.attributes.deleteAttributeAndNotify({ attributeId: rPeerIdentityAttribute.id });
        const notificationId = deleteResult.value.notificationIds[0];

        await syncUntilHasMessageWithNotification(services1.transport, notificationId);
        await services1.eventBus.waitForEvent(ForwardedAttributeDeletedByPeerEvent, (e) => {
            return e.data.id === sOwnIdentityAttribute.id;
        });
        const sUpdatedOwnIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: sOwnIdentityAttribute.id })).value;
        expect(sUpdatedOwnIdentityAttribute.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toBe("DeletedByRecipient");

        const shareRequestResult2 = await services1.consumption.attributes.shareOwnIdentityAttribute(shareRequest);
        expect(shareRequestResult2).toBeSuccessful();
    });

    test("should send a sharing request containing an OwnIdentityAttribute that was already shared but is to be deleted by the peer", async () => {
        const shareRequest: ShareOwnIdentityAttributeRequest = {
            attributeId: sOwnIdentityAttribute.id,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareOwnIdentityAttribute(shareRequest);

        const shareRequestId = shareRequestResult.value.id;
        await acceptIncomingCreateOrShareAttributeRequest(services1, services2, shareRequestId);

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
        expect(sUpdatedOwnIdentityAttribute.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toBe("ToBeDeletedByRecipient");

        const shareRequestResult2 = await services1.consumption.attributes.shareOwnIdentityAttribute(shareRequest);
        expect(shareRequestResult2).toBeSuccessful();
    });

    test("should reject attempts to share the same OwnIdentityAttribute more than once with the same peer", async () => {
        await executeFullShareOwnIdentityAttributeFlow(services1, services3, sOwnIdentityAttribute.id);

        const repeatedShareRequestResult = await services1.consumption.attributes.shareOwnIdentityAttribute({
            attributeId: sOwnIdentityAttribute.id,
            peer: services3.address
        });

        expect(repeatedShareRequestResult).toBeAnError(
            `The Attribute with the given attributeId '${sOwnIdentityAttribute.id}' is already shared with the peer.`,
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

        const { successor: successorOwnIdentityAttribute } = (
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
            attributeId: successorOwnIdentityAttribute.id,
            peer: services2.address
        });
        expect(response).toBeAnError(
            `The predecessor '${predecesssorOwnIdentityAttribute.id}' of the Attribute is already shared with the peer. Instead of sharing it, you should notify the peer about the Attribute succession.`,
            "error.consumption.requests.invalidRequestItem"
        );
    });

    test("should reject sharing a PeerIdentityAttribute", async () => {
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

    test("should throw if OwnIdentityAttribute doesn't exist", async () => {
        const shareRequest: ShareOwnIdentityAttributeRequest = {
            attributeId: (await new CoreIdHelper("ATT").generate()).toString(),
            peer: services1.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareOwnIdentityAttribute(shareRequest);
        expect(shareRequestResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("should throw if id of OwnIdentityAttribute is invalid ", async () => {
        const shareRequest: ShareOwnIdentityAttributeRequest = {
            attributeId: CoreId.from("faulty").toString(),
            peer: services1.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareOwnIdentityAttribute(shareRequest);
        expect(shareRequestResult).toBeAnError(/.*/, "error.runtime.validation.invalidPropertyValue");
    });
});

describe(SucceedOwnIdentityAttributeUseCase.name, () => {
    test("should succeed an OwnIdentityAttribute", async () => {
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
        await services1.eventBus.waitForEvent(AttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === updatedPredecessor.id && e.data.successor.id === successor.id;
        });
    });

    test("should trim the successor of an OwnIdentityAttribute", async () => {
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
        await services1.eventBus.waitForEvent(AttributeSucceededEvent, (e) => {
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

    afterEach(async () => await services2.transport.account.syncEverything());

    test("should successfully notify peer about attribute succession", async () => {
        const notificationResult = await services1.consumption.attributes.notifyPeerAboutOwnIdentityAttributeSuccession({
            attributeId: ownIdentityAttributeVersion1.id,
            peer: services2.address
        });
        expect(notificationResult).toBeSuccessful();
    });

    test("should add forwardedSharingDetails to successor of OwnIdentityAttribute of sender", async () => {
        const { successor: updatedOwnIdentityAttributeVersion1 } = await executeFullNotifyPeerAboutAttributeSuccessionFlow(services1, services2, ownIdentityAttributeVersion1.id);
        expect(updatedOwnIdentityAttributeVersion1.forwardedSharingDetails![0].peer).toBe(services2.address);
    });

    test("should create successor PeerIdentityAttribute for recipient", async () => {
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
        const deleteResult = await services2.consumption.attributes.deleteAttributeAndNotify({ attributeId: ownIdentityAttributeVersion0.id });
        const notificationId = deleteResult.value.notificationIds[0];

        await syncUntilHasMessageWithNotification(services1.transport, notificationId);
        await services1.eventBus.waitForEvent(ForwardedAttributeDeletedByPeerEvent, (e) => {
            return e.data.id === ownIdentityAttributeVersion0.id;
        });
        const updatedOwnIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion0.id })).value;
        expect(updatedOwnIdentityAttribute.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toBe("DeletedByRecipient");

        await executeFullShareOwnIdentityAttributeFlow(services1, services2, ownIdentityAttributeVersion0.id);

        const result = await services1.consumption.attributes.notifyPeerAboutOwnIdentityAttributeSuccession({
            attributeId: ownIdentityAttributeVersion2.id,
            peer: services2.address
        });
        expect(result).toBeSuccessful();
    });

    test("should throw if the predecessor was deleted by the peer", async () => {
        const deleteResult = await services2.consumption.attributes.deleteAttributeAndNotify({ attributeId: ownIdentityAttributeVersion0.id });
        const notificationId = deleteResult.value.notificationIds[0];

        await syncUntilHasMessageWithNotification(services1.transport, notificationId);
        await services1.eventBus.waitForEvent(ForwardedAttributeDeletedByPeerEvent, (e) => {
            return e.data.id === ownIdentityAttributeVersion0.id;
        });
        const updatedOwnIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion0.id })).value;
        expect(updatedOwnIdentityAttribute.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toBe("DeletedByRecipient");

        const notificationResult = await services1.consumption.attributes.notifyPeerAboutOwnIdentityAttributeSuccession({
            attributeId: ownIdentityAttributeVersion1.id,
            peer: services2.address
        });
        expect(notificationResult).toBeAnError(/.*/, "error.runtime.attributes.peerHasNoPreviousVersionOfAttribute");
    });

    test("should throw if the successor OwnIdentityAttribute was deleted", async () => {
        await services1.consumption.attributes.deleteAttributeAndNotify({ attributeId: ownIdentityAttributeVersion1.id });

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
        expect(notificationResult).toBeAnError(/.*/, "error.runtime.attributes.successorOfOwnIdentityAttributeHasAlreadyBeenSharedWithPeer");
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
        const sOwnRelationshipAttribute = await acceptIncomingCreateOrShareAttributeRequest(services1, services2, requestId);
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

    test("should succeed an OwnRelationshipAttribute and notify peer", async () => {
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

        await waitForRecipientToReceiveNotification(services2, result.value);

        const senderPredecessor = result.value.predecessor;
        const senderSuccessor = result.value.successor;
        const recipientPredecessor = (await services2.consumption.attributes.getAttribute({ id: senderPredecessor.id })).value;
        const recipientSuccessor = (await services2.consumption.attributes.getAttribute({ id: senderSuccessor.id })).value;

        expect(senderSuccessor.content).toStrictEqual(recipientSuccessor.content);
        expect(senderSuccessor.peerSharingDetails!.sourceReference).toBe(recipientSuccessor.peerSharingDetails!.sourceReference);
        expect(senderSuccessor.peerSharingDetails!.peer).toBe(services2.address);
        expect(recipientSuccessor.peerSharingDetails!.peer).toBe(services1.address);
        expect(senderSuccessor.succeeds).toBe(senderPredecessor.id);
        expect(recipientSuccessor.succeeds).toBe(recipientPredecessor.id);
        expect(senderPredecessor.succeededBy).toBe(senderSuccessor.id);
        expect(recipientPredecessor.succeededBy).toBe(recipientSuccessor.id);
    });

    test("should throw trying to change the value type succeeding an OwnRelationshipAttribute", async () => {
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

        const deleteResult = await services2.consumption.attributes.deleteAttributeAndNotify({ attributeId: rPeerRelationshipAttribute.id });
        const notificationId = deleteResult.value.notificationIds[0];

        await syncUntilHasMessageWithNotification(services1.transport, notificationId);
        await services1.eventBus.waitForEvent(PeerRelationshipAttributeDeletedByPeerEvent, (e) => {
            return e.data.id === sOwnRelationshipAttribute.id;
        });
        const updatedOwnRelationshipAttribute = (await services1.consumption.attributes.getAttribute({ id: sOwnRelationshipAttribute.id })).value;
        expect(updatedOwnRelationshipAttribute.peerSharingDetails!.deletionInfo!.deletionStatus).toBe("DeletedByRecipient");

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
        expect(result).toBeAnError(/.*/, "error.consumption.attributes.cannotSucceedSharedAttributesDeletedByPeer");
    });
});

describe(ChangeDefaultOwnIdentityAttributeUseCase.name, () => {
    test("should change default OwnIdentityAttribute", async () => {
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

    test("should return an error if the new default Attribute is not an OwnIdentityAttribute", async () => {
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
            `Attribute '${desiredSharedDefaultAttribute.id.toString()}' is not an OwnIdentityAttribute.`,
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
        expect(result).toBeAnError("Setting default OwnIdentityAttributes is disabled for this Account.", "error.runtime.attributes.setDefaultOwnIdentityAttributesIsDisabled");
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
            await waitForRecipientToReceiveNotification(services2, notifyResult);

            ({ predecessor: sOwnIdentityAttributeVersion0, successor: sOwnIdentityAttributeVersion2 } = notifyResult);
        }

        async function shareVersion2WithFurtherPeer(): Promise<void> {
            const shareRequestResult = await services1.consumption.attributes.shareOwnIdentityAttribute({
                attributeId: sOwnIdentityAttributeVersion2.id,
                peer: services3.address
            });
            const shareRequestId = shareRequestResult.value.id;
            sOwnIdentityAttributeVersion2 = await acceptIncomingCreateOrShareAttributeRequest(services1, services3, shareRequestId);
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
            await waitForRecipientToReceiveNotification(services2, sOwnRelationshipAttributeSuccessionResult1.value);

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
            await waitForRecipientToReceiveNotification(services2, sOwnRelationshipAttributeSuccessionResult2.value);

            ({ predecessor: sOwnRelationshipAttributeVersion1, successor: sOwnRelationshipAttributeVersion2 } = sOwnRelationshipAttributeSuccessionResult2.value);
        }
    }

    describe(GetVersionsOfAttributeUseCase.name, () => {
        test("should get all versions of an OwnIdentityAttribute", async () => {
            await setUpOwnIdentityAttributeVersions();
            for (const version of sOwnIdentityAttributeVersions) {
                const result = await services1.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result).toBeSuccessful();

                const returnedVersions = result.value;
                expect(returnedVersions).toStrictEqual(sOwnIdentityAttributeVersions);
            }
        });

        test("should get all versions of a PeerIdentityAttribute", async () => {
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

        test("should get all versions of an OwnRelationshipAttribute", async () => {
            await setUpRelationshipAttributeVersions();
            const sOwnRelationshipAttributeVersions = [sOwnRelationshipAttributeVersion2, sOwnRelationshipAttributeVersion1, sOwnRelationshipAttributeVersion0];
            for (const version of sOwnRelationshipAttributeVersions) {
                const result = await services1.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
                expect(result).toBeSuccessful();

                const returnedVersions = result.value;
                expect(returnedVersions).toStrictEqual(sOwnRelationshipAttributeVersions);
            }
        });

        test("should get all versions of a PeerRelationshipAttribute", async () => {
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

    describe(GetVersionsOfAttributeSharedWithPeerUseCase.name, () => {
        beforeEach(async () => {
            await setUpIdentityAttributeVersions();
        });

        test("should get only latest version of an OwnIdentityAttribute shared with a peer", async () => {
            for (const version of sOwnIdentityAttributeVersions) {
                const result1 = await services1.consumption.attributes.getVersionsOfAttributeSharedWithPeer({ attributeId: version.id, peer: services2.address });
                expect(result1.isSuccess).toBe(true);
                const returnedVersions1 = result1.value;
                expect(returnedVersions1).toStrictEqual(expect.arrayContaining([sOwnIdentityAttributeVersion2, sOwnIdentityAttributeVersion2]));

                const result2 = await services1.consumption.attributes.getVersionsOfAttributeSharedWithPeer({
                    attributeId: version.id,
                    peer: services2.address,
                    onlyLatestVersions: true
                });
                expect(result2.isSuccess).toBe(true);
                const returnedVersions2 = result2.value;
                expect(returnedVersions2).toStrictEqual(expect.arrayContaining([sOwnIdentityAttributeVersion2, sOwnIdentityAttributeVersion2]));
            }
        });

        test("should get all versions of an OwnIdentityAttribute shared with a peer", async () => {
            for (const version of sOwnIdentityAttributeVersions) {
                const returnedVersionsForPeer2 = (
                    await services1.consumption.attributes.getVersionsOfAttributeSharedWithPeer({
                        attributeId: version.id,
                        peer: services2.address,
                        onlyLatestVersions: false
                    })
                ).value;
                expect(returnedVersionsForPeer2).toStrictEqual(expect.arrayContaining([sOwnIdentityAttributeVersion2, sOwnIdentityAttributeVersion0]));

                const returnedVersionsForPeer3 = (
                    await services1.consumption.attributes.getVersionsOfAttributeSharedWithPeer({
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

            const result = await services1.consumption.attributes.getVersionsOfAttributeSharedWithPeer({
                attributeId: sOwnRelationshipAttributeVersion0.id,
                peer: services3.address
            });
            expect(result).toBeSuccessful();
            const returnedVersions = result.value;
            expect(returnedVersions).toStrictEqual([forwardedRelationshipAttribute]);
        });

        test("should return an empty list if a RelationshipAttribute that hasn't been forwarded is queried", async () => {
            await createAndShareRelationshipAttributeVersion0();
            const result = await services1.consumption.attributes.getVersionsOfAttributeSharedWithPeer({
                attributeId: sOwnRelationshipAttributeVersion0.id,
                peer: services3.address
            });
            expect(result).toBeSuccessful();
            const returnedVersions = result.value;
            expect(returnedVersions).toStrictEqual([]);
        });

        test("should return an empty list calling getSharedVersionsOfAttribute with a nonexistent peer", async () => {
            const result = await services1.consumption.attributes.getVersionsOfAttributeSharedWithPeer({
                attributeId: sOwnIdentityAttributeVersion2.id,
                peer: "did:e:localhost:dids:0000000000000000000000"
            });
            expect(result).toBeSuccessful();
            const returnedVersions = result.value;
            expect(returnedVersions).toStrictEqual([]);
        });

        test("should throw trying to call getSharedVersionsOfAttribute with a nonexistent attributeId", async () => {
            const result2 = await services1.consumption.attributes.getVersionsOfAttributeSharedWithPeer({ attributeId: "ATTxxxxxxxxxxxxxxxxx", peer: services3.address });
            expect(result2).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });
    });
});

describe(DeleteAttributeAndNotifyUseCase.name, () => {
    describe("Delete IdentityAttributes", () => {
        let ownIdentityAttributeVersion0: LocalAttributeDTO;
        let ownIdentityAttributeVersion1: LocalAttributeDTO;
        let peerIdentityAttributeVersion0: LocalAttributeDTO;
        let peerIdentityAttributeVersion1: LocalAttributeDTO;

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

            peerIdentityAttributeVersion0 = (await services2.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion0.id })).value;
            peerIdentityAttributeVersion1 = (await services2.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion1.id })).value;
        });

        describe("Delete OwnIdentityAttribute", () => {
            test("should delete an OwnIdentityAttribute", async () => {
                const deletionResult = await services1.consumption.attributes.deleteAttributeAndNotify({ attributeId: ownIdentityAttributeVersion0.id });
                expect(deletionResult).toBeSuccessful();

                const getDeletedAttributeResult = await services1.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion0.id });
                expect(getDeletedAttributeResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
            });

            test("should delete a succeeded OwnIdentityAttribute and its predecessors", async () => {
                const deletionResult = await services1.consumption.attributes.deleteAttributeAndNotify({ attributeId: ownIdentityAttributeVersion1.id });
                expect(deletionResult).toBeSuccessful();

                const getDeletedAttributeResult = await services1.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion0.id });
                expect(getDeletedAttributeResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
            });

            test("should set 'succeeds' of successor OwnIdentityAttribute to undefined if predecessor OwnIdentityAttribute is deleted", async () => {
                expect(ownIdentityAttributeVersion1.succeeds).toBeDefined();
                await services1.consumption.attributes.deleteAttributeAndNotify({ attributeId: ownIdentityAttributeVersion0.id });
                const updatedOwnIdentityAttributeVersion1 = (await services1.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion1.id })).value;
                expect(updatedOwnIdentityAttributeVersion1.succeeds).toBeUndefined();
            });

            test("should notify about deletion of OwnIdentityAttribute", async () => {
                const notificationIds = (await services1.consumption.attributes.deleteAttributeAndNotify({ attributeId: ownIdentityAttributeVersion0.id })).value.notificationIds;

                const timeBeforeUpdate = CoreDate.utc();
                await syncUntilHasMessageWithNotification(services2.transport, notificationIds[0]);
                await services2.eventBus.waitForEvent(OwnAttributeDeletedByOwnerEvent, (e) => {
                    return e.data.id.toString() === ownIdentityAttributeVersion0.id;
                });
                const timeAfterUpdate = CoreDate.utc();

                const updatedPeerIdentityAttribute = (await services2.consumption.attributes.getAttribute({ id: peerIdentityAttributeVersion0.id })).value;
                expect(updatedPeerIdentityAttribute.peerSharingDetails!.deletionInfo!.deletionStatus).toBe("DeletedByEmitter");
                expect(CoreDate.from(updatedPeerIdentityAttribute.peerSharingDetails!.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))).toBe(true);
            });

            test("should notify about deletion of succeeded OwnIdentityAttribute", async () => {
                const notificationIds = (await services1.consumption.attributes.deleteAttributeAndNotify({ attributeId: ownIdentityAttributeVersion1.id })).value.notificationIds;

                const timeBeforeUpdate = CoreDate.utc();
                await syncUntilHasMessageWithNotification(services2.transport, notificationIds[0]);
                await services2.eventBus.waitForEvent(OwnAttributeDeletedByOwnerEvent, (e) => {
                    return e.data.id.toString() === ownIdentityAttributeVersion1.id;
                });
                const timeAfterUpdate = CoreDate.utc();

                const updatedPeerIdentityAttributePredecessor = (await services2.consumption.attributes.getAttribute({ id: peerIdentityAttributeVersion0.id })).value;
                expect(updatedPeerIdentityAttributePredecessor.peerSharingDetails!.deletionInfo!.deletionStatus).toBe("DeletedByEmitter");
                expect(
                    CoreDate.from(updatedPeerIdentityAttributePredecessor.peerSharingDetails!.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))
                ).toBe(true);
            });

            test("should notify about deletion of succeeded OwnIdentityAttribute if successor wasn't shared", async () => {
                const ownIdentityAttributeVersion2 = (
                    await services1.consumption.attributes.succeedOwnIdentityAttribute({
                        predecessorId: ownIdentityAttributeVersion1.id,
                        successorContent: {
                            value: {
                                "@type": "GivenName",
                                value: "aThirdGivenName"
                            }
                        }
                    })
                ).value.successor;

                const notificationIds = (await services1.consumption.attributes.deleteAttributeAndNotify({ attributeId: ownIdentityAttributeVersion2.id })).value.notificationIds;

                const timeBeforeUpdate = CoreDate.utc();
                await syncUntilHasMessageWithNotification(services2.transport, notificationIds[0]);
                await services2.eventBus.waitForEvent(OwnAttributeDeletedByOwnerEvent, (e) => {
                    return e.data.id.toString() === ownIdentityAttributeVersion1.id;
                });
                const timeAfterUpdate = CoreDate.utc();

                const updatedPeerIdentityAttributeVersion1 = (await services2.consumption.attributes.getAttribute({ id: peerIdentityAttributeVersion1.id })).value;
                expect(updatedPeerIdentityAttributeVersion1.peerSharingDetails!.deletionInfo!.deletionStatus).toBe("DeletedByEmitter");
                expect(CoreDate.from(updatedPeerIdentityAttributeVersion1.peerSharingDetails!.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))).toBe(
                    true
                );

                const updatedPeerIdentityAttributeVersion0 = (await services2.consumption.attributes.getAttribute({ id: peerIdentityAttributeVersion0.id })).value;
                expect(updatedPeerIdentityAttributeVersion0.peerSharingDetails!.deletionInfo!.deletionStatus).toBe("DeletedByEmitter");
                expect(CoreDate.from(updatedPeerIdentityAttributeVersion1.peerSharingDetails!.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))).toBe(
                    true
                );
            });

            test("should throw trying to call with an unknown attribute ID", async () => {
                const unknownAttributeId = "ATTxxxxxxxxxxxxxxxxx";
                const result = await services1.consumption.attributes.deleteAttributeAndNotify({ attributeId: unknownAttributeId });
                expect(result).toBeAnError(/.*/, "error.runtime.recordNotFound");
            });

            test("should throw trying to notify about deletion of OwnIdentityAttribute when the Relationship is in status Pending", async () => {
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
                    attributeId: ownIdentityAttribute.id
                };

                const relationshipTemplateContent: CreateOwnRelationshipTemplateRequest["content"] = {
                    "@type": "RelationshipTemplateContent",
                    title: "aTitle",
                    onNewRelationship: {
                        items: [item],
                        "@type": "Request"
                    }
                };

                await createRelationshipWithStatusPending(services1, services2, relationshipTemplateContent, [{ accept: true } as AcceptRequestItemParametersJSON]);
                await services1.eventBus.waitForEvent(OutgoingRequestFromRelationshipCreationCreatedAndCompletedEvent);

                const result = await services1.consumption.attributes.deleteAttributeAndNotify({ attributeId: ownIdentityAttribute.id });
                expect(result).toBeAnError(
                    "The shared Attribute cannot be deleted while the Relationship to the peer is in status 'Pending'. If you want to delete it now, you'll have to accept, reject or revoke the pending Relationship.",
                    "error.runtime.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending"
                );
            });
        });

        describe("Delete PeerIdentityAttribute", () => {
            test("should delete a PeerIdentityAttribute", async () => {
                expect(peerIdentityAttributeVersion0).toBeDefined();

                const deletionResult = await services2.consumption.attributes.deleteAttributeAndNotify({ attributeId: peerIdentityAttributeVersion0.id });
                expect(deletionResult).toBeSuccessful();

                const getDeletedAttributeResult = await services2.consumption.attributes.getAttribute({ id: peerIdentityAttributeVersion0.id });
                expect(getDeletedAttributeResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
            });

            test("should delete the predecessor of a PeerIdentityAttribute", async () => {
                expect(peerIdentityAttributeVersion1).toBeDefined();

                const deletionResult = await services2.consumption.attributes.deleteAttributeAndNotify({ attributeId: peerIdentityAttributeVersion1.id });
                expect(deletionResult).toBeSuccessful();

                const getDeletedPredecessorResult = await services2.consumption.attributes.getAttribute({ id: peerIdentityAttributeVersion0.id });
                expect(getDeletedPredecessorResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
            });

            test("should set the 'succeeds' property of the PeerIdentityAttribute successor to undefined", async () => {
                expect(peerIdentityAttributeVersion1.succeeds).toBeDefined();

                await services2.consumption.attributes.deleteAttributeAndNotify({ attributeId: peerIdentityAttributeVersion0.id });
                const updatedRecipientPeerIdentityAttributeVersion1 = (await services2.consumption.attributes.getAttribute({ id: peerIdentityAttributeVersion1.id })).value;
                expect(updatedRecipientPeerIdentityAttributeVersion1.succeeds).toBeUndefined();
            });

            test("should notify about deletion of PeerIdentityAttribute", async () => {
                const notificationIds = (await services2.consumption.attributes.deleteAttributeAndNotify({ attributeId: peerIdentityAttributeVersion0.id })).value.notificationIds;

                const timeBeforeUpdate = CoreDate.utc();
                await syncUntilHasMessageWithNotification(services1.transport, notificationIds[0]);
                await services1.eventBus.waitForEvent(ForwardedAttributeDeletedByPeerEvent, (e) => {
                    return e.data.id.toString() === peerIdentityAttributeVersion0.id;
                });

                const timeAfterUpdate = CoreDate.utc();

                const updatedOwnIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion0.id })).value;
                expect(updatedOwnIdentityAttribute.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toBe("DeletedByRecipient");
                expect(CoreDate.from(updatedOwnIdentityAttribute.forwardedSharingDetails![0].deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))).toBe(
                    true
                );
            });

            test("should notify about deletion of succeeded PeerIdentityAttribute", async () => {
                const notificationIds = (await services2.consumption.attributes.deleteAttributeAndNotify({ attributeId: peerIdentityAttributeVersion1.id })).value.notificationIds;

                const timeBeforeUpdate = CoreDate.utc();
                await syncUntilHasMessageWithNotification(services1.transport, notificationIds[0]);
                await services1.eventBus.waitForEvent(ForwardedAttributeDeletedByPeerEvent, (e) => {
                    return e.data.id.toString() === peerIdentityAttributeVersion1.id;
                });

                const timeAfterUpdate = CoreDate.utc();

                const updatedOwnIdentityAttributePredecessor = (await services1.consumption.attributes.getAttribute({ id: ownIdentityAttributeVersion0.id })).value;
                expect(updatedOwnIdentityAttributePredecessor.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toBe("DeletedByRecipient");
                expect(
                    CoreDate.from(updatedOwnIdentityAttributePredecessor.forwardedSharingDetails![0].deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))
                ).toBe(true);
            });

            test("should throw trying to notify about deletion of PeerIdentityAttribute when the Relationship is in status Pending", async () => {
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
                    attributeId: ownIdentityAttribute.id
                };

                const relationshipTemplateContent: CreateOwnRelationshipTemplateRequest["content"] = {
                    "@type": "RelationshipTemplateContent",
                    title: "aTitle",
                    onNewRelationship: { items: [item], "@type": "Request" }
                };

                await createRelationshipWithStatusPending(services1, services2, relationshipTemplateContent, [{ accept: true } as AcceptRequestItemParametersJSON]);

                const peerIdentityAttribute = (await services2.consumption.attributes.getAttribute({ id: ownIdentityAttribute.id })).value;

                const result = await services2.consumption.attributes.deleteAttributeAndNotify({ attributeId: peerIdentityAttribute.id });
                expect(result).toBeAnError(
                    "The shared Attribute cannot be deleted while the Relationship to the peer is in status 'Pending'. If you want to delete it now, you'll have to accept, reject or revoke the pending Relationship.",
                    "error.runtime.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending"
                );
            });
        });
    });

    describe("Delete RelationshipAttributes", () => {
        let ownRelationshipAttributeVersion0: LocalAttributeDTO;
        let ownRelationshipAttributeVersion1: LocalAttributeDTO;
        let peerRelationshipAttributeVersion0: LocalAttributeDTO;
        let peerRelationshipAttributeVersion1: LocalAttributeDTO;
        let thirdPartyRelationshipAttributeForwardedByOwnerVersion0: LocalAttributeDTO;
        let thirdPartyRelationshipAttributeForwardedByOwnerVersion1: LocalAttributeDTO;

        let forwardedPeerRelationshipAttributeVersion0: LocalAttributeDTO;
        let forwardedPeerRelationshipAttributeVersion1: LocalAttributeDTO;
        let thirdPartyRelationshipAttributeForwardedByPeerVersion0: LocalAttributeDTO;
        let thirdPartyRelationshipAttributeForwardedByPeerVersion1: LocalAttributeDTO;

        beforeEach(async () => {
            ownRelationshipAttributeVersion0 = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
                content: {
                    value: {
                        "@type": "ProprietaryString",
                        value: "aProprietaryString",
                        title: "aTitle"
                    },
                    key: "aKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }
            });

            const succeedResult = (
                await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
                    predecessorId: ownRelationshipAttributeVersion0.id,
                    successorContent: {
                        value: {
                            "@type": "ProprietaryString",
                            value: "anotherProprietaryString",
                            title: "aTitle"
                        }
                    }
                })
            ).value;
            ({ predecessor: ownRelationshipAttributeVersion0, successor: ownRelationshipAttributeVersion1 } = succeedResult);
            await syncUntilHasMessageWithNotification(services2.transport, succeedResult.notificationId);

            peerRelationshipAttributeVersion0 = (await services2.consumption.attributes.getAttribute({ id: ownRelationshipAttributeVersion0.id })).value;
            peerRelationshipAttributeVersion1 = (await services2.consumption.attributes.getAttribute({ id: ownRelationshipAttributeVersion1.id })).value;

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
            ownRelationshipAttributeVersion0 = await executeFullRequestAndAcceptExistingAttributeFlow(services1, services3, requestParams, ownRelationshipAttributeVersion0.id);
            ownRelationshipAttributeVersion1 = await executeFullRequestAndAcceptExistingAttributeFlow(services1, services3, requestParams, ownRelationshipAttributeVersion1.id);

            thirdPartyRelationshipAttributeForwardedByOwnerVersion0 = (await services3.consumption.attributes.getAttribute({ id: ownRelationshipAttributeVersion0.id })).value;
            thirdPartyRelationshipAttributeForwardedByOwnerVersion1 = (await services3.consumption.attributes.getAttribute({ id: ownRelationshipAttributeVersion1.id })).value;

            const anotherOwnRelationshipAttributeVersion0 = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
                content: {
                    value: {
                        "@type": "ProprietaryString",
                        value: "aProprietaryString",
                        title: "aTitle"
                    },
                    key: "anotherKey",
                    confidentiality: RelationshipAttributeConfidentiality.Public
                }
            });
            const anotherSucceedResult = (
                await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
                    predecessorId: anotherOwnRelationshipAttributeVersion0.id,
                    successorContent: {
                        value: {
                            "@type": "ProprietaryString",
                            value: "anotherProprietaryString",
                            title: "aTitle"
                        }
                    }
                })
            ).value;
            await syncUntilHasMessageWithNotification(services2.transport, anotherSucceedResult.notificationId);

            forwardedPeerRelationshipAttributeVersion0 = (await services2.consumption.attributes.getAttribute({ id: anotherOwnRelationshipAttributeVersion0.id })).value;
            forwardedPeerRelationshipAttributeVersion1 = (await services2.consumption.attributes.getAttribute({ id: anotherSucceedResult.successor.id })).value;

            const requestParamsForAnotherRelationshipAttribute = {
                peer: services2.address,
                content: {
                    items: [
                        ReadAttributeRequestItem.from({
                            query: ThirdPartyRelationshipAttributeQuery.from({
                                key: "anotherKey",
                                owner: ThirdPartyRelationshipAttributeQueryOwner.ThirdParty,
                                thirdParty: [services1.address]
                            }),
                            mustBeAccepted: true
                        }).toJSON()
                    ]
                }
            };
            forwardedPeerRelationshipAttributeVersion0 = await executeFullRequestAndAcceptExistingAttributeFlow(
                services2,
                services3,
                requestParamsForAnotherRelationshipAttribute,
                forwardedPeerRelationshipAttributeVersion0.id
            );
            forwardedPeerRelationshipAttributeVersion1 = await executeFullRequestAndAcceptExistingAttributeFlow(
                services2,
                services3,
                requestParamsForAnotherRelationshipAttribute,
                forwardedPeerRelationshipAttributeVersion1.id
            );

            thirdPartyRelationshipAttributeForwardedByPeerVersion0 = (await services3.consumption.attributes.getAttribute({ id: forwardedPeerRelationshipAttributeVersion0.id }))
                .value;
            thirdPartyRelationshipAttributeForwardedByPeerVersion1 = (await services3.consumption.attributes.getAttribute({ id: forwardedPeerRelationshipAttributeVersion1.id }))
                .value;
        });

        describe("Delete OwnRelationshipAttribute", () => {
            test("should delete an OwnRelationshipAttribute", async () => {
                expect(ownRelationshipAttributeVersion0).toBeDefined();

                const deletionResult = await services1.consumption.attributes.deleteAttributeAndNotify({ attributeId: ownRelationshipAttributeVersion0.id });
                expect(deletionResult).toBeSuccessful();

                const getDeletedAttributeResult = await services1.consumption.attributes.getAttribute({ id: ownRelationshipAttributeVersion0.id });
                expect(getDeletedAttributeResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
            });

            test("should delete a succeeded OwnRelationshipAttribute and its predecessors", async () => {
                expect(ownRelationshipAttributeVersion1).toBeDefined();

                const deletionResult = await services1.consumption.attributes.deleteAttributeAndNotify({ attributeId: ownRelationshipAttributeVersion1.id });
                expect(deletionResult).toBeSuccessful();

                const getDeletedPredecessorResult = await services1.consumption.attributes.getAttribute({ id: ownRelationshipAttributeVersion0.id });
                expect(getDeletedPredecessorResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
            });

            test("should set the 'succeeds' property of the OwnRelationshipAttribute successor to undefined", async () => {
                expect(ownRelationshipAttributeVersion1.succeeds).toBeDefined();
                await services1.consumption.attributes.deleteAttributeAndNotify({ attributeId: ownRelationshipAttributeVersion0.id });
                const updatedOwnIdentityAttributeVersion1 = (await services1.consumption.attributes.getAttribute({ id: ownRelationshipAttributeVersion1.id })).value;
                expect(updatedOwnIdentityAttributeVersion1.succeeds).toBeUndefined();
            });

            test("should notify peer about deletion of OwnRelationshipAttribute", async () => {
                const notificationIds = (await services1.consumption.attributes.deleteAttributeAndNotify({ attributeId: ownRelationshipAttributeVersion0.id })).value
                    .notificationIds;

                const timeBeforeUpdate = CoreDate.utc();
                await syncUntilHasMessageWithNotification(services2.transport, notificationIds[0]);
                await services2.eventBus.waitForEvent(OwnAttributeDeletedByOwnerEvent, (e) => {
                    return e.data.id.toString() === ownRelationshipAttributeVersion0.id;
                });
                const timeAfterUpdate = CoreDate.utc();

                const updatedPeerRelationshipAttribute = (await services2.consumption.attributes.getAttribute({ id: ownRelationshipAttributeVersion0.id })).value;
                expect(updatedPeerRelationshipAttribute.peerSharingDetails!.deletionInfo!.deletionStatus).toBe("DeletedByEmitter");
                expect(CoreDate.from(updatedPeerRelationshipAttribute.peerSharingDetails!.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))).toBe(
                    true
                );
            });

            test("should notify peer about deletion of succeeded OwnRelationshipAttribute", async () => {
                const notificationIds = (await services1.consumption.attributes.deleteAttributeAndNotify({ attributeId: ownRelationshipAttributeVersion1.id })).value
                    .notificationIds;

                const timeBeforeUpdate = CoreDate.utc();
                await syncUntilHasMessageWithNotification(services2.transport, notificationIds[0]);
                await services2.eventBus.waitForEvent(OwnAttributeDeletedByOwnerEvent, (e) => {
                    return e.data.id.toString() === ownRelationshipAttributeVersion1.id;
                });
                const timeAfterUpdate = CoreDate.utc();

                const updatedPredecessorPeerRelationshipAttribute = (await services2.consumption.attributes.getAttribute({ id: ownRelationshipAttributeVersion0.id })).value;
                expect(updatedPredecessorPeerRelationshipAttribute.peerSharingDetails!.deletionInfo!.deletionStatus).toBe("DeletedByEmitter");
                expect(
                    CoreDate.from(updatedPredecessorPeerRelationshipAttribute.peerSharingDetails!.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))
                ).toBe(true);
            });

            test("should notify third party about deletion of OwnRelationshipAttribute", async () => {
                const notificationIds = (await services1.consumption.attributes.deleteAttributeAndNotify({ attributeId: ownRelationshipAttributeVersion0.id })).value
                    .notificationIds;

                const timeBeforeUpdate = CoreDate.utc();
                await syncUntilHasMessageWithNotification(services3.transport, notificationIds[1]);
                await services3.eventBus.waitForEvent(OwnAttributeDeletedByOwnerEvent, (e) => {
                    return e.data.id.toString() === ownRelationshipAttributeVersion0.id;
                });
                const timeAfterUpdate = CoreDate.utc();

                const updatedThirdPartyRelationshipAttribute = (await services3.consumption.attributes.getAttribute({ id: ownRelationshipAttributeVersion0.id })).value;
                expect(updatedThirdPartyRelationshipAttribute.peerSharingDetails!.deletionInfo!.deletionStatus).toBe("DeletedByEmitter");
                expect(
                    CoreDate.from(updatedThirdPartyRelationshipAttribute.peerSharingDetails!.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))
                ).toBe(true);
            });

            test("should notify third party about deletion of succeeded OwnRelationshipAttribute", async () => {
                const notificationIds = (await services1.consumption.attributes.deleteAttributeAndNotify({ attributeId: ownRelationshipAttributeVersion1.id })).value
                    .notificationIds;

                const timeBeforeUpdate = CoreDate.utc();
                await syncUntilHasMessageWithNotification(services3.transport, notificationIds[1]);
                await services3.eventBus.waitForEvent(OwnAttributeDeletedByOwnerEvent, (e) => {
                    return e.data.id.toString() === ownRelationshipAttributeVersion1.id;
                });
                const timeAfterUpdate = CoreDate.utc();

                const updatedPredecessorThirdPartyRelationshipAttribute = (await services3.consumption.attributes.getAttribute({ id: ownRelationshipAttributeVersion0.id })).value;
                expect(updatedPredecessorThirdPartyRelationshipAttribute.peerSharingDetails!.deletionInfo!.deletionStatus).toBe("DeletedByEmitter");
                expect(
                    CoreDate.from(updatedPredecessorThirdPartyRelationshipAttribute.peerSharingDetails!.deletionInfo!.deletionDate).isBetween(
                        timeBeforeUpdate,
                        timeAfterUpdate.add(1)
                    )
                ).toBe(true);
            });

            test("should notify third party about deletion of succeeded OwnRelationshipAttribute if successor wasn't shared", async () => {
                const ownRelationshipAttributeVersion2 = (
                    await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
                        predecessorId: ownRelationshipAttributeVersion1.id,
                        successorContent: {
                            value: {
                                "@type": "ProprietaryString",
                                value: "aThirdProprietaryString",
                                title: "aTitle"
                            }
                        }
                    })
                ).value.successor;

                const notificationIds = (await services1.consumption.attributes.deleteAttributeAndNotify({ attributeId: ownRelationshipAttributeVersion2.id })).value
                    .notificationIds;

                const timeBeforeUpdate = CoreDate.utc();
                await syncUntilHasMessageWithNotification(services3.transport, notificationIds[1]);
                await services3.eventBus.waitForEvent(OwnAttributeDeletedByOwnerEvent, (e) => {
                    return e.data.id.toString() === ownRelationshipAttributeVersion1.id;
                });
                const timeAfterUpdate = CoreDate.utc();

                const updatedThirdPartyRelationshipAttributeVersion1 = (await services3.consumption.attributes.getAttribute({ id: ownRelationshipAttributeVersion1.id })).value;
                expect(updatedThirdPartyRelationshipAttributeVersion1.peerSharingDetails!.deletionInfo!.deletionStatus).toBe("DeletedByEmitter");
                expect(
                    CoreDate.from(updatedThirdPartyRelationshipAttributeVersion1.peerSharingDetails!.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))
                ).toBe(true);

                const updatedThirdPartyRelationshipAttributeVersion0 = (await services3.consumption.attributes.getAttribute({ id: ownRelationshipAttributeVersion0.id })).value;
                expect(updatedThirdPartyRelationshipAttributeVersion0.peerSharingDetails!.deletionInfo!.deletionStatus).toBe("DeletedByEmitter");
                expect(
                    CoreDate.from(updatedThirdPartyRelationshipAttributeVersion0.peerSharingDetails!.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))
                ).toBe(true);
            });

            test("should throw trying to notify peer about deletion of OwnRelationshipAttribute when the Relationship is in status Pending", async () => {
                const [services1, services2] = await runtimeServiceProvider.launch(2, {
                    enableRequestModule: true,
                    enableDeciderModule: true,
                    enableNotificationModule: true
                });

                const item: CreateAttributeRequestItemJSON = {
                    "@type": "CreateAttributeRequestItem",
                    mustBeAccepted: true,
                    attribute: {
                        "@type": "RelationshipAttribute",
                        owner: "",
                        key: "aKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        value: {
                            "@type": "ProprietaryString",
                            value: "aProprietaryString",
                            title: "aTitle"
                        }
                    }
                };

                const relationshipTemplateContent: CreateOwnRelationshipTemplateRequest["content"] = {
                    "@type": "RelationshipTemplateContent",
                    title: "aTitle",
                    onNewRelationship: { items: [item], "@type": "Request" }
                };

                const pendingRelationship = await createRelationshipWithStatusPending(services2, services1, relationshipTemplateContent, [
                    { accept: true } as AcceptRequestItemParametersJSON
                ]);

                const ownRelationshipAttribute = (await services1.transport.relationships.getAttributesForRelationship({ id: pendingRelationship.id })).value[0];

                const result = await services1.consumption.attributes.deleteAttributeAndNotify({ attributeId: ownRelationshipAttribute.id });
                expect(result).toBeAnError(
                    "The shared Attribute cannot be deleted while the Relationship to the peer is in status 'Pending'. If you want to delete it now, you'll have to accept, reject or revoke the pending Relationship.",
                    "error.runtime.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending"
                );
            });
        });

        describe("Delete PeerRelationshipAttribute", () => {
            test("should delete a PeerRelationshipAttribute", async () => {
                expect(peerRelationshipAttributeVersion0).toBeDefined();

                const deletionResult = await services2.consumption.attributes.deleteAttributeAndNotify({ attributeId: peerRelationshipAttributeVersion0.id });
                expect(deletionResult).toBeSuccessful();

                const getDeletedAttributeResult = await services2.consumption.attributes.getAttribute({ id: peerRelationshipAttributeVersion0.id });
                expect(getDeletedAttributeResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
            });

            test("should delete a succeeded PeerRelationshipAttribute and its predecessors", async () => {
                expect(peerRelationshipAttributeVersion1).toBeDefined();

                const deletionResult = await services2.consumption.attributes.deleteAttributeAndNotify({ attributeId: peerRelationshipAttributeVersion1.id });
                expect(deletionResult).toBeSuccessful();

                const getDeletedPredecessorResult = await services2.consumption.attributes.getAttribute({ id: peerRelationshipAttributeVersion0.id });
                expect(getDeletedPredecessorResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
            });

            test("should set the 'succeeds' property of the PeerRelationshipAttribute successor to undefined", async () => {
                expect(peerRelationshipAttributeVersion1.succeeds).toBeDefined();
                await services2.consumption.attributes.deleteAttributeAndNotify({ attributeId: peerRelationshipAttributeVersion0.id });
                const updatedPeerIdentityAttributeVersion1 = (await services2.consumption.attributes.getAttribute({ id: peerRelationshipAttributeVersion1.id })).value;
                expect(updatedPeerIdentityAttributeVersion1.succeeds).toBeUndefined();
            });

            test("should notify owner about deletion of PeerRelationshipAttribute", async () => {
                const notificationIds = (await services2.consumption.attributes.deleteAttributeAndNotify({ attributeId: peerRelationshipAttributeVersion0.id })).value
                    .notificationIds;

                const timeBeforeUpdate = CoreDate.utc();
                await syncUntilHasMessageWithNotification(services1.transport, notificationIds[0]);
                await services1.eventBus.waitForEvent(PeerRelationshipAttributeDeletedByPeerEvent, (e) => {
                    return e.data.id.toString() === peerRelationshipAttributeVersion0.id;
                });
                const timeAfterUpdate = CoreDate.utc();

                const updatedOwnRelationshipAttribute = (await services1.consumption.attributes.getAttribute({ id: peerRelationshipAttributeVersion0.id })).value;
                expect(updatedOwnRelationshipAttribute.peerSharingDetails!.deletionInfo!.deletionStatus).toBe("DeletedByRecipient");
                expect(CoreDate.from(updatedOwnRelationshipAttribute.peerSharingDetails!.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))).toBe(
                    true
                );
            });

            test("should notify owner about deletion of succeeded PeerRelationshipAttribute", async () => {
                const notificationIds = (await services2.consumption.attributes.deleteAttributeAndNotify({ attributeId: peerRelationshipAttributeVersion1.id })).value
                    .notificationIds;

                const timeBeforeUpdate = CoreDate.utc();
                await syncUntilHasMessageWithNotification(services1.transport, notificationIds[0]);
                await services1.eventBus.waitForEvent(PeerRelationshipAttributeDeletedByPeerEvent, (e) => {
                    return e.data.id.toString() === peerRelationshipAttributeVersion1.id;
                });
                const timeAfterUpdate = CoreDate.utc();

                const updatedPredecessorOwnRelationshipAttribute = (await services1.consumption.attributes.getAttribute({ id: peerRelationshipAttributeVersion0.id })).value;
                expect(updatedPredecessorOwnRelationshipAttribute.peerSharingDetails!.deletionInfo!.deletionStatus).toBe("DeletedByRecipient");
                expect(
                    CoreDate.from(updatedPredecessorOwnRelationshipAttribute.peerSharingDetails!.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))
                ).toBe(true);
            });

            test("should notify third party about deletion of PeerRelationshipAttribute", async () => {
                const notificationIds = (await services2.consumption.attributes.deleteAttributeAndNotify({ attributeId: forwardedPeerRelationshipAttributeVersion0.id })).value
                    .notificationIds;

                const timeBeforeUpdate = CoreDate.utc();
                await syncUntilHasMessageWithNotification(services3.transport, notificationIds[1]);
                await services3.eventBus.waitForEvent(PeerRelationshipAttributeDeletedByPeerEvent, (e) => {
                    return e.data.id.toString() === forwardedPeerRelationshipAttributeVersion0.id;
                });
                const timeAfterUpdate = CoreDate.utc();

                const updatedThirdPartyRelationshipAttribute = (await services3.consumption.attributes.getAttribute({ id: forwardedPeerRelationshipAttributeVersion0.id })).value;
                expect(updatedThirdPartyRelationshipAttribute.peerSharingDetails!.deletionInfo!.deletionStatus).toBe("DeletedByEmitter");
                expect(
                    CoreDate.from(updatedThirdPartyRelationshipAttribute.peerSharingDetails!.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))
                ).toBe(true);
            });

            test("should notify third party about deletion of succeeded PeerRelationshipAttribute", async () => {
                const notificationIds = (await services2.consumption.attributes.deleteAttributeAndNotify({ attributeId: forwardedPeerRelationshipAttributeVersion1.id })).value
                    .notificationIds;

                const timeBeforeUpdate = CoreDate.utc();
                await syncUntilHasMessageWithNotification(services3.transport, notificationIds[1]);
                await services3.eventBus.waitForEvent(PeerRelationshipAttributeDeletedByPeerEvent, (e) => {
                    return e.data.id.toString() === forwardedPeerRelationshipAttributeVersion1.id;
                });
                const timeAfterUpdate = CoreDate.utc();

                const updatedPredecessorThirdPartyRelationshipAttribute = (
                    await services3.consumption.attributes.getAttribute({ id: forwardedPeerRelationshipAttributeVersion0.id })
                ).value;
                expect(updatedPredecessorThirdPartyRelationshipAttribute.peerSharingDetails!.deletionInfo!.deletionStatus).toBe("DeletedByEmitter");
                expect(
                    CoreDate.from(updatedPredecessorThirdPartyRelationshipAttribute.peerSharingDetails!.deletionInfo!.deletionDate).isBetween(
                        timeBeforeUpdate,
                        timeAfterUpdate.add(1)
                    )
                ).toBe(true);
            });

            test("should notify third party about deletion of succeeded PeerRelationshipAttribute if successor wasn't shared", async () => {
                const successionResult = (
                    await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
                        predecessorId: forwardedPeerRelationshipAttributeVersion1.id,
                        successorContent: {
                            value: {
                                "@type": "ProprietaryString",
                                value: "aForthProprietaryString",
                                title: "aTitle"
                            }
                        }
                    })
                ).value;
                await syncUntilHasMessageWithNotification(services2.transport, successionResult.notificationId);

                const notificationIds = (await services2.consumption.attributes.deleteAttributeAndNotify({ attributeId: successionResult.successor.id })).value.notificationIds;

                const timeBeforeUpdate = CoreDate.utc();
                await syncUntilHasMessageWithNotification(services3.transport, notificationIds[1]);
                await services3.eventBus.waitForEvent(PeerRelationshipAttributeDeletedByPeerEvent, (e) => {
                    return e.data.id.toString() === forwardedPeerRelationshipAttributeVersion1.id;
                });
                const timeAfterUpdate = CoreDate.utc();

                const updatedThirdPartyRelationshipAttributeVersion1 = (await services3.consumption.attributes.getAttribute({ id: forwardedPeerRelationshipAttributeVersion1.id }))
                    .value;
                expect(updatedThirdPartyRelationshipAttributeVersion1.peerSharingDetails!.deletionInfo!.deletionStatus).toBe("DeletedByEmitter");
                expect(
                    CoreDate.from(updatedThirdPartyRelationshipAttributeVersion1.peerSharingDetails!.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))
                ).toBe(true);

                const updatedThirdPartyRelationshipAttributeVersion0 = (await services3.consumption.attributes.getAttribute({ id: forwardedPeerRelationshipAttributeVersion0.id }))
                    .value;
                expect(updatedThirdPartyRelationshipAttributeVersion0.peerSharingDetails!.deletionInfo!.deletionStatus).toBe("DeletedByEmitter");
                expect(
                    CoreDate.from(updatedThirdPartyRelationshipAttributeVersion0.peerSharingDetails!.deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))
                ).toBe(true);
            });

            test("should throw trying to notify peer about deletion of PeerRelationshipAttribute when the Relationship is in status Pending", async () => {
                const [services1, services2] = await runtimeServiceProvider.launch(2, {
                    enableRequestModule: true,
                    enableDeciderModule: true,
                    enableNotificationModule: true
                });

                const item: CreateAttributeRequestItemJSON = {
                    "@type": "CreateAttributeRequestItem",
                    mustBeAccepted: true,
                    attribute: {
                        "@type": "RelationshipAttribute",
                        owner: services2.address,
                        key: "aKey",
                        confidentiality: RelationshipAttributeConfidentiality.Public,
                        value: {
                            "@type": "ProprietaryString",
                            value: "aProprietaryString",
                            title: "aTitle"
                        }
                    }
                };

                const relationshipTemplateContent: CreateOwnRelationshipTemplateRequest["content"] = {
                    "@type": "RelationshipTemplateContent",
                    title: "aTitle",
                    onNewRelationship: { items: [item], "@type": "Request" }
                };

                const pendingRelationship = await createRelationshipWithStatusPending(services2, services1, relationshipTemplateContent, [
                    { accept: true } as AcceptRequestItemParametersJSON
                ]);

                const peerRelationshipAttribute = (await services1.transport.relationships.getAttributesForRelationship({ id: pendingRelationship.id })).value[0];

                const result = await services1.consumption.attributes.deleteAttributeAndNotify({ attributeId: peerRelationshipAttribute.id });
                expect(result).toBeAnError(
                    "The shared Attribute cannot be deleted while the Relationship to the peer is in status 'Pending'. If you want to delete it now, you'll have to accept, reject or revoke the pending Relationship.",
                    "error.runtime.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending"
                );
            });
        });

        describe("Delete ThirdPartyRelationshipAttribute", () => {
            test("should delete a ThirdPartyRelationshipAttribute", async () => {
                const deletionResult = await services3.consumption.attributes.deleteAttributeAndNotify({
                    attributeId: thirdPartyRelationshipAttributeForwardedByOwnerVersion0.id
                });
                expect(deletionResult).toBeSuccessful();

                const getDeletedAttributeResult = await services3.consumption.attributes.getAttribute({ id: thirdPartyRelationshipAttributeForwardedByOwnerVersion0.id });
                expect(getDeletedAttributeResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
            });

            test("should delete a succeeded ThirdPartyRelationshipAttribute", async () => {
                const deletionResult = await services3.consumption.attributes.deleteAttributeAndNotify({
                    attributeId: thirdPartyRelationshipAttributeForwardedByOwnerVersion1.id
                });
                expect(deletionResult).toBeSuccessful();

                const getDeletedAttributeResult = await services3.consumption.attributes.getAttribute({ id: thirdPartyRelationshipAttributeForwardedByOwnerVersion0.id });
                expect(getDeletedAttributeResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
            });

            test("should set the 'succeeds' property of the ThirdPartyRelationshipAttribute successor to undefined", async () => {
                expect(thirdPartyRelationshipAttributeForwardedByOwnerVersion1.succeeds).toBeDefined();
                await services3.consumption.attributes.deleteAttributeAndNotify({
                    attributeId: thirdPartyRelationshipAttributeForwardedByOwnerVersion0.id
                });
                const updatedThirdPartyRelationshipAttributeVersion1 = (
                    await services3.consumption.attributes.getAttribute({ id: thirdPartyRelationshipAttributeForwardedByOwnerVersion1.id })
                ).value;
                expect(updatedThirdPartyRelationshipAttributeVersion1.succeeds).toBeUndefined();
            });

            test("should notify owner about deletion of ThirdPartyRelationshipAttribute", async () => {
                const notificationId = (
                    await services3.consumption.attributes.deleteAttributeAndNotify({
                        attributeId: thirdPartyRelationshipAttributeForwardedByOwnerVersion0.id
                    })
                ).value.notificationIds[0];

                const timeBeforeUpdate = CoreDate.utc();
                await syncUntilHasMessageWithNotification(services1.transport, notificationId);
                await services1.eventBus.waitForEvent(ForwardedAttributeDeletedByPeerEvent, (e) => {
                    return e.data.id.toString() === thirdPartyRelationshipAttributeForwardedByOwnerVersion0.id;
                });

                const timeAfterUpdate = CoreDate.utc();

                const updatedOwnRelationshipAttribute = (await services1.consumption.attributes.getAttribute({ id: thirdPartyRelationshipAttributeForwardedByOwnerVersion0.id }))
                    .value;
                expect(updatedOwnRelationshipAttribute.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toBe("DeletedByRecipient");
                expect(
                    CoreDate.from(updatedOwnRelationshipAttribute.forwardedSharingDetails![0].deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))
                ).toBe(true);
            });

            test("should notify owner about deletion of succeeded ThirdPartyRelationshipAttribute", async () => {
                const notificationId = (
                    await services3.consumption.attributes.deleteAttributeAndNotify({
                        attributeId: thirdPartyRelationshipAttributeForwardedByOwnerVersion1.id
                    })
                ).value.notificationIds[0];

                const timeBeforeUpdate = CoreDate.utc();
                await syncUntilHasMessageWithNotification(services1.transport, notificationId);
                await services1.eventBus.waitForEvent(ForwardedAttributeDeletedByPeerEvent, (e) => {
                    return e.data.id.toString() === thirdPartyRelationshipAttributeForwardedByOwnerVersion1.id;
                });

                const timeAfterUpdate = CoreDate.utc();

                const updatedOwnRelationshipAttributePredecessor = (
                    await services1.consumption.attributes.getAttribute({ id: thirdPartyRelationshipAttributeForwardedByOwnerVersion0.id })
                ).value;
                expect(updatedOwnRelationshipAttributePredecessor.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toBe("DeletedByRecipient");
                expect(
                    CoreDate.from(updatedOwnRelationshipAttributePredecessor.forwardedSharingDetails![0].deletionInfo!.deletionDate).isBetween(
                        timeBeforeUpdate,
                        timeAfterUpdate.add(1)
                    )
                ).toBe(true);
            });

            test("should notify peer about deletion of ThirdPartyRelationshipAttribute", async () => {
                const notificationId = (
                    await services3.consumption.attributes.deleteAttributeAndNotify({
                        attributeId: thirdPartyRelationshipAttributeForwardedByPeerVersion0.id
                    })
                ).value.notificationIds[0];

                const timeBeforeUpdate = CoreDate.utc();
                await syncUntilHasMessageWithNotification(services2.transport, notificationId);
                await services2.eventBus.waitForEvent(ForwardedAttributeDeletedByPeerEvent, (e) => {
                    return e.data.id.toString() === thirdPartyRelationshipAttributeForwardedByPeerVersion0.id;
                });

                const timeAfterUpdate = CoreDate.utc();

                const updatedPeerRelationshipAttribute = (await services2.consumption.attributes.getAttribute({ id: thirdPartyRelationshipAttributeForwardedByPeerVersion0.id }))
                    .value;
                expect(updatedPeerRelationshipAttribute.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toBe("DeletedByRecipient");
                expect(
                    CoreDate.from(updatedPeerRelationshipAttribute.forwardedSharingDetails![0].deletionInfo!.deletionDate).isBetween(timeBeforeUpdate, timeAfterUpdate.add(1))
                ).toBe(true);
            });

            test("should notify peer about deletion of succeeded ThirdPartyRelationshipAttribute", async () => {
                const notificationId = (
                    await services3.consumption.attributes.deleteAttributeAndNotify({
                        attributeId: thirdPartyRelationshipAttributeForwardedByPeerVersion1.id
                    })
                ).value.notificationIds[0];

                const timeBeforeUpdate = CoreDate.utc();
                await syncUntilHasMessageWithNotification(services2.transport, notificationId);
                await services2.eventBus.waitForEvent(ForwardedAttributeDeletedByPeerEvent, (e) => {
                    return e.data.id.toString() === thirdPartyRelationshipAttributeForwardedByPeerVersion1.id;
                });

                const timeAfterUpdate = CoreDate.utc();

                const updatedPeerRelationshipAttributePredecessor = (
                    await services2.consumption.attributes.getAttribute({ id: thirdPartyRelationshipAttributeForwardedByPeerVersion0.id })
                ).value;
                expect(updatedPeerRelationshipAttributePredecessor.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toBe("DeletedByRecipient");
                expect(
                    CoreDate.from(updatedPeerRelationshipAttributePredecessor.forwardedSharingDetails![0].deletionInfo!.deletionDate).isBetween(
                        timeBeforeUpdate,
                        timeAfterUpdate.add(1)
                    )
                ).toBe(true);
            });

            test("should throw trying to notify peer about deletion of ThirdPartyRelationshipAttribute when the Relationship is in status Pending", async () => {
                const [services1, services2, services3] = await runtimeServiceProvider.launch(3, {
                    enableRequestModule: true,
                    enableDeciderModule: true,
                    enableNotificationModule: true
                });
                await establishRelationship(services1.transport, services2.transport);
                const peerRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services2, services1, {
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
                    attribute: peerRelationshipAttribute.content,
                    attributeId: peerRelationshipAttribute.id,
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

                const thirdPartyRelationshipAttribute = (await services3.consumption.attributes.getAttribute({ id: peerRelationshipAttribute.id })).value;

                const result = await services3.consumption.attributes.deleteAttributeAndNotify({ attributeId: thirdPartyRelationshipAttribute.id });
                expect(result).toBeAnError(
                    "The shared Attribute cannot be deleted while the Relationship to the peer is in status 'Pending'. If you want to delete it now, you'll have to accept, reject or revoke the pending Relationship.",
                    "error.runtime.attributes.cannotDeleteSharedAttributeWhileRelationshipIsPending"
                );
            });
        });
    });
});

describe("ThirdPartyRelationshipAttributes", () => {
    let ownRelationshipAttribute: LocalAttributeDTO;
    beforeEach(async () => {
        ownRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
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

    test("should forward an OwnRelationshipAttribute", async () => {
        ownRelationshipAttribute = await executeFullShareAndAcceptAttributeRequestFlow(
            services1,
            services3,
            ShareAttributeRequestItem.from({
                attribute: ownRelationshipAttribute.content,
                attributeId: ownRelationshipAttribute.id,
                thirdPartyAddress: services2.address,
                mustBeAccepted: true
            })
        );

        const thirdPartyRelationshipAttribute = (await services3.consumption.attributes.getAttribute({ id: ownRelationshipAttribute.id })).value;

        expect(ownRelationshipAttribute.forwardedSharingDetails![0].peer).toBe(services3.address);
        expect(thirdPartyRelationshipAttribute.peerSharingDetails!.initialAttributePeer).toBe(services2.address);
    });

    test("should forward a PeerRelationshipAttribute", async () => {
        const peerRelationshipAttribute = await executeFullShareAndAcceptAttributeRequestFlow(
            services2,
            services3,
            ShareAttributeRequestItem.from({
                attribute: ownRelationshipAttribute.content,
                attributeId: ownRelationshipAttribute.id,
                thirdPartyAddress: services1.address,
                mustBeAccepted: true
            })
        );

        const thirdPartyRelationshipAttribute = (await services3.consumption.attributes.getAttribute({ id: peerRelationshipAttribute.id })).value;

        expect(peerRelationshipAttribute.forwardedSharingDetails![0].peer).toBe(services3.address);
        expect(thirdPartyRelationshipAttribute.peerSharingDetails!.initialAttributePeer).toBe(services1.address);
    });

    test("should request a ThirdPartyRelationshipAttribute from the initial owner", async () => {
        ownRelationshipAttribute = await executeFullRequestAndAcceptExistingAttributeFlow(
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
            ownRelationshipAttribute.id
        );
        const thirdPartyRelationshipAttribute = (await services3.consumption.attributes.getAttribute({ id: ownRelationshipAttribute.id })).value;

        expect(ownRelationshipAttribute.forwardedSharingDetails![0].peer).toBe(services3.address);
        expect(thirdPartyRelationshipAttribute.peerSharingDetails!.initialAttributePeer).toBe(services2.address);
    });

    test("should request a ThirdPartyRelationshipAttribute from the initial peer", async () => {
        const peerRelationshipAttribute = await executeFullRequestAndAcceptExistingAttributeFlow(
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
            ownRelationshipAttribute.id
        );

        const thirdPartyRelationshipAttribute = (await services3.consumption.attributes.getAttribute({ id: peerRelationshipAttribute.id })).value;

        expect(peerRelationshipAttribute.forwardedSharingDetails![0].peer).toBe(services3.address);
        expect(thirdPartyRelationshipAttribute.peerSharingDetails!.initialAttributePeer).toBe(services1.address);
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

    test("peer Attributes should be marked as deleted", async () => {
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
        const relationship = (await services2.transport.relationships.getRelationship({ id: relationshipId })).value;
        const deletionDate = relationship.auditLog[relationship.auditLog.length - 1].createdAt;

        const result = await services2.consumption.attributes.setAttributeDeletionInfoOfDeletionProposedRelationship({ relationshipId });
        expect(result).toBeSuccessful();

        const peerAttributes = (await services2.consumption.attributes.getPeerAttributes({ peer: services1.address })).value;
        expect(peerAttributes).toHaveLength(1);
        expect(peerAttributes[0].peerSharingDetails!.deletionInfo!.deletionStatus).toBe("DeletedByEmitter");
        expect(peerAttributes[0].peerSharingDetails!.deletionInfo!.deletionDate).toStrictEqual(deletionDate);
    });

    test("own Attributes should be marked as deleted", async () => {
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
        const relationship = (await services2.transport.relationships.getRelationship({ id: relationshipId })).value;
        const deletionDate = relationship.auditLog[relationship.auditLog.length - 1].createdAt;

        const result = await services2.consumption.attributes.setAttributeDeletionInfoOfDeletionProposedRelationship({ relationshipId });
        expect(result).toBeSuccessful();

        const ownAttributesSharedWithPeer = (await services2.consumption.attributes.getOwnAttributesSharedWithPeer({ peer: services1.address })).value;
        expect(ownAttributesSharedWithPeer).toHaveLength(1);
        expect(ownAttributesSharedWithPeer[0].forwardedSharingDetails![0].deletionInfo!.deletionStatus).toBe("DeletedByRecipient");
        expect(ownAttributesSharedWithPeer[0].forwardedSharingDetails![0].deletionInfo!.deletionDate).toStrictEqual(deletionDate);
    });

    test("peer Attributes should not be updated if they are already marked as deleted", async () => {
        const ownIdentityAttribute = await executeFullCreateAndShareOwnIdentityAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenNameServices1"
                }
            }
        });

        const notificationIds = (await services1.consumption.attributes.deleteAttributeAndNotify({ attributeId: ownIdentityAttribute.id })).value.notificationIds;

        await syncUntilHasMessageWithNotification(services2.transport, notificationIds[0]);
        await services2.eventBus.waitForEvent(OwnAttributeDeletedByOwnerEvent, (e) => {
            return e.data.id.toString() === ownIdentityAttribute.id;
        });

        const peerIdentityAttributeAfterDeletion = (await services2.consumption.attributes.getAttribute({ id: ownIdentityAttribute.id })).value;
        const dateOfAttributeDeletion = peerIdentityAttributeAfterDeletion.peerSharingDetails!.deletionInfo!.deletionDate;
        expect(dateOfAttributeDeletion).toBeDefined();

        await services1.transport.relationships.terminateRelationship({ relationshipId });
        await services1.transport.relationships.decomposeRelationship({ relationshipId });
        await syncUntilHasRelationships(services2.transport);
        await services2.eventBus.waitForEvent(RelationshipChangedEvent, (e) => e.data.status === RelationshipStatus.DeletionProposed);

        const result = await services2.consumption.attributes.setAttributeDeletionInfoOfDeletionProposedRelationship({ relationshipId });
        expect(result).toBeSuccessful();

        const peerIdentityAttributeAfterDecomposition = (await services2.consumption.attributes.getAttribute({ id: ownIdentityAttribute.id })).value;
        expect(peerIdentityAttributeAfterDecomposition.peerSharingDetails!.deletionInfo!.deletionStatus).toBe("DeletedByEmitter");
        expect(peerIdentityAttributeAfterDecomposition.peerSharingDetails!.deletionInfo!.deletionDate).toStrictEqual(dateOfAttributeDeletion);
    });

    test("own Attributes should not be updated if they are already marked as deleted", async () => {
        const ownIdentityAttribute = await executeFullCreateAndShareOwnIdentityAttributeFlow(services2, services1, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "aGivenNameServices2"
                }
            }
        });

        const notificationId = (await services1.consumption.attributes.deleteAttributeAndNotify({ attributeId: ownIdentityAttribute.id })).value.notificationIds[0];
        await syncUntilHasMessageWithNotification(services2.transport, notificationId);
        await services2.eventBus.waitForEvent(ForwardedAttributeDeletedByPeerEvent, (e) => {
            return e.data.id.toString() === ownIdentityAttribute.id;
        });

        const ownIdentityAttributeAfterDeletion = (await services2.consumption.attributes.getAttribute({ id: ownIdentityAttribute.id })).value;
        const dateOfAttributeDeletion = ownIdentityAttributeAfterDeletion.forwardedSharingDetails![0].deletionInfo!.deletionDate;
        expect(dateOfAttributeDeletion).toBeDefined();

        await services1.transport.relationships.terminateRelationship({ relationshipId });
        await services1.transport.relationships.decomposeRelationship({ relationshipId });
        await syncUntilHasRelationships(services2.transport);
        await services2.eventBus.waitForEvent(RelationshipChangedEvent, (e) => e.data.status === RelationshipStatus.DeletionProposed);

        const result = await services2.consumption.attributes.setAttributeDeletionInfoOfDeletionProposedRelationship({ relationshipId });
        expect(result).toBeSuccessful();

        const ownIdentityAttributeAfterDecomposition = (await services2.consumption.attributes.getAttribute({ id: ownIdentityAttribute.id })).value;
        expect(ownIdentityAttributeAfterDecomposition.forwardedSharingDetails![0].deletionInfo!.deletionStatus).toBe("DeletedByRecipient");
        expect(ownIdentityAttributeAfterDecomposition.forwardedSharingDetails![0].deletionInfo!.deletionDate).toStrictEqual(dateOfAttributeDeletion);
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
