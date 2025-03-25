import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { reset, spy, when } from "ts-mockito";
import { AccountController, ClientResult, PublicRelationshipTemplateReferenceClient, RequestError, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

let connection: IDatabaseConnection;

let transport: Transport;
let account: AccountController;
let mockedClient: PublicRelationshipTemplateReferenceClient;

beforeAll(async function () {
    connection = await TestUtil.createDatabaseConnection();
    transport = TestUtil.createTransport(connection);

    await transport.init();

    const accounts = await TestUtil.provideAccounts(transport, 1);

    account = accounts[0];

    const client = account.publicRelationshipTemplateReferences["client"];
    mockedClient = spy(client);
});

afterAll(async () => {
    await account.close();

    await connection.close();
});

afterEach(() => reset(mockedClient));

describe("PublicRelationshipTemplateReferencesController", () => {
    test("should return the Backbone defined PublicRelationshipTemplateReferences", async () => {
        const mockResponse = [{ title: "aTitle", description: "aDescription", truncatedReference: "aReference" }];
        when(mockedClient.getPublicRelationshipTemplateReferences()).thenResolve(ClientResult.ok(mockResponse));

        const publicRelationshipTemplates = await account.publicRelationshipTemplateReferences.getPublicRelationshipTemplateReferences();

        expect(publicRelationshipTemplates.map((reference) => reference.toJSON())).toStrictEqual(mockResponse);
    });

    test("should return an empty array if the Backbone endpoint returns an empty array", async () => {
        when(mockedClient.getPublicRelationshipTemplateReferences()).thenResolve(ClientResult.ok([]));

        const publicRelationshipTemplates = await account.publicRelationshipTemplateReferences.getPublicRelationshipTemplateReferences();

        expect(publicRelationshipTemplates).toStrictEqual([]);
    });

    test("should return an empty array if the Backbone endpoint is not available", async () => {
        when(mockedClient.getPublicRelationshipTemplateReferences()).thenResolve(
            ClientResult.fail(new RequestError("some method", "some path", undefined, undefined, undefined, undefined, 404))
        );

        const publicRelationshipTemplates = await account.publicRelationshipTemplateReferences.getPublicRelationshipTemplateReferences();

        expect(publicRelationshipTemplates).toHaveLength(0);
    });
});
