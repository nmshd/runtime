import { AbstractStringJSON, IdentityAttributeJSON } from "@nmshd/content";
import { PeerIdentityAttributeDVO } from "src";
import { ensureActiveRelationship, executeFullCreateAndShareOwnIdentityAttributeFlow, RuntimeServiceProvider, TestRuntimeServices } from "../lib";

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

describe("PeerIdentityAttributeDVO", () => {
    test("check the Sex", async () => {
        const sOwnIdentityAttribute = await executeFullCreateAndShareOwnIdentityAttributeFlow(services2, services1, {
            content: {
                value: {
                    "@type": "Sex",
                    value: "male"
                }
            }
        });
        const rPeerIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: sOwnIdentityAttribute.id })).value;

        const dto = (await services1.consumption.attributes.getAttribute({ id: rPeerIdentityAttribute.id })).value;
        const dvo = (await services1.expander.expandLocalAttributeDTO(dto)) as PeerIdentityAttributeDVO;
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("PeerIdentityAttributeDVO");
        expect(dvo.id).toStrictEqual(rPeerIdentityAttribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.Sex");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.Sex");
        expect(dvo.date).toStrictEqual(rPeerIdentityAttribute.createdAt);
        expect(dvo.content).toStrictEqual(rPeerIdentityAttribute.content);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("Sex");
        expect(value.value).toBe("male");
        expect(dvo.createdAt).toStrictEqual(rPeerIdentityAttribute.createdAt);
        expect(dvo.isOwn).toBe(false);
        expect(dvo.isDraft).toBe(false);
        expect(dvo.owner).toStrictEqual(rPeerIdentityAttribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("ButtonLike");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.values).toStrictEqual([
            { key: "intersex", displayName: "i18n://attributes.values.sex.intersex" },
            { key: "female", displayName: "i18n://attributes.values.sex.female" },
            { key: "male", displayName: "i18n://attributes.values.sex.male" }
        ]);
        expect(dvo.succeeds).toBe(rPeerIdentityAttribute.succeeds);
        expect(dvo.succeededBy).toBe(rPeerIdentityAttribute.succeededBy);
        expect(dvo.peer).toBe(rPeerIdentityAttribute.peer);
        expect(dvo.sourceReference).toBe(rPeerIdentityAttribute.sourceReference);
        expect(dvo.deletionStatus).toBe(rPeerIdentityAttribute.deletionInfo?.deletionStatus);
        expect(dvo.deletionDate).toBe(rPeerIdentityAttribute.deletionInfo?.deletionDate);
        expect(dvo.tags).toBe((rPeerIdentityAttribute.content as IdentityAttributeJSON).tags);
        expect(dvo.valueType).toBe(rPeerIdentityAttribute.content.value["@type"]);
        expect(dvo.wasViewedAt).toBeUndefined();
    });

    test("check the Nationality", async () => {
        const sOwnIdentityAttribute = await executeFullCreateAndShareOwnIdentityAttributeFlow(services2, services1, {
            content: {
                value: {
                    "@type": "Nationality",
                    value: "DE"
                }
            }
        });
        const rPeerIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: sOwnIdentityAttribute.id })).value;

        const dto = (await services1.consumption.attributes.getAttribute({ id: rPeerIdentityAttribute.id })).value;
        const dvo = (await services1.expander.expandLocalAttributeDTO(dto)) as PeerIdentityAttributeDVO;
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("PeerIdentityAttributeDVO");
        expect(dvo.id).toStrictEqual(rPeerIdentityAttribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.Nationality");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.Nationality");
        expect(dvo.date).toStrictEqual(rPeerIdentityAttribute.createdAt);
        expect(dvo.content).toStrictEqual(rPeerIdentityAttribute.content);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("Nationality");
        expect(value.value).toBe("DE");
        expect(dvo.createdAt).toStrictEqual(rPeerIdentityAttribute.createdAt);
        expect(dvo.isOwn).toBe(false);
        expect(dvo.isDraft).toBe(false);
        expect(dvo.owner).toStrictEqual(rPeerIdentityAttribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("SelectLike");
        expect(dvo.renderHints.dataType).toBe("Country");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.min).toBe(2);
        expect(dvo.valueHints.max).toBe(2);
        expect(dvo.valueHints.values).toHaveLength(249);
        expect(dvo.valueHints.values![61]).toStrictEqual({ key: "DE", displayName: "i18n://attributes.values.countries.DE" });
        expect(dvo.succeeds).toBe(rPeerIdentityAttribute.succeeds);
        expect(dvo.succeededBy).toBe(rPeerIdentityAttribute.succeededBy);
        expect(dvo.peer).toBe(rPeerIdentityAttribute.peer);
        expect(dvo.sourceReference).toBe(rPeerIdentityAttribute.sourceReference);
        expect(dvo.deletionStatus).toBe(rPeerIdentityAttribute.deletionInfo?.deletionStatus);
        expect(dvo.deletionDate).toBe(rPeerIdentityAttribute.deletionInfo?.deletionDate);
        expect(dvo.tags).toBe((rPeerIdentityAttribute.content as IdentityAttributeJSON).tags);
        expect(dvo.valueType).toBe(rPeerIdentityAttribute.content.value["@type"]);
        expect(dvo.wasViewedAt).toBeUndefined();
    });

    test("check the CommunicationLanguage", async () => {
        const sOwnIdentityAttribute = await executeFullCreateAndShareOwnIdentityAttributeFlow(services2, services1, {
            content: {
                value: {
                    "@type": "CommunicationLanguage",
                    value: "de"
                }
            }
        });

        const rPeerIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: sOwnIdentityAttribute.id })).value;

        const dto = (await services1.consumption.attributes.getAttribute({ id: rPeerIdentityAttribute.id })).value;
        const dvo = (await services1.expander.expandLocalAttributeDTO(dto)) as PeerIdentityAttributeDVO;
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("PeerIdentityAttributeDVO");
        expect(dvo.id).toStrictEqual(rPeerIdentityAttribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.CommunicationLanguage");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.CommunicationLanguage");
        expect(dvo.date).toStrictEqual(rPeerIdentityAttribute.createdAt);
        expect(dvo.content).toStrictEqual(rPeerIdentityAttribute.content);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("CommunicationLanguage");
        expect(value.value).toBe("de");
        expect(dvo.createdAt).toStrictEqual(rPeerIdentityAttribute.createdAt);
        expect(dvo.isOwn).toBe(false);
        expect(dvo.isDraft).toBe(false);
        expect(dvo.owner).toStrictEqual(rPeerIdentityAttribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("SelectLike");
        expect(dvo.renderHints.dataType).toBe("Language");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.min).toBe(2);
        expect(dvo.valueHints.max).toBe(2);
        expect(dvo.valueHints.values).toHaveLength(183);
        expect(dvo.valueHints.values![31]).toStrictEqual({ key: "de", displayName: "i18n://attributes.values.languages.de" });
        expect(dvo.succeeds).toBe(rPeerIdentityAttribute.succeeds);
        expect(dvo.succeededBy).toBe(rPeerIdentityAttribute.succeededBy);
        expect(dvo.peer).toBe(rPeerIdentityAttribute.peer);
        expect(dvo.sourceReference).toBe(rPeerIdentityAttribute.sourceReference);
        expect(dvo.deletionStatus).toBe(rPeerIdentityAttribute.deletionInfo?.deletionStatus);
        expect(dvo.deletionDate).toBe(rPeerIdentityAttribute.deletionInfo?.deletionDate);
        expect(dvo.tags).toBe((rPeerIdentityAttribute.content as IdentityAttributeJSON).tags);
        expect(dvo.valueType).toBe(rPeerIdentityAttribute.content.value["@type"]);
        expect(dvo.wasViewedAt).toBeUndefined();
    });

    test("check the MaritalStatus", async () => {
        const sOwnIdentityAttribute = await executeFullCreateAndShareOwnIdentityAttributeFlow(services2, services1, {
            content: {
                value: {
                    "@type": "MaritalStatus",
                    value: "married"
                }
            }
        });
        const rPeerIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: sOwnIdentityAttribute.id })).value;

        const dto = (await services1.consumption.attributes.getAttribute({ id: rPeerIdentityAttribute.id })).value;
        const dvo = (await services1.expander.expandLocalAttributeDTO(dto)) as PeerIdentityAttributeDVO;
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("PeerIdentityAttributeDVO");
        expect(dvo.id).toStrictEqual(rPeerIdentityAttribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.MaritalStatus");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.MaritalStatus");
        expect(dvo.date).toStrictEqual(rPeerIdentityAttribute.createdAt);
        expect(dvo.content).toStrictEqual(rPeerIdentityAttribute.content);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("MaritalStatus");
        expect(value.value).toBe("married");
        expect(dvo.createdAt).toStrictEqual(rPeerIdentityAttribute.createdAt);
        expect(dvo.isOwn).toBe(false);
        expect(dvo.isDraft).toBe(false);
        expect(dvo.owner).toStrictEqual(rPeerIdentityAttribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("ButtonLike");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.values).toStrictEqual([
            { key: "single", displayName: "i18n://attributes.values.maritalStatus.single" },
            { key: "married", displayName: "i18n://attributes.values.maritalStatus.married" },
            { key: "separated", displayName: "i18n://attributes.values.maritalStatus.separated" },
            { key: "divorced", displayName: "i18n://attributes.values.maritalStatus.divorced" },
            { key: "widowed", displayName: "i18n://attributes.values.maritalStatus.widowed" }
        ]);
        expect(dvo.succeeds).toBe(rPeerIdentityAttribute.succeeds);
        expect(dvo.succeededBy).toBe(rPeerIdentityAttribute.succeededBy);
        expect(dvo.peer).toBe(rPeerIdentityAttribute.peer);
        expect(dvo.sourceReference).toBe(rPeerIdentityAttribute.sourceReference);
        expect(dvo.deletionStatus).toBe(rPeerIdentityAttribute.deletionInfo?.deletionStatus);
        expect(dvo.deletionDate).toBe(rPeerIdentityAttribute.deletionInfo?.deletionDate);
        expect(dvo.tags).toBe((rPeerIdentityAttribute.content as IdentityAttributeJSON).tags);
        expect(dvo.valueType).toBe(rPeerIdentityAttribute.content.value["@type"]);
        expect(dvo.wasViewedAt).toBeUndefined();
    });
});
