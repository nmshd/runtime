import { ClientResult, PublicRelationshipTemplateReferenceClient } from "@nmshd/transport";
import { reset, spy, when } from "ts-mockito";
import { RuntimeServiceProvider, TestRuntimeServices } from "../lib/index.js";

const serviceProvider = new RuntimeServiceProvider();
let runtimeServices: TestRuntimeServices;
let mockClient: PublicRelationshipTemplateReferenceClient;

beforeAll(async () => {
    runtimeServices = (await serviceProvider.launch(1))[0];
    const client = runtimeServices.transport.publicRelationshipTemplateReferences["getPublicRelationshipTemplateReferencesUseCase"][
        "publicRelationshipTemplateReferencesController"
    ]["client"] as PublicRelationshipTemplateReferenceClient;

    mockClient = spy(client);
}, 30000);

afterAll(() => serviceProvider.stop());

afterEach(() => reset(mockClient));

describe("PublicRelationshipTemplateReferences", () => {
    test("should read the PublicRelationshipTemplateReferences", async () => {
        const mockResponse = [
            {
                title: "aTitle",
                description: "aDescription",
                truncatedReference: "aReference"
            }
        ];

        when(mockClient.getPublicRelationshipTemplateReferences()).thenResolve(ClientResult.ok(mockResponse));

        const publicRelationshipTemplateReferences = await runtimeServices.transport.publicRelationshipTemplateReferences.getPublicRelationshipTemplateReferences();

        expect(publicRelationshipTemplateReferences.value).toStrictEqual(mockResponse);
    });
});
