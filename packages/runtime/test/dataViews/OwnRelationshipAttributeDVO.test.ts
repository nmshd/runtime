import { ProprietaryStringJSON, RelationshipAttributeConfidentiality, RelationshipAttributeJSON } from "@nmshd/content";
import { OwnRelationshipAttributeDVO } from "../../src";
import { ensureActiveRelationship, executeFullCreateAndShareRelationshipAttributeFlow, RuntimeServiceProvider, TestRuntimeServices } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let services1: TestRuntimeServices;
let services2: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2, {
        enableRequestModule: true,
        enableDeciderModule: true,
        enableNotificationModule: true
    });
    services1 = runtimeServices[0];
    services2 = runtimeServices[1];

    await ensureActiveRelationship(services1.transport, services2.transport);
}, 30000);

afterAll(() => serviceProvider.stop());

describe("OwnRelationshipAttributeDVO", () => {
    test("check a ProprietaryString", async () => {
        const ownSharedRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
            content: {
                key: "Some key",
                value: {
                    "@type": "ProprietaryString",
                    title: "aTitle",
                    value: "aString"
                },
                confidentiality: RelationshipAttributeConfidentiality.Public
            }
        });

        const dto = (await services1.consumption.attributes.getAttribute({ id: ownSharedRelationshipAttribute.id })).value;
        const dvo = (await services1.expander.expandLocalAttributeDTO(dto)) as OwnRelationshipAttributeDVO;
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("OwnRelationshipAttributeDVO");
        expect(dvo.id).toStrictEqual(ownSharedRelationshipAttribute.id);
        expect(dvo.name).toBe("aTitle");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.ProprietaryString");
        expect(dvo.date).toStrictEqual(ownSharedRelationshipAttribute.createdAt);
        expect(dvo.content).toStrictEqual(ownSharedRelationshipAttribute.content);
        const value = dvo.value as ProprietaryStringJSON;
        expect(value["@type"]).toBe("ProprietaryString");
        expect(value.value).toBe("aString");
        expect(value.title).toBe("aTitle");
        expect(dvo.key).toBe((ownSharedRelationshipAttribute.content as RelationshipAttributeJSON).key);
        expect(dvo.confidentiality).toBe((ownSharedRelationshipAttribute.content as RelationshipAttributeJSON).confidentiality);
        expect(dvo.isTechnical).toBe((ownSharedRelationshipAttribute.content as RelationshipAttributeJSON).isTechnical);
        expect(dvo.createdAt).toStrictEqual(ownSharedRelationshipAttribute.createdAt);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.isDraft).toBe(false);
        expect(dvo.owner).toStrictEqual(ownSharedRelationshipAttribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("InputLike");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.succeeds).toBe(ownSharedRelationshipAttribute.succeeds);
        expect(dvo.succeededBy).toBe(ownSharedRelationshipAttribute.succeededBy);
        expect(dvo.peer).toBe(ownSharedRelationshipAttribute.shareInfo!.peer);
        expect(dvo.sourceReference).toBe(ownSharedRelationshipAttribute.shareInfo!.sourceReference);
        expect(dvo.notificationReference).toBe(ownSharedRelationshipAttribute.shareInfo!.notificationReference);
        expect(dvo.sourceAttribute).toBe(ownSharedRelationshipAttribute.shareInfo!.sourceAttribute);
        expect(dvo.valueType).toBe(ownSharedRelationshipAttribute.content.value["@type"]);
        expect(dvo.deletionStatus).toBe(ownSharedRelationshipAttribute.deletionInfo?.deletionStatus);
        expect(dvo.deletionDate).toBe(ownSharedRelationshipAttribute.deletionInfo?.deletionDate);
        expect(dvo.wasViewedAt).toBeUndefined();
    });
});
