import { ProprietaryStringJSON, RelationshipAttributeConfidentiality, RelationshipAttributeJSON } from "@nmshd/content";
import { PeerRelationshipAttributeDVO } from "../../src";
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

describe("PeerRelationshipAttributeDVO", () => {
    test("check a ProprietaryString", async () => {
        const sOwnSharedRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services2, services1, {
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
        const rPeerSharedRelationshipAttribute = (await services1.consumption.attributes.getAttribute({ id: sOwnSharedRelationshipAttribute.id })).value;

        const dto = (await services1.consumption.attributes.getAttribute({ id: rPeerSharedRelationshipAttribute.id })).value;
        const dvo = (await services1.expander.expandLocalAttributeDTO(dto)) as PeerRelationshipAttributeDVO;
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("PeerRelationshipAttributeDVO");
        expect(dvo.id).toStrictEqual(rPeerSharedRelationshipAttribute.id);
        expect(dvo.name).toBe("aTitle");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.ProprietaryString");
        expect(dvo.date).toStrictEqual(rPeerSharedRelationshipAttribute.createdAt);
        expect(dvo.content).toStrictEqual(rPeerSharedRelationshipAttribute.content);
        const value = dvo.value as ProprietaryStringJSON;
        expect(value["@type"]).toBe("ProprietaryString");
        expect(value.value).toBe("aString");
        expect(value.title).toBe("aTitle");
        expect(dvo.key).toBe((rPeerSharedRelationshipAttribute.content as RelationshipAttributeJSON).key);
        expect(dvo.confidentiality).toBe((rPeerSharedRelationshipAttribute.content as RelationshipAttributeJSON).confidentiality);
        expect(dvo.isTechnical).toBe((rPeerSharedRelationshipAttribute.content as RelationshipAttributeJSON).isTechnical);
        expect(dvo.createdAt).toStrictEqual(rPeerSharedRelationshipAttribute.createdAt);
        expect(dvo.isOwn).toBe(false);
        expect(dvo.isDraft).toBe(false);
        expect(dvo.owner).toStrictEqual(rPeerSharedRelationshipAttribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("InputLike");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.succeeds).toBe(rPeerSharedRelationshipAttribute.succeeds);
        expect(dvo.succeededBy).toBe(rPeerSharedRelationshipAttribute.succeededBy);
        expect(dvo.peer).toBe(rPeerSharedRelationshipAttribute.shareInfo!.peer);
        expect(dvo.sourceReference).toBe(rPeerSharedRelationshipAttribute.shareInfo!.sourceReference);
        expect(dvo.sourceReference).toBe(rPeerSharedRelationshipAttribute.shareInfo!.sourceReference);
        expect(dvo.sourceAttribute).toBe(rPeerSharedRelationshipAttribute.shareInfo!.sourceAttribute);
        expect(dvo.valueType).toBe(rPeerSharedRelationshipAttribute.content.value["@type"]);
        expect(dvo.deletionStatus).toBe(rPeerSharedRelationshipAttribute.deletionInfo?.deletionStatus);
        expect(dvo.deletionDate).toBe(rPeerSharedRelationshipAttribute.deletionInfo?.deletionDate);
        expect(dvo.wasViewedAt).toBeUndefined();
    });
});
