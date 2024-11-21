import { RuntimeServiceProvider, TestRuntimeServices } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let runtimeServices: TestRuntimeServices;

beforeAll(async () => {
    runtimeServices = (await serviceProvider.launch(1))[0];
}, 30000);
afterAll(() => serviceProvider.stop());

describe("PublicRelationshipTemplateReferences", () => {
    test("get PublicRelationshipTemplateReferences", async () => {
        const publicRelationshipTemplates = await runtimeServices.transport.publicRelationshipTemplateReferences.getPublicRelationshipTemplateReferences();

        expect(publicRelationshipTemplates.value).toBeDefined();
        expect(publicRelationshipTemplates.value.length).toBeGreaterThan(0);
    });
});
