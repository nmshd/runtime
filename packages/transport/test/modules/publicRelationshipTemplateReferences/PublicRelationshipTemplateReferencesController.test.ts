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
    clientMocker.restore();
});

describe("PublicRelationshipTemplateReferencesController", () => {
    test("should return the backbone defined PublicRelationshipTemplateReferences", async () => {
        const mockResponse = [
            {
                title: "a",
                description: "Description",
                truncatedReference: "Reference"
            },
            {
                title: "b",
                description: "Description",
                truncatedReference: "Reference"
            },
            {
                title: "c",
                description: "Description",
                truncatedReference: "Reference"
            }
        ];

        clientMocker.mockMethod("getPublicRelationshipTemplateReferences", () => {
            return ClientResult.ok(mockResponse);
        });

        const publicRelationshipTemplates = await account.publicRelationshipTemplateReferences.getPublicRelationshipTemplateReferences();

        expect(publicRelationshipTemplates.map((references) => references.toJSON())).toEqual(mockResponse);
    });

    test("should return an empty array if the backbone endpoint is not available", async () => {
        clientMocker.mockMethod("getPublicRelationshipTemplateReferences", () => {
            return ClientResult.fail(new RequestError("some method", "some path", undefined, undefined, undefined, undefined, 404));
        });

        const publicRelationshipTemplates = await account.publicRelationshipTemplateReferences.getPublicRelationshipTemplateReferences();

        expect(publicRelationshipTemplates).toHaveLength(0);
    });
});
