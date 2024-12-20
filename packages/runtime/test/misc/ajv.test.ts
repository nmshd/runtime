import { RelationshipAttributeConfidentiality } from "@nmshd/content";
import { CreateAndShareRelationshipAttributeRequest, CreateRepositoryAttributeRequest, SucceedRepositoryAttributeRequest } from "../../src";
import { RuntimeServiceProvider, TestRuntimeServices, establishRelationship } from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();

let services1: TestRuntimeServices;
let services2: TestRuntimeServices;
let services3: TestRuntimeServices;

let appService: TestRuntimeServices;

describe("attributes", () => {
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

    beforeEach(() => {
        services1.eventBus.reset();
        services2.eventBus.reset();
        services3.eventBus.reset();
    });

    test("should not create a repository attribute with a wrong validTo", async () => {
        const request: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "name"
                },
                tags: ["tag1", "tag2"],
                validTo: 23
            } as any
        };
        const result = await services1.consumption.attributes.createRepositoryAttribute(request);
        expect(result).toBeAnError("content/validTo must match ISO8601 datetime format", "error.runtime.validation.invalidPropertyValue");
    });

    test("should not create a repository attribute with a wrong value type", async () => {
        const request: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: 34
                },
                tags: ["tag1", "tag2"]
            } as any
        };
        const result = await services1.consumption.attributes.createRepositoryAttribute(request);
        expect(result).toBeAnError("content/value must match a schema in anyOf", "error.runtime.validation.invalidPropertyValue");
    });

    test("should not create a repository attribute with a wrong value type and wrong validTo", async () => {
        const request: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: 34
                },
                tags: ["tag1", "tag2"],
                validTo: 23
            } as any
        };
        const result = await services1.consumption.attributes.createRepositoryAttribute(request);
        expect(result).toBeAnError("content/value must match a schema in anyOf", "error.runtime.validation.invalidPropertyValue");
    });

    test("should not succeed a repository attribute with wrong predecessorId", async () => {
        const createAttributeRequest: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        };
        await services1.consumption.attributes.createRepositoryAttribute(createAttributeRequest);

        const succeedAttributeRequest: SucceedRepositoryAttributeRequest = {
            predecessorId: 2,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Tina Turner"
                },
                tags: ["Bunsen", "Burner"]
            }
        } as any;
        const result = await services1.consumption.attributes.succeedRepositoryAttribute(succeedAttributeRequest);
        expect(result).toBeAnError("predecessorId must be string", "error.runtime.validation.invalidPropertyValue");
    });

    test("should not succeed a repository attribute with wrong content value", async () => {
        const createAttributeRequest: CreateRepositoryAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        };
        await services1.consumption.attributes.createRepositoryAttribute(createAttributeRequest);

        const succeedAttributeRequest: SucceedRepositoryAttributeRequest = {
            predecessorId: "2",
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: 3
                },
                tags: ["Bunsen", "Burner"]
            }
        } as any;
        const result = await services1.consumption.attributes.succeedRepositoryAttribute(succeedAttributeRequest);
        expect(result).toBeAnError("successorContent/value must match a schema in anyOf", "error.runtime.validation.invalidPropertyValue");
    });

    test("should not create and share a relationship attribute with wrong type", async () => {
        const createAndShareRelationshipAttributeRequest: CreateAndShareRelationshipAttributeRequest = {
            content: {
                key: "test",
                value: {
                    "@type": "wrongType",
                    value: "aString",
                    title: "aTitle"
                } as any,
                confidentiality: RelationshipAttributeConfidentiality.Public
            },
            peer: services2.address
        };
        const requestResult = await services1.consumption.attributes.createAndShareRelationshipAttribute(createAndShareRelationshipAttributeRequest);
        expect(requestResult).toBeAnError("content/value must match a schema in anyOf", "error.runtime.validation.invalidPropertyValue");
    });

    test("should not create and share a relationship attribute with wrong key", async () => {
        const createAndShareRelationshipAttributeRequest: CreateAndShareRelationshipAttributeRequest = {
            content: {
                key: 2,
                value: {
                    "@type": "ProprietadryString",
                    value: "aString",
                    title: "aTitle"
                } as any,
                confidentiality: RelationshipAttributeConfidentiality.Public
            } as any,
            peer: services2.address
        };
        const requestResult = await services1.consumption.attributes.createAndShareRelationshipAttribute(createAndShareRelationshipAttributeRequest);
        expect(requestResult).toBeAnError("content/value must match a schema in anyOf", "error.runtime.validation.invalidPropertyValue");
    });
});
