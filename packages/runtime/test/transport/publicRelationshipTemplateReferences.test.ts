import { ClientResult, PublicRelationshipTemplateReferenceClient } from "@nmshd/transport";
import { RuntimeServiceProvider, TestRuntimeServices } from "../lib";
import { RestClientMocker } from "../lib/RestClientMocker";

const serviceProvider = new RuntimeServiceProvider();
let runtimeServices: TestRuntimeServices;
let clientMocker: RestClientMocker<PublicRelationshipTemplateReferenceClient>;

beforeAll(async () => {
    runtimeServices = (await serviceProvider.launch(1))[0];
    const client = (runtimeServices.transport.publicRelationshipTemplateReferences as any).getPublicRelationshipTemplateReferencesUseCase
        .publicRelationshipTemplateReferencesController.client as PublicRelationshipTemplateReferenceClient;
    clientMocker = new RestClientMocker(client);
}, 30000);

afterAll(() => serviceProvider.stop());

afterEach(() => {
    clientMocker.restore();
});

describe("PublicRelationshipTemplateReferences", () => {
    test("get PublicRelationshipTemplateReferences", async () => {
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

        const publicRelationshipTemplates = await runtimeServices.transport.publicRelationshipTemplateReferences.getPublicRelationshipTemplateReferences();

        expect(publicRelationshipTemplates.value).toStrictEqual(mockResponse);
    });
});
