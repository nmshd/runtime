import {
    GivenName,
    IdentityAttribute,
    ReadAttributeAcceptResponseItem,
    ReadAttributeRequestItem,
    RelationshipCreationContent,
    RelationshipTemplateContent,
    ResponseItemResult,
    ResponseResult
} from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { CoreIdHelper } from "@nmshd/transport";
import { establishRelationshipWithContents, RuntimeServiceProvider, TestRuntimeServices } from "../lib";

const serviceProvider = new RuntimeServiceProvider();

let runtimeServices1: TestRuntimeServices;
let runtimeServices2: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2);
    runtimeServices1 = runtimeServices[0];
    runtimeServices2 = runtimeServices[1];

    await establishRelationshipWithContents(
        runtimeServices1.transport,
        runtimeServices2.transport,

        RelationshipTemplateContent.from({
            onNewRelationship: {
                "@type": "Request",
                items: [
                    ReadAttributeRequestItem.from({
                        mustBeAccepted: true,
                        query: {
                            "@type": "IdentityAttributeQuery",
                            valueType: "CommunicationLanguage"
                        }
                    })
                ]
            }
        }).toJSON(),
        RelationshipCreationContent.from({
            response: {
                "@type": "Response",
                result: ResponseResult.Accepted,
                requestId: (await CoreIdHelper.notPrefixed.generate()).toString(),
                items: [
                    ReadAttributeAcceptResponseItem.from({
                        result: ResponseItemResult.Accepted,
                        attributeId: await CoreIdHelper.notPrefixed.generate(),
                        attribute: IdentityAttribute.from({
                            owner: CoreAddress.from((await runtimeServices1.transport.account.getIdentityInfo()).value.address),
                            value: GivenName.from("AGivenName")
                        })
                    }).toJSON()
                ]
            }
        }).toJSON()
    );
}, 30000);

afterAll(() => serviceProvider.stop());

describe("RelationshipDVO", () => {
    test("check the relationship dvo for the templator", async () => {
        const dtos = (await runtimeServices1.transport.relationships.getRelationships({})).value;
        const dvos = await runtimeServices1.expander.expandRelationshipDTOs(dtos);
        const dto = dtos[0];
        const dvo = dvos[0];
        expect(dvo).toBeDefined();
        expect(dvo.id).toBe(dto.peer);
        expect(dvo.name).toBe("i18n://dvo.identity.unknown");
        expect(dvo.description).toBe("i18n://dvo.relationship.Active");
        expect(dvo.type).toBe("IdentityDVO");

        expect(dvo.isSelf).toBe(false);
        expect(dvo.relationship!.id).toBe(dto.id);
        expect(dvo.relationship!.direction).toBe("Incoming");
        expect(dvo.relationship!.status).toBe("Active");
        expect(dvo.relationship!.statusText).toBe("i18n://dvo.relationship.Active");

        expect(dvo.relationship!.templateId).toBe(dto.template.id);
    });

    test("check the relationship dvo for the requestor", async () => {
        const dtos = (await runtimeServices2.transport.relationships.getRelationships({})).value;
        const dvos = await runtimeServices2.expander.expandRelationshipDTOs(dtos);
        const dto = dtos[0];
        const dvo = dvos[0];
        expect(dvo).toBeDefined();
        expect(dvo.id).toBe(dto.peer);
        expect(dvo.name).toBe("i18n://dvo.identity.unknown");
        expect(dvo.description).toBe("i18n://dvo.relationship.Active");
        expect(dvo.type).toBe("IdentityDVO");

        expect(dvo.isSelf).toBe(false);
        expect(dvo.relationship!.id).toBe(dto.id);
        expect(dvo.relationship!.direction).toBe("Outgoing");
        expect(dvo.relationship!.status).toBe("Active");
        expect(dvo.relationship!.statusText).toBe("i18n://dvo.relationship.Active");

        expect(dvo.relationship!.templateId).toBe(dto.template.id);
    });

    test("check the relationship dvo for the templator with active relationshipSetting", async () => {
        const dtos = (await runtimeServices1.transport.relationships.getRelationships({})).value;
        const dto = dtos[0];

        await runtimeServices1.consumption.settings.upsertSettingByKey({
            key: "relationshipSetting",
            value: { userTitle: "aTitle", userDescription: "aDescription" },
            scope: "Relationship",
            reference: dto.id
        });

        const dvos = await runtimeServices1.expander.expandRelationshipDTOs(dtos);
        const dvo = dvos[0];

        expect(dvo).toBeDefined();
        expect(dvo.name).toBe("aTitle");
        expect(dvo.originalName).toBe("i18n://dvo.identity.unknown");
        expect(dvo.description).toBe("aDescription");
    });
});
