import { RelationshipTemplateContent, RelationshipTemplateContentJSON } from "@nmshd/content";
import { DateTime } from "luxon";
import { GetRelationshipTemplatesQuery, OwnerRestriction } from "../../src";
import { emptyRelationshipTemplateContent, QueryParamConditions, RuntimeServiceProvider, TestRuntimeServices } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let runtimeServices1: TestRuntimeServices;
let runtimeServices2: TestRuntimeServices;

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

        expect(response.isSuccess).toBe(true);
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
                reference: createResult.value.truncatedReference
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
                reference: createResult.value.truncatedReference
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
            const createTokenResult = await runtimeServices1.transport.relationshipTemplates.createTokenForOwnTemplate({
                templateId: createResult.value.id,
                forIdentity: runtimeServices2.address
            });
            expect(createTokenResult).toBeSuccessful();
        });

        test("create a token QR code for a personalized template", async () => {
            const createResult = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                content: emptyRelationshipTemplateContent,
                expiresAt: DateTime.utc().plus({ minutes: 1 }).toString(),
                forIdentity: runtimeServices2.address
            });
            expect(createResult).toBeSuccessful();
            const createQRCodeResult = await runtimeServices1.transport.relationshipTemplates.createTokenQRCodeForOwnTemplate({
                templateId: createResult.value.id,
                forIdentity: runtimeServices2.address
            });
            expect(createQRCodeResult).toBeSuccessful();
        });

        test("error when creating a token for a personalized template with false personalization", async () => {
            const createResult = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                content: emptyRelationshipTemplateContent,
                expiresAt: DateTime.utc().plus({ minutes: 1 }).toString(),
                forIdentity: runtimeServices2.address
            });
            expect(createResult).toBeSuccessful();
            const createQRCodeWithWrongPersonalizationResult = await runtimeServices1.transport.relationshipTemplates.createTokenForOwnTemplate({
                templateId: createResult.value.id,
                forIdentity: runtimeServices1.address
            });
            expect(createQRCodeWithWrongPersonalizationResult).toBeAnError(/.*/, "error.runtime.relationshipTemplates.personalizationMustBeInherited");
            const createQRCodeWithoutPersonalizationResult = await runtimeServices1.transport.relationshipTemplates.createTokenForOwnTemplate({
                templateId: createResult.value.id
            });
            expect(createQRCodeWithoutPersonalizationResult).toBeAnError(/.*/, "error.runtime.relationshipTemplates.personalizationMustBeInherited");
        });

        test("error when creating a token QR code for a personalized template with false personalization", async () => {
            const createResult = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                content: emptyRelationshipTemplateContent,
                expiresAt: DateTime.utc().plus({ minutes: 1 }).toString(),
                forIdentity: runtimeServices2.address
            });
            expect(createResult).toBeSuccessful();
            const createQRCodeWithWrongPersonalizationResult = await runtimeServices1.transport.relationshipTemplates.createTokenQRCodeForOwnTemplate({
                templateId: createResult.value.id,
                forIdentity: runtimeServices1.address
            });
            expect(createQRCodeWithWrongPersonalizationResult).toBeAnError(/.*/, "error.runtime.relationshipTemplates.personalizationMustBeInherited");
            const createQRCodeWithoutPersonalizationResult = await runtimeServices1.transport.relationshipTemplates.createTokenQRCodeForOwnTemplate({
                templateId: createResult.value.id
            });
            expect(createQRCodeWithoutPersonalizationResult).toBeAnError(/.*/, "error.runtime.relationshipTemplates.personalizationMustBeInherited");
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
                forIdentity: runtimeServices1.address
            })
        ).value;
        const conditions = new QueryParamConditions<GetRelationshipTemplatesQuery>(template, runtimeServices1.transport)
            .addBooleanSet("isOwn")
            .addDateSet("createdAt")
            .addDateSet("expiresAt")
            .addStringSet("createdBy")
            .addStringSet("createdByDevice")
            .addNumberSet("maxNumberOfAllocations")
            .addStringSet("forIdentity");

        await conditions.executeTests((c, q) => c.relationshipTemplates.getRelationshipTemplates({ query: q }));
    });

    test("query own relationshipTemplates", async () => {
        const template = (
            await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                maxNumberOfAllocations: 1,
                expiresAt: DateTime.utc().plus({ minutes: 10 }).toString(),
                content: emptyRelationshipTemplateContent
            })
        ).value;
        const conditions = new QueryParamConditions<GetRelationshipTemplatesQuery>(template, runtimeServices1.transport)
            .addDateSet("createdAt")
            .addDateSet("expiresAt")
            .addStringSet("createdBy")
            .addStringSet("createdByDevice")
            .addNumberSet("maxNumberOfAllocations");
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
        const peerTemplate = (await runtimeServices2.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: createdTemplate.truncatedReference })).value;
        const conditions = new QueryParamConditions<GetRelationshipTemplatesQuery>(peerTemplate, runtimeServices2.transport)
            .addDateSet("createdAt")
            .addDateSet("expiresAt")
            .addStringSet("createdBy")
            .addStringSet("createdByDevice")
            .addNumberSet("maxNumberOfAllocations");

        await conditions.executeTests((c, q) => c.relationshipTemplates.getRelationshipTemplates({ query: q, ownerRestriction: OwnerRestriction.Peer }));
    });
});
