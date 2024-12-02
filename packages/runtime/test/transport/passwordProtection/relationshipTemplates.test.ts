import { RelationshipTemplateReference } from "@nmshd/transport";
import { DateTime } from "luxon";
import { createTemplate, emptyRelationshipTemplateContent, RuntimeServiceProvider, TestRuntimeServices } from "../../lib";

const serviceProvider = new RuntimeServiceProvider();
let runtimeServices1: TestRuntimeServices;
let runtimeServices2: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2);
    runtimeServices1 = runtimeServices[0];
    runtimeServices2 = runtimeServices[1];
}, 30000);
afterAll(() => serviceProvider.stop());

describe("Password-protected templates", () => {
    test("send and receive a password-protected template", async () => {
        const createResult = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
            content: emptyRelationshipTemplateContent,
            expiresAt: DateTime.utc().plus({ minutes: 1 }).toString(),
            passwordProtection: {
                password: "password"
            }
        });
        expect(createResult).toBeSuccessful();
        expect(createResult.value.passwordProtection!.password).toBe("password");
        expect(createResult.value.passwordProtection!.passwordIsPin).toBeUndefined();
        const reference = RelationshipTemplateReference.from(createResult.value.truncatedReference);
        expect(reference.passwordProtection!.passwordType).toBe("pw");

        const loadResult = await runtimeServices2.transport.relationshipTemplates.loadPeerRelationshipTemplate({
            reference: createResult.value.truncatedReference,
            password: "password"
        });
        expect(loadResult).toBeSuccessful();
        expect(loadResult.value.passwordProtection!.password).toBe("password");
        expect(loadResult.value.passwordProtection!.passwordIsPin).toBeUndefined();
    });

    test("send and receive a PIN-protected template", async () => {
        const createResult = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
            content: emptyRelationshipTemplateContent,
            expiresAt: DateTime.utc().plus({ minutes: 1 }).toString(),
            passwordProtection: {
                password: "1234",
                passwordIsPin: true
            }
        });
        expect(createResult).toBeSuccessful();
        expect(createResult.value.passwordProtection!.password).toBe("1234");
        expect(createResult.value.passwordProtection!.passwordIsPin).toBe(true);
        const reference = RelationshipTemplateReference.from(createResult.value.truncatedReference);
        expect(reference.passwordProtection!.passwordType).toBe("pin4");

        const loadResult = await runtimeServices2.transport.relationshipTemplates.loadPeerRelationshipTemplate({
            reference: createResult.value.truncatedReference,
            password: "1234"
        });
        expect(loadResult).toBeSuccessful();
        expect(loadResult.value.passwordProtection!.password).toBe("1234");
        expect(loadResult.value.passwordProtection!.passwordIsPin).toBe(true);
    });

    test("error when loading a password-protected template with a wrong password", async () => {
        const createResult = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
            content: emptyRelationshipTemplateContent,
            expiresAt: DateTime.utc().plus({ minutes: 1 }).toString(),
            passwordProtection: {
                password: "password"
            }
        });
        expect(createResult).toBeSuccessful();

        const loadResult = await runtimeServices2.transport.relationshipTemplates.loadPeerRelationshipTemplate({
            reference: createResult.value.truncatedReference,
            password: "wrong-password"
        });
        expect(loadResult).toBeAnError("RelationshipTemplate not found. Make sure the ID exists and the record is not expired.", "error.runtime.recordNotFound");
    });

    test("error when loading a password-protected template with no password", async () => {
        const createResult = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
            content: emptyRelationshipTemplateContent,
            expiresAt: DateTime.utc().plus({ minutes: 1 }).toString(),
            passwordProtection: {
                password: "password"
            }
        });
        expect(createResult).toBeSuccessful();

        const loadResult = await runtimeServices2.transport.relationshipTemplates.loadPeerRelationshipTemplate({
            reference: createResult.value.truncatedReference
        });
        expect(loadResult).toBeAnError(/.*/, "error.transport.noPasswordProvided");
    });

    test("validation error when creating a template with empty string as the password", async () => {
        const createResult = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
            content: emptyRelationshipTemplateContent,
            expiresAt: DateTime.utc().plus({ minutes: 1 }).toString(),
            passwordProtection: {
                password: ""
            }
        });
        expect(createResult).toBeAnError("password must NOT have fewer than 1 characters", "error.runtime.validation.invalidPropertyValue");
    });

    test("validation error when creating a template with an invalid PIN", async () => {
        const createResult = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
            content: emptyRelationshipTemplateContent,
            expiresAt: DateTime.utc().plus({ minutes: 1 }).toString(),
            passwordProtection: {
                password: "invalid-pin",
                passwordIsPin: true
            }
        });
        expect(createResult).toBeAnError(
            "'passwordProtection.passwordIsPin' is true, hence 'passwordProtection.password' must consist of 4 to 16 digits from 0 to 9.",
            "error.runtime.validation.invalidPropertyValue"
        );
    });

    describe("LoadItemFromTruncatedReferenceUseCase", () => {
        test("send and receive a password-protected template", async () => {
            const createResult = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                content: emptyRelationshipTemplateContent,
                expiresAt: DateTime.utc().plus({ minutes: 1 }).toString(),
                passwordProtection: {
                    password: "password"
                }
            });

            const result = await runtimeServices2.transport.account.loadItemFromTruncatedReference({
                reference: createResult.value.truncatedReference,
                password: "password"
            });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("RelationshipTemplate");
        });

        test("error when loading a password-protected template with wrong password", async () => {
            const createResult = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                content: emptyRelationshipTemplateContent,
                expiresAt: DateTime.utc().plus({ minutes: 1 }).toString(),
                passwordProtection: {
                    password: "password"
                }
            });

            const result = await runtimeServices2.transport.account.loadItemFromTruncatedReference({
                reference: createResult.value.truncatedReference,
                password: "wrong-password"
            });
            expect(result).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("error when loading a password-protected template with no password", async () => {
            const createResult = await runtimeServices1.transport.relationshipTemplates.createOwnRelationshipTemplate({
                content: emptyRelationshipTemplateContent,
                expiresAt: DateTime.utc().plus({ minutes: 1 }).toString(),
                passwordProtection: {
                    password: "password"
                }
            });

            const result = await runtimeServices2.transport.account.loadItemFromTruncatedReference({
                reference: createResult.value.truncatedReference
            });
            expect(result).toBeAnError(/.*/, "error.transport.noPasswordProvided");
        });
    });
});

describe("Password-protected templates via tokens", () => {
    test("send and receive a password-protected template via token", async () => {
        const templateId = (await createTemplate(runtimeServices1.transport, undefined, { password: "password" })).id;

        const createResult = await runtimeServices1.transport.relationshipTemplates.createTokenForOwnTemplate({
            templateId,
            passwordProtection: {
                password: "password"
            }
        });

        const loadResult = await runtimeServices2.transport.relationshipTemplates.loadPeerRelationshipTemplate({
            reference: createResult.value.truncatedReference,
            password: "password"
        });
        expect(loadResult).toBeSuccessful();
        expect(loadResult.value.passwordProtection!.password).toBe("password");
        expect(loadResult.value.passwordProtection!.passwordIsPin).toBeUndefined();
    });

    test("send and receive a PIN-protected template via token", async () => {
        const templateId = (await createTemplate(runtimeServices1.transport, undefined, { password: "1234", passwordIsPin: true })).id;

        const createResult = await runtimeServices1.transport.relationshipTemplates.createTokenForOwnTemplate({
            templateId,
            passwordProtection: {
                password: "1234",
                passwordIsPin: true
            }
        });

        const loadResult = await runtimeServices2.transport.relationshipTemplates.loadPeerRelationshipTemplate({
            reference: createResult.value.truncatedReference,
            password: "1234"
        });
        expect(loadResult).toBeSuccessful();
        expect(loadResult.value.passwordProtection!.password).toBe("1234");
        expect(loadResult.value.passwordProtection!.passwordIsPin).toBe(true);
    });

    test("error when loading a password-protected template via token with wrong password", async () => {
        const templateId = (await createTemplate(runtimeServices1.transport, undefined, { password: "password" })).id;

        const createResult = await runtimeServices1.transport.relationshipTemplates.createTokenForOwnTemplate({
            templateId,
            passwordProtection: {
                password: "password"
            }
        });

        const loadResult = await runtimeServices2.transport.relationshipTemplates.loadPeerRelationshipTemplate({
            reference: createResult.value.truncatedReference,
            password: "wrong-password"
        });
        expect(loadResult).toBeAnError("Token not found. Make sure the ID exists and the record is not expired.", "error.runtime.recordNotFound");
    });

    test("error when loading a password-protected template via token with no password", async () => {
        const templateId = (await createTemplate(runtimeServices1.transport, undefined, { password: "password" })).id;

        const createResult = await runtimeServices1.transport.relationshipTemplates.createTokenForOwnTemplate({
            templateId,
            passwordProtection: {
                password: "password"
            }
        });

        const loadResult = await runtimeServices2.transport.relationshipTemplates.loadPeerRelationshipTemplate({
            reference: createResult.value.truncatedReference
        });
        expect(loadResult).toBeAnError(/.*/, "error.transport.noPasswordProvided");
    });

    test("validation error when token password protection doesn't inherit template password protection", async () => {
        const templateId = (await createTemplate(runtimeServices1.transport, undefined, { password: "password" })).id;

        const createResult = await runtimeServices1.transport.relationshipTemplates.createTokenForOwnTemplate({
            templateId
        });

        expect(createResult).toBeAnError(/.*/, "error.runtime.relationshipTemplates.passwordProtectionMustBeInherited");
    });

    describe("LoadItemFromTruncatedReferenceUseCase", () => {
        test("send and receive a password-protected template via token", async () => {
            const template = await createTemplate(runtimeServices1.transport, undefined, { password: "password" });

            const result = await runtimeServices2.transport.account.loadItemFromTruncatedReference({
                reference: template.truncatedReference,
                password: "password"
            });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("RelationshipTemplate");
        });

        test("error when loading a password-protected template via token with wrong password", async () => {
            const template = await createTemplate(runtimeServices1.transport, undefined, { password: "password" });

            const result = await runtimeServices2.transport.account.loadItemFromTruncatedReference({
                reference: template.truncatedReference,
                password: "wrong-password"
            });
            expect(result).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("error when loading a password-protected template via token with no password", async () => {
            const template = await createTemplate(runtimeServices1.transport, undefined, { password: "password" });

            const result = await runtimeServices2.transport.account.loadItemFromTruncatedReference({
                reference: template.truncatedReference
            });
            expect(result).toBeAnError(/.*/, "error.transport.noPasswordProvided");
        });
    });
});

describe("Password-protected tokens for unprotected templates", () => {
    let templateId: string;

    beforeAll(async () => {
        templateId = (await createTemplate(runtimeServices1.transport)).id;
    });

    test("send and receive a template via password-protected token", async () => {
        const createResult = await runtimeServices1.transport.relationshipTemplates.createTokenForOwnTemplate({
            templateId,
            passwordProtection: { password: "password" }
        });
        expect(createResult).toBeSuccessful();
        expect(createResult.value.passwordProtection?.password).toBe("password");
        expect(createResult.value.passwordProtection?.passwordIsPin).toBeUndefined();

        const loadResult = await runtimeServices2.transport.relationshipTemplates.loadPeerRelationshipTemplate({
            reference: createResult.value.truncatedReference,
            password: "password"
        });
        expect(loadResult).toBeSuccessful();
    });

    test("send and receive a template via PIN-protected token", async () => {
        const createResult = await runtimeServices1.transport.relationshipTemplates.createTokenForOwnTemplate({
            templateId,
            passwordProtection: { password: "1234", passwordIsPin: true }
        });
        expect(createResult).toBeSuccessful();
        expect(createResult.value.passwordProtection?.password).toBe("1234");
        expect(createResult.value.passwordProtection?.passwordIsPin).toBe(true);

        const loadResult = await runtimeServices2.transport.relationshipTemplates.loadPeerRelationshipTemplate({
            reference: createResult.value.truncatedReference,
            password: "1234"
        });
        expect(loadResult).toBeSuccessful();
    });

    test("error when loading the template with a wrong password", async () => {
        const createResult = await runtimeServices1.transport.relationshipTemplates.createTokenForOwnTemplate({
            templateId,
            passwordProtection: { password: "password" }
        });
        expect(createResult).toBeSuccessful();

        const loadResult = await runtimeServices2.transport.files.getOrLoadFile({ reference: createResult.value.truncatedReference, password: "wrong-password" });
        expect(loadResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("error when loading the template with no password", async () => {
        const createResult = await runtimeServices1.transport.relationshipTemplates.createTokenForOwnTemplate({
            templateId,
            passwordProtection: { password: "password" }
        });
        expect(createResult).toBeSuccessful();

        const loadResult = await runtimeServices2.transport.files.getOrLoadFile({ reference: createResult.value.truncatedReference });
        expect(loadResult).toBeAnError(/.*/, "error.transport.noPasswordProvided");
    });

    test("validation error when creating a token with empty string as the password", async () => {
        const createResult = await runtimeServices1.transport.relationshipTemplates.createTokenForOwnTemplate({
            templateId,
            passwordProtection: { password: "" }
        });
        expect(createResult).toBeAnError("password must NOT have fewer than 1 characters", "error.runtime.validation.invalidPropertyValue");
    });

    test("validation error when creating a token with an invalid PIN", async () => {
        const createResult = await runtimeServices1.transport.relationshipTemplates.createTokenForOwnTemplate({
            templateId: templateId,
            passwordProtection: { password: "invalid-pin", passwordIsPin: true }
        });
        expect(createResult).toBeAnError(
            "'passwordProtection.passwordIsPin' is true, hence 'passwordProtection.password' must consist of 4 to 16 digits from 0 to 9.",
            "error.runtime.validation.invalidPropertyValue"
        );
    });

    describe("LoadItemFromTruncatedReferenceUseCase", () => {
        test("send and receive a template  via password-protected token", async () => {
            const createResult = await runtimeServices1.transport.relationshipTemplates.createTokenForOwnTemplate({
                templateId,
                passwordProtection: { password: "password" }
            });

            const result = await runtimeServices2.transport.account.loadItemFromTruncatedReference({
                reference: createResult.value.truncatedReference,
                password: "password"
            });
            expect(result).toBeSuccessful();
            expect(result.value.type).toBe("RelationshipTemplate");
        });

        test("error when loading a template with wrong password", async () => {
            const createResult = await runtimeServices1.transport.relationshipTemplates.createTokenForOwnTemplate({
                templateId,
                passwordProtection: { password: "password" }
            });

            const result = await runtimeServices2.transport.account.loadItemFromTruncatedReference({
                reference: createResult.value.truncatedReference,
                password: "wrong-password"
            });
            expect(result).toBeAnError(/.*/, "error.runtime.recordNotFound");
        });

        test("error when loading a template with no password", async () => {
            const createResult = await runtimeServices1.transport.relationshipTemplates.createTokenForOwnTemplate({
                templateId,
                passwordProtection: { password: "password" }
            });

            const result = await runtimeServices2.transport.account.loadItemFromTruncatedReference({
                reference: createResult.value.truncatedReference
            });
            expect(result).toBeAnError(/.*/, "error.transport.noPasswordProvided");
        });
    });
});