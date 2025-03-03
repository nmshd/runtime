import { AbstractIntegerJSON, AbstractStringJSON, IdentityAttributeJSON } from "@nmshd/content";
import { PeerAttributeDVO } from "../../src";
import { ensureActiveRelationship, executeFullCreateAndShareRepositoryAttributeFlow, RuntimeServiceProvider, TestRuntimeServices } from "../lib";

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

describe("PeerAttributeDVO", () => {
    test("check the BirthYear", async () => {
        const sOwnSharedIdentityAttribute = await executeFullCreateAndShareRepositoryAttributeFlow(services2, services1, {
            content: {
                value: {
                    "@type": "BirthYear",
                    value: 2001
                }
            }
        });
        const rPeerSharedIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: sOwnSharedIdentityAttribute.id })).value;

        const dto = (await services1.consumption.attributes.getAttribute({ id: rPeerSharedIdentityAttribute.id })).value;
        const dvo = (await services1.expander.expandLocalAttributeDTO(dto)) as PeerAttributeDVO;
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("PeerAttributeDVO");
        expect(dvo.id).toStrictEqual(rPeerSharedIdentityAttribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.BirthYear");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.BirthYear");
        expect(dvo.date).toStrictEqual(rPeerSharedIdentityAttribute.createdAt);
        expect(dvo.content).toStrictEqual(rPeerSharedIdentityAttribute.content);
        const value = dvo.value as AbstractIntegerJSON;
        expect(value["@type"]).toBe("BirthYear");
        expect(value.value).toBe(2001);
        expect(dvo.createdAt).toStrictEqual(rPeerSharedIdentityAttribute.createdAt);
        expect(dvo.isOwn).toBe(false);
        expect(dvo.isValid).toBe(true);
        expect(dvo.isDraft).toBe(false);
        expect(dvo.owner).toStrictEqual(rPeerSharedIdentityAttribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("Integer");
        expect(dvo.renderHints.editType).toBe("SelectLike");
        expect(dvo.renderHints.dataType).toBe("Year");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.min).toBe(1);
        expect(dvo.valueHints.max).toBe(9999);
        expect(dvo.succeeds).toBe(rPeerSharedIdentityAttribute.succeeds);
        expect(dvo.succeededBy).toBe(rPeerSharedIdentityAttribute.succeededBy);
        expect(dvo.peer).toBe(rPeerSharedIdentityAttribute.shareInfo!.peer);
        expect(dvo.requestReference).toBe(rPeerSharedIdentityAttribute.shareInfo!.requestReference);
        expect(dvo.notificationReference).toBe(rPeerSharedIdentityAttribute.shareInfo!.notificationReference);
        expect(dvo.tags).toBe((rPeerSharedIdentityAttribute.content as IdentityAttributeJSON).tags);
        expect(dvo.valueType).toBe(rPeerSharedIdentityAttribute.content.value["@type"]);
        expect(dvo.deletionStatus).toBe(rPeerSharedIdentityAttribute.deletionInfo?.deletionStatus);
        expect(dvo.deletionDate).toBe(rPeerSharedIdentityAttribute.deletionInfo?.deletionDate);
    });

    test("check the Sex", async () => {
        const sOwnSharedIdentityAttribute = await executeFullCreateAndShareRepositoryAttributeFlow(services2, services1, {
            content: {
                value: {
                    "@type": "Sex",
                    value: "male"
                }
            }
        });
        const rPeerSharedIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: sOwnSharedIdentityAttribute.id })).value;

        const dto = (await services1.consumption.attributes.getAttribute({ id: rPeerSharedIdentityAttribute.id })).value;
        const dvo = (await services1.expander.expandLocalAttributeDTO(dto)) as PeerAttributeDVO;
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("PeerAttributeDVO");
        expect(dvo.id).toStrictEqual(rPeerSharedIdentityAttribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.Sex");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.Sex");
        expect(dvo.date).toStrictEqual(rPeerSharedIdentityAttribute.createdAt);
        expect(dvo.content).toStrictEqual(rPeerSharedIdentityAttribute.content);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("Sex");
        expect(value.value).toBe("male");
        expect(dvo.createdAt).toStrictEqual(rPeerSharedIdentityAttribute.createdAt);
        expect(dvo.isOwn).toBe(false);
        expect(dvo.isValid).toBe(true);
        expect(dvo.isDraft).toBe(false);
        expect(dvo.owner).toStrictEqual(rPeerSharedIdentityAttribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("ButtonLike");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.values).toStrictEqual([
            { key: "intersex", displayName: "i18n://attributes.values.sex.intersex" },
            { key: "female", displayName: "i18n://attributes.values.sex.female" },
            { key: "male", displayName: "i18n://attributes.values.sex.male" }
        ]);
        expect(dvo.succeeds).toBe(rPeerSharedIdentityAttribute.succeeds);
        expect(dvo.succeededBy).toBe(rPeerSharedIdentityAttribute.succeededBy);
        expect(dvo.peer).toBe(rPeerSharedIdentityAttribute.shareInfo!.peer);
        expect(dvo.requestReference).toBe(rPeerSharedIdentityAttribute.shareInfo!.requestReference);
        expect(dvo.notificationReference).toBe(rPeerSharedIdentityAttribute.shareInfo!.notificationReference);
        expect(dvo.tags).toBe((rPeerSharedIdentityAttribute.content as IdentityAttributeJSON).tags);
        expect(dvo.valueType).toBe(rPeerSharedIdentityAttribute.content.value["@type"]);
        expect(dvo.deletionStatus).toBe(rPeerSharedIdentityAttribute.deletionInfo?.deletionStatus);
        expect(dvo.deletionDate).toBe(rPeerSharedIdentityAttribute.deletionInfo?.deletionDate);
    });

    test("check the Nationality", async () => {
        const sOwnSharedIdentityAttribute = await executeFullCreateAndShareRepositoryAttributeFlow(services2, services1, {
            content: {
                value: {
                    "@type": "Nationality",
                    value: "DE"
                }
            }
        });
        const rPeerSharedIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: sOwnSharedIdentityAttribute.id })).value;

        const dto = (await services1.consumption.attributes.getAttribute({ id: rPeerSharedIdentityAttribute.id })).value;
        const dvo = (await services1.expander.expandLocalAttributeDTO(dto)) as PeerAttributeDVO;
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("PeerAttributeDVO");
        expect(dvo.id).toStrictEqual(rPeerSharedIdentityAttribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.Nationality");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.Nationality");
        expect(dvo.date).toStrictEqual(rPeerSharedIdentityAttribute.createdAt);
        expect(dvo.content).toStrictEqual(rPeerSharedIdentityAttribute.content);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("Nationality");
        expect(value.value).toBe("DE");
        expect(dvo.createdAt).toStrictEqual(rPeerSharedIdentityAttribute.createdAt);
        expect(dvo.isOwn).toBe(false);
        expect(dvo.isValid).toBe(true);
        expect(dvo.isDraft).toBe(false);
        expect(dvo.owner).toStrictEqual(rPeerSharedIdentityAttribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("SelectLike");
        expect(dvo.renderHints.dataType).toBe("Country");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.min).toBe(2);
        expect(dvo.valueHints.max).toBe(2);
        expect(dvo.valueHints.values).toHaveLength(249);
        expect(dvo.valueHints.values![61]).toStrictEqual({ key: "DE", displayName: "i18n://attributes.values.countries.DE" });
        expect(dvo.succeeds).toBe(rPeerSharedIdentityAttribute.succeeds);
        expect(dvo.succeededBy).toBe(rPeerSharedIdentityAttribute.succeededBy);
        expect(dvo.peer).toBe(rPeerSharedIdentityAttribute.shareInfo!.peer);
        expect(dvo.requestReference).toBe(rPeerSharedIdentityAttribute.shareInfo!.requestReference);
        expect(dvo.notificationReference).toBe(rPeerSharedIdentityAttribute.shareInfo!.notificationReference);
        expect(dvo.tags).toBe((rPeerSharedIdentityAttribute.content as IdentityAttributeJSON).tags);
        expect(dvo.valueType).toBe(rPeerSharedIdentityAttribute.content.value["@type"]);
        expect(dvo.deletionStatus).toBe(rPeerSharedIdentityAttribute.deletionInfo?.deletionStatus);
        expect(dvo.deletionDate).toBe(rPeerSharedIdentityAttribute.deletionInfo?.deletionDate);
    });

    test("check the CommunicationLanguage", async () => {
        const sOwnSharedIdentityAttribute = await executeFullCreateAndShareRepositoryAttributeFlow(services2, services1, {
            content: {
                value: {
                    "@type": "CommunicationLanguage",
                    value: "de"
                }
            }
        });

        const rPeerSharedIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: sOwnSharedIdentityAttribute.id })).value;

        const dto = (await services1.consumption.attributes.getAttribute({ id: rPeerSharedIdentityAttribute.id })).value;
        const dvo = (await services1.expander.expandLocalAttributeDTO(dto)) as PeerAttributeDVO;
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("PeerAttributeDVO");
        expect(dvo.id).toStrictEqual(rPeerSharedIdentityAttribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.CommunicationLanguage");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.CommunicationLanguage");
        expect(dvo.date).toStrictEqual(rPeerSharedIdentityAttribute.createdAt);
        expect(dvo.content).toStrictEqual(rPeerSharedIdentityAttribute.content);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("CommunicationLanguage");
        expect(value.value).toBe("de");
        expect(dvo.createdAt).toStrictEqual(rPeerSharedIdentityAttribute.createdAt);
        expect(dvo.isOwn).toBe(false);
        expect(dvo.isValid).toBe(true);
        expect(dvo.isDraft).toBe(false);
        expect(dvo.owner).toStrictEqual(rPeerSharedIdentityAttribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("SelectLike");
        expect(dvo.renderHints.dataType).toBe("Language");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.min).toBe(2);
        expect(dvo.valueHints.max).toBe(2);
        expect(dvo.valueHints.values).toHaveLength(183);
        expect(dvo.valueHints.values![31]).toStrictEqual({ key: "de", displayName: "i18n://attributes.values.languages.de" });
        expect(dvo.succeeds).toBe(rPeerSharedIdentityAttribute.succeeds);
        expect(dvo.succeededBy).toBe(rPeerSharedIdentityAttribute.succeededBy);
        expect(dvo.peer).toBe(rPeerSharedIdentityAttribute.shareInfo!.peer);
        expect(dvo.requestReference).toBe(rPeerSharedIdentityAttribute.shareInfo!.requestReference);
        expect(dvo.notificationReference).toBe(rPeerSharedIdentityAttribute.shareInfo!.notificationReference);
        expect(dvo.tags).toBe((rPeerSharedIdentityAttribute.content as IdentityAttributeJSON).tags);
        expect(dvo.valueType).toBe(rPeerSharedIdentityAttribute.content.value["@type"]);
        expect(dvo.deletionStatus).toBe(rPeerSharedIdentityAttribute.deletionInfo?.deletionStatus);
        expect(dvo.deletionDate).toBe(rPeerSharedIdentityAttribute.deletionInfo?.deletionDate);
    });
});
