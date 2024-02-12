import { CoreDate } from "@nmshd/transport";
import { GetTokensQuery, OwnerRestriction, TransportServices } from "../../src";
import { exchangeToken, QueryParamConditions, RuntimeServiceProvider, uploadOwnToken } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let transportServices1: TransportServices;
let transportServices2: TransportServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2);
    transportServices1 = runtimeServices[0].transport;
    transportServices2 = runtimeServices[1].transport;
}, 30000);
afterAll(() => serviceProvider.stop());

describe("Tokens", () => {
    test("create own Token", async () => {
        const response = await transportServices1.tokens.createOwnToken({
            content: { key: "value" },
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            ephemeral: false
        });
        expect(response).toBeSuccessful();
    });

    test("create ephemeral Token", async () => {
        const response = await transportServices1.tokens.createOwnToken({
            content: { key: "value" },
            expiresAt: CoreDate.utc().add({ minutes: 10 }).toISOString(),
            ephemeral: true
        });
        expect(response).toBeSuccessful();

        const getTokenResponse = await transportServices1.tokens.getToken({ id: response.value.id });
        expect(getTokenResponse).toBeAnError("Token not found. Make sure the ID exists and the record is not expired.", "error.runtime.recordNotFound");
    });
});

describe("Tokens errors", () => {
    test("create a token with 'expiresAt' set to undefined", async () => {
        const response = await transportServices1.tokens.createOwnToken({
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
        const token = await uploadOwnToken(transportServices1);
        const conditions = new QueryParamConditions<GetTokensQuery>(token, transportServices1).addDateSet("expiresAt").addDateSet("createdAt").addStringSet("createdByDevice");
        await conditions.executeTests((c, q) => c.tokens.getTokens({ query: q, ownerRestriction: OwnerRestriction.Own }));
    });

    test("query peer tokens", async () => {
        const token = await exchangeToken(transportServices1, transportServices2);
        const conditions = new QueryParamConditions<GetTokensQuery>(token, transportServices2).addDateSet("expiresAt").addDateSet("createdAt").addStringSet("createdBy");
        await conditions.executeTests((c, q) => c.tokens.getTokens({ query: q, ownerRestriction: OwnerRestriction.Peer }));
    });
});
