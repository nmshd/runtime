import { CoreDate } from "@nmshd/core-types";
import { GetTokensQuery, OwnerRestriction, PasswordLocationIndicatorStrings } from "../../src";
import { exchangeToken, QueryParamConditions, RuntimeServiceProvider, TestRuntimeServices, uploadOwnToken } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let runtimeServices1: TestRuntimeServices;
let runtimeServices2: TestRuntimeServices;

const UNKNOWN_TOKEN_ID = "TOKXXXXXXXXXXXXXXXXX";

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

    describe("Delete Token", () => {
        test("accessing invalid Token id causes an error", async () => {
            const response = await runtimeServices1.transport.tokens.deleteToken({ tokenId: UNKNOWN_TOKEN_ID });
            expect(response).toBeAnError("Token not found. Make sure the ID exists and the record is not expired.", "error.runtime.recordNotFound");
        });

        test("successfully delete Token", async () => {
            const token = await uploadOwnToken(runtimeServices1.transport);

            const deleteTokenResponse = await runtimeServices1.transport.tokens.deleteToken({ tokenId: token.id });
            expect(deleteTokenResponse).toBeSuccessful();

            const getTokenResponse = await runtimeServices1.transport.tokens.getToken({ id: token.id });
            expect(getTokenResponse).toBeAnError("Token not found. Make sure the ID exists and the record is not expired.", "error.runtime.recordNotFound");
        });
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
        const token = await uploadOwnToken(runtimeServices1.transport, runtimeServices1.address, { password: "password" });
        const conditions = new QueryParamConditions<GetTokensQuery>(token, runtimeServices1.transport)
            .addDateSet("expiresAt")
            .addDateSet("createdAt")
            .addStringSet("createdByDevice")
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
                expectedResult: false,
                key: "passwordProtection.passwordIsPin",
                value: "true"
            })
            .addSingleCondition({
                expectedResult: true,
                key: "passwordProtection.passwordIsPin",
                value: "!"
            });
        await conditions.executeTests((c, q) => c.tokens.getTokens({ query: q, ownerRestriction: OwnerRestriction.Own }));
    });

    test("query own PIN-protected tokens", async () => {
        const token = await uploadOwnToken(runtimeServices1.transport, runtimeServices1.address, { password: "1234", passwordIsPin: true });
        const conditions = new QueryParamConditions<GetTokensQuery>(token, runtimeServices1.transport)
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
        await conditions.executeTests((c, q) => c.tokens.getTokens({ query: q, ownerRestriction: OwnerRestriction.Own }));
    });

    test("query own PIN-protected tokens with passwordLocationIndicator that is a number", async () => {
        const token = await uploadOwnToken(runtimeServices1.transport, runtimeServices1.address, {
            password: "1234",
            passwordIsPin: true,
            passwordLocationIndicator: 50
        });
        const conditions = new QueryParamConditions<GetTokensQuery>(token, runtimeServices1.transport)
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
        await conditions.executeTests((c, q) => c.tokens.getTokens({ query: q, ownerRestriction: OwnerRestriction.Own }));
    });

    test("query own PIN-protected tokens with passwordLocationIndicator that is a string", async () => {
        const token = await uploadOwnToken(runtimeServices1.transport, runtimeServices1.address, {
            password: "1234",
            passwordIsPin: true,
            passwordLocationIndicator: PasswordLocationIndicatorStrings.Letter
        });
        const conditions = new QueryParamConditions<GetTokensQuery>(token, runtimeServices1.transport)
            .addSingleCondition({
                expectedResult: true,
                key: "passwordProtection.passwordLocationIndicator",
                value: "Letter"
            })
            .addSingleCondition({
                expectedResult: false,
                key: "passwordProtection.passwordLocationIndicator",
                value: "anotherString"
            })
            .addSingleCondition({
                expectedResult: false,
                key: "passwordProtection.passwordLocationIndicator",
                value: "2" // TODO: how can we handle this gracefully?
            });
        await conditions.executeTests((c, q) => c.tokens.getTokens({ query: q, ownerRestriction: OwnerRestriction.Own }));
    });

    test("query peer tokens", async () => {
        const token = await exchangeToken(runtimeServices1.transport, runtimeServices2.transport);
        const conditions = new QueryParamConditions<GetTokensQuery>(token, runtimeServices2.transport)
            .addDateSet("expiresAt")
            .addDateSet("createdAt")
            .addStringSet("createdBy")
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
