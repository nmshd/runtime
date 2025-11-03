import { ProprietaryStringJSON, RelationshipAttributeConfidentiality, RelationshipAttributeJSON, ShareAttributeRequestItem } from "@nmshd/content";
import { OwnRelationshipAttributeDVO } from "../../src";
import {
    cleanupAttributes,
    ensureActiveRelationship,
    executeFullCreateAndShareRelationshipAttributeFlow,
    executeFullShareAndAcceptAttributeRequestFlow,
    RuntimeServiceProvider,
    TestRuntimeServices
} from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let services1: TestRuntimeServices;
let services2: TestRuntimeServices;
let services3: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(3, { enableRequestModule: true, enableDeciderModule: true });
    services1 = runtimeServices[0];
    services2 = runtimeServices[1];
    services3 = runtimeServices[2];

    await ensureActiveRelationship(services1.transport, services2.transport);
    await ensureActiveRelationship(services1.transport, services3.transport);
}, 30000);

beforeEach(async () => await cleanupAttributes([services1, services2, services3]));

afterAll(() => serviceProvider.stop());

describe("OwnRelationshipAttributeDVO", () => {
    test("check a ProprietaryString", async () => {
        const ownRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
            content: {
                key: "aKey",
                value: {
                    "@type": "ProprietaryString",
                    title: "aTitle",
                    value: "aString"
                },
                confidentiality: RelationshipAttributeConfidentiality.Public
            }
        });

        const dto = (await services1.consumption.attributes.getAttribute({ id: ownRelationshipAttribute.id })).value;
        const dvo = (await services1.expander.expandLocalAttributeDTO(dto)) as OwnRelationshipAttributeDVO;
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("OwnRelationshipAttributeDVO");
        expect(dvo.id).toStrictEqual(ownRelationshipAttribute.id);
        expect(dvo.name).toBe("aTitle");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.ProprietaryString");
        expect(dvo.date).toStrictEqual(ownRelationshipAttribute.createdAt);
        expect(dvo.content).toStrictEqual(ownRelationshipAttribute.content);
        const value = dvo.value as ProprietaryStringJSON;
        expect(value["@type"]).toBe("ProprietaryString");
        expect(value.value).toBe("aString");
        expect(value.title).toBe("aTitle");
        expect(dvo.key).toBe((ownRelationshipAttribute.content as RelationshipAttributeJSON).key);
        expect(dvo.confidentiality).toBe((ownRelationshipAttribute.content as RelationshipAttributeJSON).confidentiality);
        expect(dvo.isTechnical).toBe((ownRelationshipAttribute.content as RelationshipAttributeJSON).isTechnical);
        expect(dvo.createdAt).toStrictEqual(ownRelationshipAttribute.createdAt);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.isDraft).toBe(false);
        expect(dvo.owner).toStrictEqual(ownRelationshipAttribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("InputLike");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.succeeds).toBe(ownRelationshipAttribute.succeeds);
        expect(dvo.succeededBy).toBe(ownRelationshipAttribute.succeededBy);
        expect(dvo.peer).toBe(ownRelationshipAttribute.peer);
        expect(dvo.sourceReference).toBe(ownRelationshipAttribute.sourceReference);
        expect(dvo.deletionStatus).toBe(ownRelationshipAttribute.deletionInfo?.deletionStatus);
        expect(dvo.deletionDate).toBe(ownRelationshipAttribute.deletionInfo?.deletionDate);
        expect(dvo.forwardingPeers).toStrictEqual([]);
        expect(dvo.forwardingDetails).toStrictEqual([]);
        expect(dvo.valueType).toBe(ownRelationshipAttribute.content.value["@type"]);
        expect(dvo.wasViewedAt).toBeUndefined();
    });

    test("check a ProprietaryString that was forwarded to a third party", async () => {
        let ownRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
            content: {
                key: "aKey",
                value: {
                    "@type": "ProprietaryString",
                    title: "aTitle",
                    value: "aString"
                },
                confidentiality: RelationshipAttributeConfidentiality.Public
            }
        });

        ownRelationshipAttribute = await executeFullShareAndAcceptAttributeRequestFlow(
            services1,
            services3,
            ShareAttributeRequestItem.from({
                attribute: ownRelationshipAttribute.content,
                attributeId: ownRelationshipAttribute.id,
                thirdPartyAddress: services2.address,
                mustBeAccepted: true
            })
        );

        const forwardingDetails = (await services1.consumption.attributes.getForwardingDetailsForAttribute({ attributeId: ownRelationshipAttribute.id })).value;

        const dto = (await services1.consumption.attributes.getAttribute({ id: ownRelationshipAttribute.id })).value;
        const dvo = (await services1.expander.expandLocalAttributeDTO(dto)) as OwnRelationshipAttributeDVO;
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("OwnRelationshipAttributeDVO");
        expect(dvo.id).toStrictEqual(ownRelationshipAttribute.id);
        expect(dvo.name).toBe("aTitle");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.ProprietaryString");
        expect(dvo.date).toStrictEqual(ownRelationshipAttribute.createdAt);
        expect(dvo.content).toStrictEqual(ownRelationshipAttribute.content);
        const value = dvo.value as ProprietaryStringJSON;
        expect(value["@type"]).toBe("ProprietaryString");
        expect(value.value).toBe("aString");
        expect(value.title).toBe("aTitle");
        expect(dvo.key).toBe((ownRelationshipAttribute.content as RelationshipAttributeJSON).key);
        expect(dvo.confidentiality).toBe((ownRelationshipAttribute.content as RelationshipAttributeJSON).confidentiality);
        expect(dvo.isTechnical).toBe((ownRelationshipAttribute.content as RelationshipAttributeJSON).isTechnical);
        expect(dvo.createdAt).toStrictEqual(ownRelationshipAttribute.createdAt);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.isDraft).toBe(false);
        expect(dvo.owner).toStrictEqual(ownRelationshipAttribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("InputLike");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.succeeds).toBe(ownRelationshipAttribute.succeeds);
        expect(dvo.succeededBy).toBe(ownRelationshipAttribute.succeededBy);
        expect(dvo.peer).toBe(ownRelationshipAttribute.peer);
        expect(dvo.sourceReference).toBe(ownRelationshipAttribute.sourceReference);
        expect(dvo.deletionStatus).toBe(ownRelationshipAttribute.deletionInfo?.deletionStatus);
        expect(dvo.deletionDate).toBe(ownRelationshipAttribute.deletionInfo?.deletionDate);
        expect(dvo.forwardingPeers![0].id).toStrictEqual(services3.address);
        expect(dvo.forwardingDetails).toStrictEqual([
            {
                peer: services3.address,
                sourceReference: forwardingDetails[0].sourceReference,
                sharedAt: forwardingDetails[0].sharedAt
            }
        ]);
        expect(dvo.valueType).toBe(ownRelationshipAttribute.content.value["@type"]);
        expect(dvo.wasViewedAt).toBeUndefined();
    });
});
