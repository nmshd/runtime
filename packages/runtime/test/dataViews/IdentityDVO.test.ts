import { ShareAttributeRequestItemJSON } from "@nmshd/content";
import { PeerRelationshipTemplateDVO, RelationshipTemplateDTO } from "../../src";
import { createTemplate, RuntimeServiceProvider, TestRuntimeServices } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let templator: TestRuntimeServices;
let requestor: TestRuntimeServices;
let templatorTemplate: RelationshipTemplateDTO;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2, { enableRequestModule: true });
    templator = runtimeServices[0];
    requestor = runtimeServices[1];
}, 30000);

afterAll(() => serviceProvider.stop());

beforeEach(function () {
    requestor.eventBus.reset();
    templator.eventBus.reset();
});

describe("IdentityDVO after loading a relationship template sharing a DisplayName", () => {
    beforeAll(async () => {
        const senderAttribute = await templator.consumption.attributes.createRepositoryAttribute({
            content: {
                value: {
                    "@type": "DisplayName",
                    value: "Dr. Theodor Munchkin von Reichenhardt"
                }
            }
        });

        const templateContent = {
            "@type": "RelationshipTemplateContent",
            onNewRelationship: {
                "@type": "Request",
                items: [
                    {
                        "@type": "ShareAttributeRequestItem",
                        mustBeAccepted: true,
                        attribute: senderAttribute.value.content,
                        sourceAttributeId: senderAttribute.value.id
                    } as ShareAttributeRequestItemJSON
                ]
            }
        };
        templatorTemplate = await createTemplate(templator.transport, templateContent);
    });
    test("IdentityDVO should use the DisplayName", async () => {
        const requestorTemplate = (await requestor.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: templatorTemplate.truncatedReference })).value;

        const dto = requestorTemplate;
        const dvo = (await requestor.expander.expandRelationshipTemplateDTO(dto)) as PeerRelationshipTemplateDVO;
        expect(dvo).toBeDefined();
        expect(dvo.createdBy.name).toBe("Dr. Theodor Munchkin von Reichenhardt");
        expect(dvo.createdBy.initials).toBe("DTMvR");
    });
});
