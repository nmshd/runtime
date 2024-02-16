import { AttributesController } from "@nmshd/consumption";
import { RelationshipAttributeConfidentiality } from "@nmshd/content";
import { CoreId } from "@nmshd/transport";
import {
    CreateRepositoryAttributeRequest,
    ExecuteIdentityAttributeQueryUseCase,
    ExecuteRelationshipAttributeQueryUseCase,
    GetAttributesUseCase,
    GetAttributeUseCase,
    GetOwnSharedAttributesUseCase,
    GetPeerSharedAttributesUseCase,
    GetRepositoryAttributesUseCase,
    LocalAttributeDTO
} from "../../../src";
import {
    ensureActiveRelationship,
    executeFullCreateAndShareRelationshipAttributeFlow,
    executeFullCreateAndShareRepositoryAttributeFlow,
    executeFullSucceedRepositoryAttributeAndNotifyPeerFlow,
    RuntimeServiceProvider,
    TestRuntimeServices
} from "../../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();

let services1: TestRuntimeServices;
let services1AttributeController: AttributesController;
let services2: TestRuntimeServices;
let services2AttributeController: AttributesController;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(2, { enableRequestModule: true, enableDeciderModule: true, enableNotificationModule: true });

    services1 = runtimeServices[0];
    services2 = runtimeServices[1];

    services1AttributeController = (services1.consumption.attributes as any).getAttributeUseCase.attributeController as AttributesController;
    services2AttributeController = (services2.consumption.attributes as any).getAttributeUseCase.attributeController as AttributesController;

    await ensureActiveRelationship(services1.transport, services2.transport);
}, 30000);
afterAll(async () => await runtimeServiceProvider.stop());

beforeEach(() => {
    services1.eventBus.reset();
    services2.eventBus.reset();
});

async function cleanupAttributes() {
    const services1AttributesResult = await services1.consumption.attributes.getAttributes({});
    for (const attribute of services1AttributesResult.value) {
        await services1AttributeController.deleteAttributeUnsafe(CoreId.from(attribute.id));
    }

    const services2AttributesResult = await services2.consumption.attributes.getAttributes({});
    for (const attribute of services2AttributesResult.value) {
        await services2AttributeController.deleteAttributeUnsafe(CoreId.from(attribute.id));
    }
}

describe("get attribute(s)", () => {
    let relationshipAttributeId: string;
    let identityAttributeIds: string[];

    beforeAll(async function () {
        const senderRequests: CreateRepositoryAttributeRequest[] = [
            {
                content: {
                    value: {
                        "@type": "Surname",
                        value: "ASurname"
                    }
                }
            },
            {
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "AGivenName"
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
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                isTechnical: true
            }
        });
        relationshipAttributeId = relationshipAttribute.id;
    });

    afterAll(async function () {
        await cleanupAttributes();
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
            expect(attributes).toHaveLength(3);
            const attributeIds = attributes.map((attribute) => attribute.id);
            expect(attributeIds).toContain(relationshipAttributeId);
            expect(attributeIds).toStrictEqual(expect.arrayContaining(identityAttributeIds));
        });

        test("should allow to get an attribute by type", async function () {
            const result = await services1.consumption.attributes.getAttributes({
                query: { "content.value.@type": "Surname" }
            });
            expect(result).toBeSuccessful();
            const attributes = result.value;
            expect(attributes).toHaveLength(1);
            expect(attributes[0].id).toStrictEqual(identityAttributeIds[0]);
        });

        test("should hide technical attributes when hideTechnical=true", async () => {
            const result = await services1.consumption.attributes.getAttributes({ query: {}, hideTechnical: true });
            expect(result.isSuccess).toBe(true);
            const attributes = result.value;
            expect(attributes.filter((a) => a.id === relationshipAttributeId)).toHaveLength(0);
            expect(attributes).toHaveLength(2);
            const attributeIds = attributes.map((attribute) => attribute.id);
            expect(attributeIds).toStrictEqual(identityAttributeIds);
        });

        test("should return technical attributes when hideTechnical=false", async () => {
            const getAttributesResponse = await services1.consumption.attributes.getAttributes({ query: {}, hideTechnical: false });
            expect(getAttributesResponse.isSuccess).toBe(true);
            const attributes = getAttributesResponse.value;
            expect(attributes.filter((a) => a.id === relationshipAttributeId)).toHaveLength(1);
            expect(attributes).toHaveLength(3);
            const attributeIds = attributes.map((attribute) => attribute.id);
            expect(attributeIds).toContain(relationshipAttributeId);
            expect(attributeIds).toStrictEqual(expect.arrayContaining(identityAttributeIds));
        });
    });
});

describe("attribute queries", () => {
    let repositoryAttribute: LocalAttributeDTO;
    let ownSharedRelationshipAttribute: LocalAttributeDTO;

    beforeAll(async function () {
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

    afterAll(async function () {
        await cleanupAttributes();
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

    describe(ExecuteRelationshipAttributeQueryUseCase.name, () => {
        test("should allow to execute a thirdPartyRelationshipAttributeQuery", async function () {
            const result = await services2.consumption.attributes.executeThirdPartyRelationshipAttributeQuery({
                query: {
                    "@type": "ThirdPartyRelationshipAttributeQuery",
                    key: "website",
                    owner: services1.address,
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
    let serives1SharedGivenNameV0: LocalAttributeDTO;
    let services1SharedGivenNameV1: LocalAttributeDTO;

    let services1SharedRelationshipAttributeV0: LocalAttributeDTO;
    let services1SharedRelationshipAttributeV1: LocalAttributeDTO;

    let services1SharedTechnicalRelationshipAttribute: LocalAttributeDTO;

    beforeAll(async function () {
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
        serives1SharedGivenNameV0 = await executeFullCreateAndShareRepositoryAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "A given name"
                }
            }
        });
        services1RepoGivenNameV0 = (await services1.consumption.attributes.getAttribute({ id: serives1SharedGivenNameV0.shareInfo!.sourceAttribute! })).value;

        ({ predecessor: serives1SharedGivenNameV0, successor: services1SharedGivenNameV1 } = await executeFullSucceedRepositoryAttributeAndNotifyPeerFlow(services1, services2, {
            predecessorId: services1RepoGivenNameV0.id,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Another given name"
                }
            }
        }));
        services1RepoGivenNameV0 = (await services1.consumption.attributes.getAttribute({ id: serives1SharedGivenNameV0.shareInfo!.sourceAttribute! })).value;
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
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
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

    afterAll(async function () {
        await cleanupAttributes();
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
                serives1SharedGivenNameV0,
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
        beforeAll(async function () {
            const services1SharedAttributeIds = [
                serives1SharedGivenNameV0,
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

                if (typeof attribute.succeededBy === "undefined") {
                    onlyLatestReceivedAttributes.push(attribute);
                }

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
