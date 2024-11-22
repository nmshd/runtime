import { CoreDate } from "@nmshd/core-types";
import { GetTokensQuery, OwnerRestriction } from "../../src";
import { createTemplate, exchangeToken, QueryParamConditions, RuntimeServiceProvider, TestRuntimeServices, uploadFile, uploadOwnToken } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let runtimeServices1: TestRuntimeServices;
let runtimeServices2: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2);
    runtimeServices1 = runtimeServices[0];
    runtimeServices2 = runtimeServices[1];
}, 30000);
afterAll(() => serviceProvider.stop());

describe("Tokens", () => {
    test("create own Token", async () => {
        const response = await runtimeServices1.transport.tokens.createOwnToken({
            content: { key: "value" },
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            ephemeral: false
        });
        expect(response).toBeSuccessful();
    });

    test("create ephemeral Token", async () => {
        const response = await runtimeServices1.transport.tokens.createOwnToken({
            content: { key: "value" },
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            ephemeral: true
        });
        expect(response).toBeSuccessful();

        const getTokenResponse = await runtimeServices1.transport.tokens.getToken({ id: response.value.id });
        expect(getTokenResponse).toBeAnError("Token not found. Make sure the ID exists and the record is not expired.", "error.runtime.recordNotFound");
    });
});

describe("Tokens errors", () => {
    test("create a token with 'expiresAt' set to undefined", async () => {
        const response = await runtimeServices1.transport.tokens.createOwnToken({
            content: { aKey: "aValue" },
            expiresAt: undefined as unknown as string,
            ephemeral: false
        });

        expect(response).toBeAnError("must have required property 'expiresAt'", "error.runtime.validation.invalidPropertyValue");
    });
});

describe("Tokens query", () => {
    test("query own tokens", async () => {
        const token = await uploadOwnToken(runtimeServices1.transport, runtimeServices1.address);
        const conditions = new QueryParamConditions<GetTokensQuery>(token, runtimeServices1.transport)
            .addDateSet("expiresAt")
            .addDateSet("createdAt")
            .addStringSet("createdByDevice")
            .addStringSet("forIdentity");
        await conditions.executeTests((c, q) => c.tokens.getTokens({ query: q, ownerRestriction: OwnerRestriction.Own }));
    });

    test("query peer tokens", async () => {
        const token = await exchangeToken(runtimeServices1.transport, runtimeServices2.transport);
        const conditions = new QueryParamConditions<GetTokensQuery>(token, runtimeServices2.transport).addDateSet("expiresAt").addDateSet("createdAt").addStringSet("createdBy");
        await conditions.executeTests((c, q) => c.tokens.getTokens({ query: q, ownerRestriction: OwnerRestriction.Peer }));
    });
});

describe("Personalized tokens", () => {
    test("send and receive a personalized token", async () => {
        const createResult = await runtimeServices1.transport.tokens.createOwnToken({
            content: { key: "value" },
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            ephemeral: true,
            forIdentity: runtimeServices2.address
        });
        expect(createResult).toBeSuccessful();

        const loadResult = await runtimeServices2.transport.tokens.loadPeerToken({ reference: createResult.value.truncatedReference, ephemeral: true });
        expect(loadResult).toBeSuccessful();
        expect(loadResult.value.forIdentity).toBe(runtimeServices2.address);
    });

    test("error when loading a token for another identity", async () => {
        const createResult = await runtimeServices1.transport.tokens.createOwnToken({
            content: { key: "value" },
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            ephemeral: true,
            forIdentity: runtimeServices1.address
        });
        expect(createResult).toBeSuccessful();

        const loadResult = await runtimeServices2.transport.tokens.loadPeerToken({ reference: createResult.value.truncatedReference, ephemeral: true });
        expect(loadResult).toBeAnError(/.*/, "error.transport.general.notIntendedForYou");
    });
});

describe("Password-protected tokens", () => {
    test("send and receive a password-protected token", async () => {
        const createResult = await runtimeServices1.transport.tokens.createOwnToken({
            content: { key: "value" },
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            ephemeral: true,
            passwordProtection: { password: "password" }
        });
        expect(createResult).toBeSuccessful();
        expect(createResult.value.passwordProtection?.password).toBe("password");
        expect(createResult.value.passwordProtection?.passwordIsPin).toBeUndefined();

        const loadResult = await runtimeServices2.transport.tokens.loadPeerToken({ reference: createResult.value.truncatedReference, ephemeral: true, password: "password" });
        expect(loadResult).toBeSuccessful();
        expect(loadResult.value.passwordProtection?.password).toBe("password");
        expect(loadResult.value.passwordProtection?.passwordIsPin).toBeUndefined();
    });

    test("send and receive a PIN-protected token", async () => {
        const createResult = await runtimeServices1.transport.tokens.createOwnToken({
            content: { key: "value" },
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            ephemeral: true,
            passwordProtection: { password: "1234", passwordIsPin: true }
        });
        expect(createResult).toBeSuccessful();
        expect(createResult.value.passwordProtection?.password).toBe("1234");
        expect(createResult.value.passwordProtection?.passwordIsPin).toBe(true);

        const loadResult = await runtimeServices2.transport.tokens.loadPeerToken({ reference: createResult.value.truncatedReference, ephemeral: true, password: "1234" });
        expect(loadResult).toBeSuccessful();
        expect(loadResult.value.passwordProtection?.password).toBe("1234");
        expect(loadResult.value.passwordProtection?.passwordIsPin).toBe(true);
    });

    test("error when loading a token with a wrong password", async () => {
        const createResult = await runtimeServices1.transport.tokens.createOwnToken({
            content: { key: "value" },
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            ephemeral: true,
            passwordProtection: { password: "password" }
        });
        expect(createResult).toBeSuccessful();

        const loadResult = await runtimeServices2.transport.tokens.loadPeerToken({ reference: createResult.value.truncatedReference, ephemeral: true, password: "wrong-password" });
        expect(loadResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("error when loading a token with no password", async () => {
        const createResult = await runtimeServices1.transport.tokens.createOwnToken({
            content: { key: "value" },
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            ephemeral: true,
            passwordProtection: { password: "password" }
        });
        expect(createResult).toBeSuccessful();

        const loadResult = await runtimeServices2.transport.tokens.loadPeerToken({
            reference: createResult.value.truncatedReference,
            ephemeral: true
        });
        expect(loadResult).toBeAnError(/.*/, "error.transport.noPasswordProvided");
    });

    test("validation error when creating a token with empty string as the password", async () => {
        const createResult = await runtimeServices1.transport.tokens.createOwnToken({
            content: { key: "value" },
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            ephemeral: true,
            passwordProtection: { password: "" }
        });
        expect(createResult).toBeAnError("PasswordProtectionCreationParameters.password :: Value is shorter than 1 characters", "error.runtime.requestDeserialization");
    });

    test("validation error when creating a token with an invalid PIN", async () => {
        const createResult = await runtimeServices1.transport.tokens.createOwnToken({
            content: { key: "value" },
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            ephemeral: true,
            passwordProtection: { password: "invalid-pin", passwordIsPin: true }
        });
        expect(createResult).toBeAnError(/.*/, "error.runtime.validation.invalidPin");
    });
});

describe("Password-protected tokens for files", () => {
    let fileId: string;

    beforeAll(async () => {
        fileId = (await uploadFile(runtimeServices1.transport)).id;
    });

    test("send and receive a file via password-protected token", async () => {
        const createResult = await runtimeServices1.transport.files.createTokenForFile({
            fileId,
            passwordProtection: { password: "password" }
        });
        expect(createResult).toBeSuccessful();
        expect(createResult.value.passwordProtection?.password).toBe("password");
        expect(createResult.value.passwordProtection?.passwordIsPin).toBeUndefined();

        const loadResult = await runtimeServices2.transport.files.getOrLoadFile({ reference: createResult.value.truncatedReference, password: "password" });
        expect(loadResult).toBeSuccessful();
    });

    test("send and receive a file via PIN-protected token", async () => {
        const createResult = await runtimeServices1.transport.files.createTokenForFile({
            fileId,
            passwordProtection: { password: "1234", passwordIsPin: true }
        });
        expect(createResult).toBeSuccessful();
        expect(createResult.value.passwordProtection?.password).toBe("1234");
        expect(createResult.value.passwordProtection?.passwordIsPin).toBe(true);

        const loadResult = await runtimeServices2.transport.files.getOrLoadFile({ reference: createResult.value.truncatedReference, password: "1234" });
        expect(loadResult).toBeSuccessful();
    });

    test("error when loading the file with a wrong password", async () => {
        const createResult = await runtimeServices1.transport.files.createTokenForFile({
            fileId,
            passwordProtection: { password: "password" }
        });
        expect(createResult).toBeSuccessful();

        const loadResult = await runtimeServices2.transport.files.getOrLoadFile({ reference: createResult.value.truncatedReference, password: "wrong-password" });
        expect(loadResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("error when loading the file with no password", async () => {
        const createResult = await runtimeServices1.transport.files.createTokenForFile({
            fileId,
            passwordProtection: { password: "password" }
        });
        expect(createResult).toBeSuccessful();

        const loadResult = await runtimeServices2.transport.files.getOrLoadFile({ reference: createResult.value.truncatedReference });
        expect(loadResult).toBeAnError(/.*/, "error.transport.noPasswordProvided");
    });

    test("validation error when creating a token with empty string as the password", async () => {
        const createResult = await runtimeServices1.transport.files.createTokenForFile({
            fileId,
            passwordProtection: { password: "" }
        });
        expect(createResult).toBeAnError("PasswordProtectionCreationParameters.password :: Value is shorter than 1 characters", "error.runtime.requestDeserialization");
    });

    test("validation error when creating a token with an invalid PIN", async () => {
        const createResult = await runtimeServices1.transport.files.createTokenForFile({
            fileId,
            passwordProtection: { password: "invalid-pin", passwordIsPin: true }
        });
        expect(createResult).toBeAnError(/.*/, "error.runtime.validation.invalidPin");
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
        expect(createResult).toBeAnError("PasswordProtectionCreationParameters.password :: Value is shorter than 1 characters", "error.runtime.requestDeserialization");
    });

    test("validation error when creating a token with an invalid PIN", async () => {
        const createResult = await runtimeServices1.transport.relationshipTemplates.createTokenForOwnTemplate({
            templateId: templateId,
            passwordProtection: { password: "invalid-pin", passwordIsPin: true }
        });
        expect(createResult).toBeAnError(/.*/, "error.runtime.validation.invalidPin");
    });
});
