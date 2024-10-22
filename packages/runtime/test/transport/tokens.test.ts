import { CoreDate } from "@nmshd/core-types";
import { GetTokensQuery, OwnerRestriction } from "../../src";
import { exchangeToken, QueryParamConditions, RuntimeServiceProvider, TestRuntimeServices, uploadOwnToken } from "../lib";

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
            content: {
                content: "Hello"
            },
            expiresAt: undefined as unknown as string,
            ephemeral: false
        });

        expect(response).toBeAnError("must have required property 'expiresAt'", "error.runtime.validation.invalidPropertyValue");
    });
});

describe("Tokens query", () => {
    test("query own tokens", async () => {
        const token = await uploadOwnToken(runtimeServices1.transport);
        const conditions = new QueryParamConditions<GetTokensQuery>(token, runtimeServices1.transport)
            .addDateSet("expiresAt")
            .addDateSet("createdAt")
            .addStringSet("createdByDevice");
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
            password: "password"
        });
        expect(createResult).toBeSuccessful();
        expect(createResult.value.password).toBe("password");

        const loadResult = await runtimeServices2.transport.tokens.loadPeerToken({ reference: createResult.value.truncatedReference, ephemeral: true, password: "password" });
        expect(loadResult).toBeSuccessful();
        expect(loadResult.value.password).toBe("password");
    });

    test("error when loading a token with a wrong password", async () => {
        const createResult = await runtimeServices1.transport.tokens.createOwnToken({
            content: { key: "value" },
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            ephemeral: true,
            password: "password"
        });
        expect(createResult).toBeSuccessful();

        const loadResult = await runtimeServices2.transport.tokens.loadPeerToken({ reference: createResult.value.truncatedReference, ephemeral: true, password: "wrong-password" });
        expect(loadResult).toBeAnError(/.*/, "error.platform.inputCannotBeParsed");
    });
});
