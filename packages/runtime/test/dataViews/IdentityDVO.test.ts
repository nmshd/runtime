import { RelationshipTemplateContentJSON, ShareAttributeRequestItemJSON } from "@nmshd/content";
import {
    AttributeDeletedEvent,
    IncomingRequestStatusChangedEvent,
    LocalRequestDTO,
    LocalRequestStatus,
    PeerRelationshipTemplateDVO,
    RelationshipChangedEvent,
    RelationshipTemplateDTO
} from "../../src";
import { createTemplate, RuntimeServiceProvider, TestRuntimeServices } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let templator: TestRuntimeServices;
let requestor: TestRuntimeServices;
let templatorTemplate: RelationshipTemplateDTO;
let requestorTemplate: RelationshipTemplateDTO;
let request: LocalRequestDTO;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2, { enableRequestModule: true });
    templator = runtimeServices[0];
    requestor = runtimeServices[1];
}, 30000);

afterAll(() => serviceProvider.stop());

describe("IdentityDVO after loading a relationship template sharing a DisplayName", () => {
    beforeAll(async () => {
        const senderAttribute = await templator.consumption.attributes.createRepositoryAttribute({
            content: {
                value: {
                    "@type": "DisplayName",
                    value: "A Display Name"
                }
            }
        });

        const templateContent: RelationshipTemplateContentJSON = {
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
        requestorTemplate = (await requestor.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: templatorTemplate.truncatedReference! })).value;
        const requestEvent = await requestor.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);
        request = requestEvent.data.request;
    });

    test("IdentityDVO should use the DisplayName when expanding a relationship template", async () => {
        const dvo = (await requestor.expander.expandRelationshipTemplateDTO(requestorTemplate)) as PeerRelationshipTemplateDVO;
        expect(dvo).toBeDefined();
        expect(dvo.createdBy.name).toBe("A Display Name");
        expect(dvo.createdBy.initials).toBe("ADN");
    });

    test("IdentityDVO should use the DisplayName when expanding a request", async () => {
        const dvo = await requestor.expander.expandLocalRequestDTO(request);
        expect(dvo).toBeDefined();
        expect(dvo.createdBy.name).toBe("A Display Name");
        expect(dvo.createdBy.initials).toBe("ADN");

        expect(dvo.peer.name).toBe("A Display Name");
        expect(dvo.peer.initials).toBe("ADN");
    });

    test("IdentityDVO should use the DisplayName if a revoked relationship exists", async () => {
        await requestor.consumption.incomingRequests.accept({ requestId: request.id, items: [{ accept: true }] });
        const relationshipId = (await requestor.eventBus.waitForEvent(RelationshipChangedEvent)).data.id;
        await requestor.transport.relationships.revokeRelationship({ relationshipId });
        await requestor.eventBus.waitForEvent(AttributeDeletedEvent);

        requestor.eventBus.reset();
        requestorTemplate = (await requestor.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: templatorTemplate.truncatedReference! })).value;
        await requestor.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => e.data.newStatus === LocalRequestStatus.DecisionRequired);

        const dvo = await requestor.expander.expandLocalRequestDTO(request);
        expect(dvo).toBeDefined();
        expect(dvo.createdBy.name).toBe("A Display Name");
        expect(dvo.createdBy.initials).toBe("ADN");

        expect(dvo.peer.name).toBe("A Display Name");
        expect(dvo.peer.initials).toBe("ADN");
    });
});
