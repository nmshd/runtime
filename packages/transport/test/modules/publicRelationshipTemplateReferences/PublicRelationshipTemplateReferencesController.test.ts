import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, ClientResult, PublicRelationshipTemplateReferenceClient, RequestError, Transport } from "../../../src";
import { RestClientMocker } from "../../testHelpers/RestClientMocker";
import { TestUtil } from "../../testHelpers/TestUtil";

let connection: IDatabaseConnection;

let transport: Transport;
let account: AccountController;
let clientMocker: RestClientMocker<PublicRelationshipTemplateReferenceClient>;

beforeAll(async function () {
    connection = await TestUtil.createDatabaseConnection();
    transport = TestUtil.createTransport(connection);

    await transport.init();

    const accounts = await TestUtil.provideAccounts(transport, 3);

    account = accounts[0];

    const client = (account.publicRelationshipTemplateReferences as any).client as PublicRelationshipTemplateReferenceClient;
    clientMocker = new RestClientMocker(client);
});

afterAll(async () => {
    await account.close();

    await connection.close();
});

afterEach(() => {
    clientMocker.reset();
});

describe("PublicRelationshipTemplateReferencesController", () => {
    test("should return the backbone defined PublicRelationshipTemplateReferences", async () => {
        const mockResponse = [
            {
                title: "aTitle",
                description: "aDescription",
                truncatedReference: "aReference"
            },
            {
                title: "aTitle",
                description: "aDescription",
                truncatedReference: "aReference"
            },
            {
                title: "aTitle",
                description: "aDescription",
                truncatedReference: "aReference"
            }
        ];

        clientMocker.mockMethod("getPublicRelationshipTemplateReferences", () => {
            return ClientResult.ok(mockResponse);
        });

        const publicRelationshipTemplates = await account.publicRelationshipTemplateReferences.getPublicRelationshipTemplateReferences();

        expect(publicRelationshipTemplates.map((references) => references.toJSON())).toStrictEqual(mockResponse);
    });

    test("should return an empty array if the backbone endpoint is not available", async () => {
        clientMocker.mockMethod("getPublicRelationshipTemplateReferences", () => {
            return ClientResult.fail(new RequestError("some method", "some path", undefined, undefined, undefined, undefined, 404));
        });

        const publicRelationshipTemplates = await account.publicRelationshipTemplateReferences.getPublicRelationshipTemplateReferences();

        expect(publicRelationshipTemplates).toHaveLength(0);
    });
});
