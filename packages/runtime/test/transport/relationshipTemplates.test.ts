import { RelationshipTemplateContent, RelationshipTemplateContentJSON } from "@nmshd/content";
import { DateTime } from "luxon";
import { GetRelationshipTemplatesQuery, OwnerRestriction } from "../../src";
import { emptyRelationshipTemplateContent, QueryParamConditions, RuntimeServiceProvider, TestRuntimeServices } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let runtimeServices1: TestRuntimeServices;
let runtimeServices2: TestRuntimeServices;

const UNKNOWN_TEMPLATE_ID = "RLTXXXXXXXXXXXXXXXXX";

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2);
    runtimeServices1 = runtimeServices[0];
    runtimeServices2 = runtimeServices[1];
}, 30000);
afterAll(() => serviceProvider.stop());

describe("RelationshipTemplate Tests", () => {
    test("create a RelationshipTemplate", async () => {
        const response = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
            maxNumberOfAllocations: 1,
            expiresAt: DateTime.utc().plus({ minutes: 10 }).toString(),
            content: emptyRelationshipTemplateContent
        });

        expect(response).toBeSuccessful();
    });

    test("load peer RelationshipTemplate by truncated reference", async () => {
        const uploadedTemplate = (
            await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                maxNumberOfAllocations: 1,
                expiresAt: DateTime.utc().plus({ minutes: 10 }).toString(),
                content: emptyRelationshipTemplateContent
            })
        ).value;

        const result = await runtimeServices2.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: uploadedTemplate.reference.truncated });
        expect(result).toBeSuccessful();

        const tempalte = result.value;
        expect(tempalte.content).toStrictEqual(uploadedTemplate.content);
    });

    test("load peer RelationshipTemplate by url reference", async () => {
        const uploadedTemplate = (
            await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                maxNumberOfAllocations: 1,
                expiresAt: DateTime.utc().plus({ minutes: 10 }).toString(),
                content: emptyRelationshipTemplateContent
            })
        ).value;

        const result = await runtimeServices2.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: uploadedTemplate.reference.url });
        expect(result).toBeSuccessful();

        const template = result.value;
        expect(template.content).toStrictEqual(uploadedTemplate.content);
    });

    test("error when creating a RelationshipTemplate with undefined expiresAt", async () => {
        const response = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
            content: emptyRelationshipTemplateContent,
            expiresAt: undefined as unknown as string
        });

        expect(response).toBeAnError("must have required property 'expiresAt'", "error.runtime.validation.invalidPropertyValue");
    });

    test("automatically set expiresAt of Request when creating a RelationshipTemplate with Request for new Relationship with undefined expiresAt", async () => {
        const relationshipTemplateContent = RelationshipTemplateContent.from({
            onNewRelationship: {
                "@type": "Request",
                items: [{ "@type": "TestRequestItem", mustBeAccepted: false }]
            }
        }).toJSON();

        const relationshipTemplateExpirationDate = DateTime.utc().plus({ minutes: 10 }).toString();
        const response = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
            content: relationshipTemplateContent,
            expiresAt: relationshipTemplateExpirationDate
        });

        expect(response).toBeSuccessful();
        expect((response.value.content as RelationshipTemplateContentJSON).onNewRelationship.expiresAt).toStrictEqual(relationshipTemplateExpirationDate);
    });

    test("error when creating a RelationshipTemplate with Request for new Relationship that expires after the RelationshipTemplate", async () => {
        const relationshipTemplateContent = RelationshipTemplateContent.from({
            onNewRelationship: {
                "@type": "Request",
                expiresAt: DateTime.utc().plus({ minutes: 20 }).toString(),
                items: [{ "@type": "TestRequestItem", mustBeAccepted: false }]
            }
        }).toJSON();

        const response = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
            content: relationshipTemplateContent,
            expiresAt: DateTime.utc().plus({ minutes: 10 }).toString()
        });

        expect(response).toBeAnError(
            "The expiration date of the Request within the onNewRelationship property of the RelationshipTemplateContent must be set such that the expiration date of the RelationshipTemplate is not exceeded.",
            "error.runtime.relationshipTemplates.requestCannotExpireAfterRelationshipTemplate"
        );
    });

    test("create a template with undefined maxNumberOfAllocations", async () => {
        const response = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
            content: emptyRelationshipTemplateContent,
            expiresAt: DateTime.utc().plus({ minutes: 1 }).toString()
        });

        const templateWithUndefinedMaxNumberOfAllocations = response.value;

        expect(response).toBeSuccessful();
        expect(templateWithUndefinedMaxNumberOfAllocations.maxNumberOfAllocations).toBeUndefined();
    });

    test("read a template with undefined maxNumberOfAllocations", async () => {
        const templateWithUndefinedMaxNumberOfAllocations = (
            await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                content: emptyRelationshipTemplateContent,
                expiresAt: DateTime.utc().plus({ minutes: 1 }).toString()
            })
        ).value;

        const response = await runtimeServices1.transport.relationshipTemplates.getRelationshipTemplate({
            id: templateWithUndefinedMaxNumberOfAllocations.id
        });

        expect(response).toBeSuccessful();
        expect(response.value.maxNumberOfAllocations).toBeUndefined();
    });

    test("see If template exists in /RelationshipTemplates/Own", async () => {
        const template = (
            await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                maxNumberOfAllocations: 1,
                expiresAt: DateTime.utc().plus({ minutes: 10 }).toString(),
                content: emptyRelationshipTemplateContent
            })
        ).value;

        const response = await runtimeServices1.transport.relationshipTemplates.getRelationshipTemplates({
            ownerRestriction: OwnerRestriction.Own
        });
        expect(response).toBeSuccessful();
        expect(response.value).toContainEqual(template);
    });

    test("see If template exists in /RelationshipTemplates/{id}", async () => {
        const template = (
            await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                maxNumberOfAllocations: 1,
                expiresAt: DateTime.utc().plus({ minutes: 10 }).toString(),
                content: emptyRelationshipTemplateContent
            })
        ).value;

        const response = await runtimeServices1.transport.relationshipTemplates.getRelationshipTemplate({ id: template.id });
        expect(response).toBeSuccessful();
    });

    test("expect a validation error for sending maxNumberOfAllocations 0", async () => {
        const response = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
            content: emptyRelationshipTemplateContent,
            expiresAt: DateTime.utc().plus({ minutes: 1 }).toString(),
            maxNumberOfAllocations: 0
        });

        expect(response.isError).toBeTruthy();
        expect(response.error.code).toBe("error.runtime.validation.invalidPropertyValue");
    });

    test("expect a validation error for sending a false template content type", async () => {
        const response = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
            content: {},
            expiresAt: DateTime.utc().plus({ minutes: 1 }).toString(),
            maxNumberOfAllocations: 1
        });

        expect(response).toBeAnError("The content of a RelationshipTemplate", "error.runtime.validation.invalidPropertyValue");
    });

    describe("Personalized templates", () => {
        test("send and receive a personalized template", async () => {
            const createResult = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                content: emptyRelationshipTemplateContent,
                expiresAt: DateTime.utc().plus({ minutes: 1 }).toString(),
                forIdentity: runtimeServices2.address
            });
            expect(createResult).toBeSuccessful();

            const loadResult = await runtimeServices2.transport.relationshipTemplates.loadPeerRelationshipTemplate({
                reference: createResult.value.reference.truncated
            });
            expect(loadResult).toBeSuccessful();
            expect(loadResult.value.forIdentity).toBe(runtimeServices2.address);
        });

        test("error when loading a template for another identity", async () => {
            const createResult = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                content: emptyRelationshipTemplateContent,
                expiresAt: DateTime.utc().plus({ minutes: 1 }).toString(),
                forIdentity: runtimeServices1.address
            });
            expect(createResult).toBeSuccessful();

            const loadResult = await runtimeServices2.transport.relationshipTemplates.loadPeerRelationshipTemplate({
                reference: createResult.value.reference.truncated
            });
            expect(loadResult).toBeAnError(
                `You tried to access personalized content '${createResult.value.id}'. You are either not logged in or the content is not intended for you.`,
                "error.transport.general.notIntendedForYou"
            );
        });

        test("create a token for a personalized template", async () => {
            const createResult = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                content: emptyRelationshipTemplateContent,
                expiresAt: DateTime.utc().plus({ minutes: 1 }).toString(),
                forIdentity: runtimeServices2.address
            });
            expect(createResult).toBeSuccessful();
            const createTokenResult = await runtimeServices1.transport.relationshipTemplates.createTokenForOwnRelationshipTemplate({
                templateId: createResult.value.id,
                forIdentity: runtimeServices2.address
            });
            expect(createTokenResult).toBeSuccessful();
        });

        test("error when creating a token for a personalized template with false personalization", async () => {
            const createResult = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                content: emptyRelationshipTemplateContent,
                expiresAt: DateTime.utc().plus({ minutes: 1 }).toString(),
                forIdentity: runtimeServices2.address
            });
            expect(createResult).toBeSuccessful();
            const createTokenWithWrongPersonalizationResult = await runtimeServices1.transport.relationshipTemplates.createTokenForOwnRelationshipTemplate({
                templateId: createResult.value.id,
                forIdentity: runtimeServices1.address
            });
            expect(createTokenWithWrongPersonalizationResult).toBeAnError(/.*/, "error.runtime.relationshipTemplates.personalizationMustBeInherited");
            const createTokenWithoutPersonalizationResult = await runtimeServices1.transport.relationshipTemplates.createTokenForOwnRelationshipTemplate({
                templateId: createResult.value.id
            });
            expect(createTokenWithoutPersonalizationResult).toBeAnError(/.*/, "error.runtime.relationshipTemplates.personalizationMustBeInherited");
        });
    });

    describe("Delete template", () => {
        test("accessing invalid template id causes an error", async () => {
            const response = await runtimeServices1.transport.relationshipTemplates.deleteRelationshipTemplate({ templateId: UNKNOWN_TEMPLATE_ID });
            expect(response).toBeAnError("RelationshipTemplate not found. Make sure the ID exists and the record is not expired.", "error.runtime.recordNotFound");
        });

        test("successfully delete template", async () => {
            const template = (
                await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                    content: emptyRelationshipTemplateContent,
                    expiresAt: DateTime.utc().plus({ minutes: 1 }).toString()
                })
            ).value;

            const deleteTemplateResponse = await runtimeServices1.transport.relationshipTemplates.deleteRelationshipTemplate({ templateId: template.id });
            expect(deleteTemplateResponse).toBeSuccessful();

            const getTemplateResponse = await runtimeServices1.transport.relationshipTemplates.getRelationshipTemplate({ id: template.id });
            expect(getTemplateResponse).toBeAnError("RelationshipTemplate not found. Make sure the ID exists and the record is not expired.", "error.runtime.recordNotFound");
        });
    });
});

describe("Serialization Errors", () => {
    test("create a template with wrong content : missing values", async () => {
        const response = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
            content: { a: "A", "@type": "Message" },
            expiresAt: DateTime.utc().plus({ minutes: 1 }).toString()
        });
        expect(response).toBeAnError("Message.secretKey :: Value is not defined", "error.runtime.requestDeserialization");
    });

    test("create a template with wrong content : not existent type", async () => {
        const response = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
            content: { a: "A", "@type": "someNoneExistingType" },
            expiresAt: DateTime.utc().plus({ minutes: 1 }).toString()
        });
        expect(response).toBeAnError(
            "Type 'someNoneExistingType' with version 1 was not found within reflection classes. You might have to install a module first.",
            "error.runtime.unknownType"
        );
    });
});

describe("RelationshipTemplates query", () => {
    test("query all relationshipTemplates", async () => {
        const template = (
            await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                maxNumberOfAllocations: 1,
                expiresAt: DateTime.utc().plus({ minutes: 10 }).toString(),
                content: emptyRelationshipTemplateContent,
                forIdentity: runtimeServices1.address,
                passwordProtection: {
                    password: "1234",
                    passwordIsPin: true
                }
            })
        ).value;
        const conditions = new QueryParamConditions<GetRelationshipTemplatesQuery>(template, runtimeServices1.transport)
            .addBooleanSet("isOwn")
            .addDateSet("createdAt")
            .addDateSet("expiresAt")
            .addStringSet("createdBy")
            .addStringSet("createdByDevice")
            .addNumberSet("maxNumberOfAllocations")
            .addStringSet("forIdentity")
            .addSingleCondition({
                expectedResult: true,
                key: "passwordProtection",
                value: ""
            })
            .addSingleCondition({
                expectedResult: false,
                key: "passwordProtection",
                value: "!"
            })
            .addStringSet("passwordProtection.password")
            .addSingleCondition({
                expectedResult: true,
                key: "passwordProtection.passwordIsPin",
                value: "true"
            })
            .addSingleCondition({
                expectedResult: false,
                key: "passwordProtection.passwordIsPin",
                value: "!"
            });

        await conditions.executeTests((c, q) => c.relationshipTemplates.getRelationshipTemplates({ query: q }));
    });

    test("query own relationshipTemplates", async () => {
        const template = (
            await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                maxNumberOfAllocations: 1,
                expiresAt: DateTime.utc().plus({ minutes: 10 }).toString(),
                content: emptyRelationshipTemplateContent,
                passwordProtection: {
                    password: "password"
                }
            })
        ).value;
        const conditions = new QueryParamConditions<GetRelationshipTemplatesQuery>(template, runtimeServices1.transport)
            .addDateSet("createdAt")
            .addDateSet("expiresAt")
            .addStringSet("createdBy")
            .addStringSet("createdByDevice")
            .addNumberSet("maxNumberOfAllocations")
            .addStringSet("passwordProtection.password")
            .addSingleCondition({
                expectedResult: false,
                key: "passwordProtection.passwordIsPin",
                value: "true"
            })
            .addSingleCondition({
                expectedResult: true,
                key: "passwordProtection.passwordIsPin",
                value: "!"
            });
        await conditions.executeTests((c, q) => c.relationshipTemplates.getRelationshipTemplates({ query: q, ownerRestriction: OwnerRestriction.Own }));
    });

    test("query own relationshipTemplates with passwordLocationIndicator that is a number", async () => {
        const template = (
            await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                expiresAt: DateTime.utc().plus({ minutes: 10 }).toString(),
                content: emptyRelationshipTemplateContent,
                passwordProtection: {
                    password: "password",
                    passwordLocationIndicator: 50
                }
            })
        ).value;
        const conditions = new QueryParamConditions<GetRelationshipTemplatesQuery>(template, runtimeServices1.transport)
            .addSingleCondition({
                expectedResult: true,
                key: "passwordProtection.passwordLocationIndicator",
                value: "50"
            })
            .addSingleCondition({
                expectedResult: false,
                key: "passwordProtection.passwordLocationIndicator",
                value: "0"
            })
            .addSingleCondition({
                expectedResult: false,
                key: "passwordProtection.passwordLocationIndicator",
                value: "anotherString"
            });
        await conditions.executeTests((c, q) => c.relationshipTemplates.getRelationshipTemplates({ query: q, ownerRestriction: OwnerRestriction.Own }));
    });

    test("query own relationshipTemplates with passwordLocationIndicator that is a string", async () => {
        const template = (
            await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                expiresAt: DateTime.utc().plus({ minutes: 10 }).toString(),
                content: emptyRelationshipTemplateContent,
                passwordProtection: {
                    password: "password",
                    passwordLocationIndicator: "Letter"
                }
            })
        ).value;
        const conditions = new QueryParamConditions<GetRelationshipTemplatesQuery>(template, runtimeServices1.transport)
            .addSingleCondition({
                expectedResult: true,
                key: "passwordProtection.passwordLocationIndicator",
                value: "Letter"
            })
            .addSingleCondition({
                expectedResult: true,
                key: "passwordProtection.passwordLocationIndicator",
                value: "2"
            })
            .addSingleCondition({
                expectedResult: false,
                key: "passwordProtection.passwordLocationIndicator",
                value: "anotherString"
            });
        await conditions.executeTests((c, q) => c.relationshipTemplates.getRelationshipTemplates({ query: q, ownerRestriction: OwnerRestriction.Own }));
    });

    test("query peerRelationshipTemplates", async () => {
        const createdTemplate = (
            await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                maxNumberOfAllocations: 1,
                expiresAt: DateTime.utc().plus({ minutes: 10 }).toString(),
                content: emptyRelationshipTemplateContent
            })
        ).value;
        const peerTemplate = (await runtimeServices2.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: createdTemplate.reference.truncated })).value;
        const conditions = new QueryParamConditions<GetRelationshipTemplatesQuery>(peerTemplate, runtimeServices2.transport)
            .addDateSet("createdAt")
            .addDateSet("expiresAt")
            .addStringSet("createdBy")
            .addStringSet("createdByDevice")
            .addNumberSet("maxNumberOfAllocations")
            .addSingleCondition({
                expectedResult: false,
                key: "passwordProtection",
                value: ""
            })
            .addSingleCondition({
                expectedResult: true,
                key: "passwordProtection",
                value: "!"
            });

        await conditions.executeTests((c, q) => c.relationshipTemplates.getRelationshipTemplates({ query: q, ownerRestriction: OwnerRestriction.Peer }));
    });
});
