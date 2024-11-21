import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, ClientResult, PublicRelationshipTemplateReferenceClient, RequestError, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

let connection: IDatabaseConnection;

let transport: Transport;
let account: AccountController;

beforeAll(async function () {
    connection = await TestUtil.createDatabaseConnection();
    transport = TestUtil.createTransport(connection);

    await transport.init();

    const accounts = await TestUtil.provideAccounts(transport, 3);

    account = accounts[0];
});

afterAll(async () => {
    await account.close();

    await connection.close();
});

describe("PublicRelationshipTemplateReferencesController", () => {
    test("should return the backbone defined PublicRelationshipTemplateReferences", async () => {
        const publicRelationshipTemplates = await account.publicRelationshipTemplateReferences.getPublicRelationshipTemplateReferences();
        expect(publicRelationshipTemplates).toBeDefined();
        expect(publicRelationshipTemplates.length).toBeGreaterThan(0);
    });

    test("should return an empty array if the backbone endpoint is not available", async () => {
        const client: PublicRelationshipTemplateReferenceClient = (account.publicRelationshipTemplateReferences as any).client;

        const mockGetPublicRelationshipTemplateReferences = jest.fn().mockImplementation(() => {
            return Promise.resolve(ClientResult.fail(new RequestError("some method", "some path", undefined, undefined, undefined, undefined, 404)));
        });
        const originalFn = client.getPublicRelationshipTemplateReferences;
        client.getPublicRelationshipTemplateReferences = mockGetPublicRelationshipTemplateReferences.bind(client);

        const publicRelationshipTemplates = await account.publicRelationshipTemplateReferences.getPublicRelationshipTemplateReferences();
        expect(publicRelationshipTemplates).toHaveLength(0);

        client.getPublicRelationshipTemplateReferences = originalFn;
    });

    test("should return the backbone defined PublicRelationshipTemplateReferences2", async () => {
        const publicRelationshipTemplates = await account.publicRelationshipTemplateReferences.getPublicRelationshipTemplateReferences();
        expect(publicRelationshipTemplates).toBeDefined();
        expect(publicRelationshipTemplates.length).toBeGreaterThan(0);
    });
});
