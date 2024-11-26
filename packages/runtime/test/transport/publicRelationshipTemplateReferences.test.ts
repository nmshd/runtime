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
    clientMocker.reset();
});

describe("PublicRelationshipTemplateReferences", () => {
    test("should read the PublicRelationshipTemplateReferences", async () => {
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

        const publicRelationshipTemplateReferences = await runtimeServices.transport.publicRelationshipTemplateReferences.getPublicRelationshipTemplateReferences();

        expect(publicRelationshipTemplateReferences.value).toStrictEqual(mockResponse);
    });
});
