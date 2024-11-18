import { RuntimeServiceProvider, TestRuntimeServices } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let runtimeServices1: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2);
    runtimeServices1 = runtimeServices[0];
}, 30000);
afterAll(() => serviceProvider.stop());

describe("PublicRelationshipTemplateReferences", () => {
    test("get PublicRelationshipTemplateReferences", async () => {
        const publicRelationshipTemplates = await runtimeServices1.transport.publicRelationshipTemplateReferences.getPublicRelationshipTemplateReferences();
        expect(publicRelationshipTemplates.value).toHaveLength(0);
    });
});
