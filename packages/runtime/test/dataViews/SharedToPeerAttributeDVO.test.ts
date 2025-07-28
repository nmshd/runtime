import { AbstractStringJSON, IdentityAttributeJSON } from "@nmshd/content";
import { SharedToPeerAttributeDVO } from "../../src";
import { cleanupAttributes, ensureActiveRelationship, executeFullCreateAndShareOwnIdentityAttributeFlow, RuntimeServiceProvider, TestRuntimeServices } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let services1: TestRuntimeServices;
let services2: TestRuntimeServices;

beforeEach(async () => {
    await cleanupAttributes([services1, services2]);
});

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

describe("SharedToPeerAttributeDVO", () => {
    test("check the Sex", async () => {
        const ownSharedIdentityAttribute = await executeFullCreateAndShareOwnIdentityAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "Sex",
                    value: "male"
                }
            }
        });

        const dto = (await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttribute.id })).value;
        const dvo = (await services1.expander.expandLocalAttributeDTO(dto)) as SharedToPeerAttributeDVO;
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("SharedToPeerAttributeDVO");
        expect(dvo.id).toStrictEqual(ownSharedIdentityAttribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.Sex");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.Sex");
        expect(dvo.date).toStrictEqual(ownSharedIdentityAttribute.createdAt);
        expect(dvo.content).toStrictEqual(ownSharedIdentityAttribute.content);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("Sex");
        expect(value.value).toBe("male");
        expect(dvo.createdAt).toStrictEqual(ownSharedIdentityAttribute.createdAt);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.isValid).toBe(true);
        expect(dvo.owner).toStrictEqual(ownSharedIdentityAttribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("ButtonLike");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.values).toStrictEqual([
            { key: "intersex", displayName: "i18n://attributes.values.sex.intersex" },
            { key: "female", displayName: "i18n://attributes.values.sex.female" },
            { key: "male", displayName: "i18n://attributes.values.sex.male" }
        ]);
        expect(dvo.peer).toBe(ownSharedIdentityAttribute.shareInfo!.peer);
        expect(dvo.isDraft).toBe(false);
        expect(dvo.requestReference).toBe(ownSharedIdentityAttribute.shareInfo!.requestReference);
        expect(dvo.notificationReference).toBe(ownSharedIdentityAttribute.shareInfo!.notificationReference);
        expect(dvo.sourceAttribute).toBe(ownSharedIdentityAttribute.shareInfo!.sourceAttribute);
        expect(dvo.tags).toBe((ownSharedIdentityAttribute.content as IdentityAttributeJSON).tags);
        expect(dvo.valueType).toBe(ownSharedIdentityAttribute.content.value["@type"]);
        expect(dvo.deletionStatus).toBe(ownSharedIdentityAttribute.deletionInfo?.deletionStatus);
        expect(dvo.deletionDate).toBe(ownSharedIdentityAttribute.deletionInfo?.deletionDate);
        expect(dvo.wasViewedAt).toBeUndefined();
    });

    test("check the Nationality", async () => {
        const ownSharedIdentityAttribute = await executeFullCreateAndShareOwnIdentityAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "Nationality",
                    value: "DE"
                }
            }
        });
        const dto = (await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttribute.id })).value;
        const dvo = (await services1.expander.expandLocalAttributeDTO(dto)) as SharedToPeerAttributeDVO;
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("SharedToPeerAttributeDVO");
        expect(dvo.id).toStrictEqual(ownSharedIdentityAttribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.Nationality");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.Nationality");
        expect(dvo.date).toStrictEqual(ownSharedIdentityAttribute.createdAt);
        expect(dvo.content).toStrictEqual(ownSharedIdentityAttribute.content);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("Nationality");
        expect(value.value).toBe("DE");
        expect(dvo.createdAt).toStrictEqual(ownSharedIdentityAttribute.createdAt);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.isValid).toBe(true);
        expect(dvo.owner).toStrictEqual(ownSharedIdentityAttribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("SelectLike");
        expect(dvo.renderHints.dataType).toBe("Country");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.min).toBe(2);
        expect(dvo.valueHints.max).toBe(2);
        expect(dvo.valueHints.values).toHaveLength(249);
        expect(dvo.valueHints.values![61]).toStrictEqual({ key: "DE", displayName: "i18n://attributes.values.countries.DE" });
        expect(dvo.peer).toBe(ownSharedIdentityAttribute.shareInfo!.peer);
        expect(dvo.isDraft).toBe(false);
        expect(dvo.requestReference).toBe(ownSharedIdentityAttribute.shareInfo!.requestReference);
        expect(dvo.notificationReference).toBe(ownSharedIdentityAttribute.shareInfo!.notificationReference);
        expect(dvo.sourceAttribute).toBe(ownSharedIdentityAttribute.shareInfo!.sourceAttribute);
        expect(dvo.tags).toBe((ownSharedIdentityAttribute.content as IdentityAttributeJSON).tags);
        expect(dvo.valueType).toBe(ownSharedIdentityAttribute.content.value["@type"]);
        expect(dvo.deletionStatus).toBe(ownSharedIdentityAttribute.deletionInfo?.deletionStatus);
        expect(dvo.deletionDate).toBe(ownSharedIdentityAttribute.deletionInfo?.deletionDate);
        expect(dvo.wasViewedAt).toBeUndefined();
    });

    test("check the CommunicationLanguage", async () => {
        const ownSharedIdentityAttribute = await executeFullCreateAndShareOwnIdentityAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "CommunicationLanguage",
                    value: "de"
                }
            }
        });

        const dto = (await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttribute.id })).value;
        const dvo = (await services1.expander.expandLocalAttributeDTO(dto)) as SharedToPeerAttributeDVO;
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("SharedToPeerAttributeDVO");
        expect(dvo.id).toStrictEqual(ownSharedIdentityAttribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.CommunicationLanguage");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.CommunicationLanguage");
        expect(dvo.date).toStrictEqual(ownSharedIdentityAttribute.createdAt);
        expect(dvo.content).toStrictEqual(ownSharedIdentityAttribute.content);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("CommunicationLanguage");
        expect(value.value).toBe("de");
        expect(dvo.createdAt).toStrictEqual(ownSharedIdentityAttribute.createdAt);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.isValid).toBe(true);
        expect(dvo.owner).toStrictEqual(ownSharedIdentityAttribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("SelectLike");
        expect(dvo.renderHints.dataType).toBe("Language");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.min).toBe(2);
        expect(dvo.valueHints.max).toBe(2);
        expect(dvo.valueHints.values).toHaveLength(183);
        expect(dvo.valueHints.values![31]).toStrictEqual({ key: "de", displayName: "i18n://attributes.values.languages.de" });
        expect(dvo.peer).toBe(ownSharedIdentityAttribute.shareInfo!.peer);
        expect(dvo.isDraft).toBe(false);
        expect(dvo.requestReference).toBe(ownSharedIdentityAttribute.shareInfo!.requestReference);
        expect(dvo.notificationReference).toBe(ownSharedIdentityAttribute.shareInfo!.notificationReference);
        expect(dvo.sourceAttribute).toBe(ownSharedIdentityAttribute.shareInfo!.sourceAttribute);
        expect(dvo.tags).toBe((ownSharedIdentityAttribute.content as IdentityAttributeJSON).tags);
        expect(dvo.valueType).toBe(ownSharedIdentityAttribute.content.value["@type"]);
        expect(dvo.deletionStatus).toBe(ownSharedIdentityAttribute.deletionInfo?.deletionStatus);
        expect(dvo.deletionDate).toBe(ownSharedIdentityAttribute.deletionInfo?.deletionDate);
        expect(dvo.wasViewedAt).toBeUndefined();
    });

    test("check the CommunicationLanguage after the RepositoryAttribute was deleted", async () => {
        const ownSharedIdentityAttribute = await executeFullCreateAndShareOwnIdentityAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "CommunicationLanguage",
                    value: "de"
                }
            }
        });
        const repositoryAttribute = (await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttribute.shareInfo!.sourceAttribute! })).value;
        await services1.consumption.attributes.deleteOwnIdentityAttribute({ attributeId: repositoryAttribute.id });
        const updatedOwnSharedIdentityAttribute = (await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttribute.id })).value;

        const dto = (await services1.consumption.attributes.getAttribute({ id: updatedOwnSharedIdentityAttribute.id })).value;
        const dvo = (await services1.expander.expandLocalAttributeDTO(dto)) as SharedToPeerAttributeDVO;
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("SharedToPeerAttributeDVO");
        expect(dvo.id).toStrictEqual(updatedOwnSharedIdentityAttribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.CommunicationLanguage");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.CommunicationLanguage");
        expect(dvo.date).toStrictEqual(updatedOwnSharedIdentityAttribute.createdAt);
        expect(dvo.content).toStrictEqual(updatedOwnSharedIdentityAttribute.content);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("CommunicationLanguage");
        expect(value.value).toBe("de");
        expect(dvo.createdAt).toStrictEqual(updatedOwnSharedIdentityAttribute.createdAt);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.isValid).toBe(true);
        expect(dvo.owner).toStrictEqual(updatedOwnSharedIdentityAttribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("SelectLike");
        expect(dvo.renderHints.dataType).toBe("Language");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.min).toBe(2);
        expect(dvo.valueHints.max).toBe(2);
        expect(dvo.valueHints.values).toHaveLength(183);
        expect(dvo.valueHints.values![31]).toStrictEqual({ key: "de", displayName: "i18n://attributes.values.languages.de" });
        expect(dvo.peer).toBe(updatedOwnSharedIdentityAttribute.shareInfo!.peer);
        expect(dvo.isDraft).toBe(false);
        expect(dvo.requestReference).toBe(updatedOwnSharedIdentityAttribute.shareInfo!.requestReference);
        expect(dvo.notificationReference).toBe(updatedOwnSharedIdentityAttribute.shareInfo!.notificationReference);
        expect(dvo.sourceAttribute).toBe(updatedOwnSharedIdentityAttribute.shareInfo!.sourceAttribute);
        expect(dvo.tags).toBe((updatedOwnSharedIdentityAttribute.content as IdentityAttributeJSON).tags);
        expect(dvo.valueType).toBe(updatedOwnSharedIdentityAttribute.content.value["@type"]);
        expect(dvo.deletionStatus).toBe(updatedOwnSharedIdentityAttribute.deletionInfo?.deletionStatus);
        expect(dvo.deletionDate).toBe(updatedOwnSharedIdentityAttribute.deletionInfo?.deletionDate);
        expect(dvo.wasViewedAt).toBeUndefined();
    });
});
