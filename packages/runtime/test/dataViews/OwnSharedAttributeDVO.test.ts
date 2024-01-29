import { AbstractIntegerJSON, AbstractStringJSON } from "@nmshd/content";
import { LocalAttributeDTO, RepositoryAttributeDVO } from "../../src";
import { RuntimeServiceProvider, TestRuntimeServices, ensureActiveRelationship, executeFullCreateAndShareIdentityAttributeFlow } from "../lib";

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

const repositoryAttributes: LocalAttributeDTO[] = [];
const ownSharedIdentityAttributes: LocalAttributeDTO[] = [];
describe("SharedToPeerAttributeDVO", () => {
    beforeAll(async () => {
        ownSharedIdentityAttributes.push(
            await executeFullCreateAndShareIdentityAttributeFlow(services1, services2, {
                content: {
                    value: {
                        "@type": "BirthYear",
                        value: 2001
                    }
                }
            })
        );
        ownSharedIdentityAttributes.push(
            await executeFullCreateAndShareIdentityAttributeFlow(services1, services2, {
                content: {
                    value: {
                        "@type": "Sex",
                        value: "male"
                    }
                }
            })
        );
        ownSharedIdentityAttributes.push(
            await executeFullCreateAndShareIdentityAttributeFlow(services1, services2, {
                content: {
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    }
                }
            })
        );
        ownSharedIdentityAttributes.push(
            await executeFullCreateAndShareIdentityAttributeFlow(services1, services2, {
                content: {
                    value: {
                        "@type": "CommunicationLanguage",
                        value: "de"
                    }
                }
            })
        );

        for (const attr of ownSharedIdentityAttributes) {
            repositoryAttributes.push((await services1.consumption.attributes.getAttribute({ id: attr.shareInfo!.sourceAttribute! })).value);
        }
    });

    test("check the BirthYear", async () => {
        const dtos = [(await services1.consumption.attributes.getAttribute({ id: repositoryAttributes[0].id })).value];
        const dvos = await services1.expander.expandLocalAttributeDTOs(dtos);
        expect(dvos).toHaveLength(1);
        const dvo = dvos[0] as RepositoryAttributeDVO;
        const attribute = repositoryAttributes[0];
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("RepositoryAttributeDVO");
        expect(dvo.id).toStrictEqual(attribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.BirthYear");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.BirthYear");
        expect(dvo.date).toStrictEqual(attribute.createdAt);
        expect(dvo.content).toStrictEqual(attribute.content);
        const value = dvo.value as AbstractIntegerJSON;
        expect(value["@type"]).toBe("BirthYear");
        expect(value.value).toBe(2001);

        expect(dvo.createdAt).toStrictEqual(attribute.createdAt);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.isValid).toBe(true);
        expect(dvo.owner).toStrictEqual(attribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("Integer");
        expect(dvo.renderHints.editType).toBe("SelectLike");
        expect(dvo.renderHints.dataType).toBe("Year");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.min).toBe(1);
        expect(dvo.valueHints.max).toBe(9999);

        expect(dvo.sharedWith).toHaveLength(1);
        const shared = dvo.sharedWith[0];
        const sharedAttribute = ownSharedIdentityAttributes[0];
        expect(shared.id).toBe(sharedAttribute.id);
        expect(shared.date).toBe(sharedAttribute.createdAt);
        expect(shared.createdAt).toBe(sharedAttribute.createdAt);
        expect(shared.peer).toBe(sharedAttribute.shareInfo!.peer);
        expect(shared.requestReference).toBe(sharedAttribute.shareInfo!.requestReference);
        expect(shared.notificationReference).toBe(sharedAttribute.shareInfo!.notificationReference);
        expect(shared.sourceAttribute).toBe(sharedAttribute.shareInfo!.sourceAttribute);
    });

    test("check the Sex", async () => {
        const dtos = [(await services1.consumption.attributes.getAttribute({ id: repositoryAttributes[1].id })).value];
        const dvos = await services1.expander.expandLocalAttributeDTOs(dtos);
        expect(dvos).toHaveLength(1);
        const dvo = dvos[0] as RepositoryAttributeDVO;
        const attribute = repositoryAttributes[1];
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("RepositoryAttributeDVO");
        expect(dvo.id).toStrictEqual(attribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.Sex");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.Sex");
        expect(dvo.date).toStrictEqual(attribute.createdAt);
        expect(dvo.content).toStrictEqual(attribute.content);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("Sex");
        expect(value.value).toBe("male");
        expect(dvo.createdAt).toStrictEqual(attribute.createdAt);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.isValid).toBe(true);
        expect(dvo.owner).toStrictEqual(attribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("ButtonLike");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");

        expect(dvo.valueHints.values).toStrictEqual([
            { key: "intersex", displayName: "i18n://attributes.values.sex.intersex" },
            { key: "female", displayName: "i18n://attributes.values.sex.female" },
            { key: "male", displayName: "i18n://attributes.values.sex.male" }
        ]);

        expect(dvo.sharedWith).toHaveLength(1);
        const shared = dvo.sharedWith[0];
        const sharedAttribute = ownSharedIdentityAttributes[1];
        expect(shared.id).toBe(sharedAttribute.id);
        expect(shared.date).toBe(sharedAttribute.createdAt);
        expect(shared.createdAt).toBe(sharedAttribute.createdAt);
        expect(shared.peer).toBe(sharedAttribute.shareInfo!.peer);
        expect(shared.requestReference).toBe(sharedAttribute.shareInfo!.requestReference);
        expect(shared.notificationReference).toBe(sharedAttribute.shareInfo!.notificationReference);
        expect(shared.sourceAttribute).toBe(sharedAttribute.shareInfo!.sourceAttribute);
    });

    test("check the Nationality", async () => {
        const dtos = [(await services1.consumption.attributes.getAttribute({ id: repositoryAttributes[2].id })).value];
        const dvos = await services1.expander.expandLocalAttributeDTOs(dtos);
        expect(dvos).toHaveLength(1);
        const dvo = dvos[0] as RepositoryAttributeDVO;
        const attribute = repositoryAttributes[2];
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("RepositoryAttributeDVO");
        expect(dvo.id).toStrictEqual(attribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.Nationality");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.Nationality");
        expect(dvo.date).toStrictEqual(attribute.createdAt);
        expect(dvo.content).toStrictEqual(attribute.content);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("Nationality");
        expect(value.value).toBe("DE");
        expect(dvo.createdAt).toStrictEqual(attribute.createdAt);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.isValid).toBe(true);
        expect(dvo.owner).toStrictEqual(attribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("SelectLike");
        expect(dvo.renderHints.dataType).toBe("Country");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.min).toBe(2);
        expect(dvo.valueHints.max).toBe(2);
        expect(dvo.valueHints.values).toHaveLength(249);
        expect(dvo.valueHints.values![61]).toStrictEqual({ key: "DE", displayName: "i18n://attributes.values.countries.DE" });

        expect(dvo.sharedWith).toHaveLength(1);
        const shared = dvo.sharedWith[0];
        const sharedAttribute = ownSharedIdentityAttributes[2];
        expect(shared.id).toBe(sharedAttribute.id);
        expect(shared.date).toBe(sharedAttribute.createdAt);
        expect(shared.createdAt).toBe(sharedAttribute.createdAt);
        expect(shared.peer).toBe(sharedAttribute.shareInfo!.peer);
        expect(shared.requestReference).toBe(sharedAttribute.shareInfo!.requestReference);
        expect(shared.notificationReference).toBe(sharedAttribute.shareInfo!.notificationReference);
        expect(shared.sourceAttribute).toBe(sharedAttribute.shareInfo!.sourceAttribute);
    });

    test("check the CommunicationLanguage", async () => {
        const dtos = [(await services1.consumption.attributes.getAttribute({ id: repositoryAttributes[3].id })).value];
        const dvos = await services1.expander.expandLocalAttributeDTOs(dtos);
        expect(dvos).toHaveLength(1);
        const dvo = dvos[0] as RepositoryAttributeDVO;
        const attribute = repositoryAttributes[3];
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("RepositoryAttributeDVO");
        expect(dvo.id).toStrictEqual(attribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.CommunicationLanguage");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.CommunicationLanguage");
        expect(dvo.date).toStrictEqual(attribute.createdAt);
        expect(dvo.content).toStrictEqual(attribute.content);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("CommunicationLanguage");
        expect(value.value).toBe("de");
        expect(dvo.createdAt).toStrictEqual(attribute.createdAt);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.isValid).toBe(true);
        expect(dvo.owner).toStrictEqual(attribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("SelectLike");
        expect(dvo.renderHints.dataType).toBe("Language");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.min).toBe(2);
        expect(dvo.valueHints.max).toBe(2);
        expect(dvo.valueHints.values).toHaveLength(183);
        expect(dvo.valueHints.values![31]).toStrictEqual({ key: "de", displayName: "i18n://attributes.values.languages.de" });

        expect(dvo.sharedWith).toHaveLength(1);
        const shared = dvo.sharedWith[0];
        const sharedAttribute = ownSharedIdentityAttributes[3];
        expect(shared.id).toBe(sharedAttribute.id);
        expect(shared.date).toBe(sharedAttribute.createdAt);
        expect(shared.createdAt).toBe(sharedAttribute.createdAt);
        expect(shared.peer).toBe(sharedAttribute.shareInfo!.peer);
        expect(shared.requestReference).toBe(sharedAttribute.shareInfo!.requestReference);
        expect(shared.notificationReference).toBe(sharedAttribute.shareInfo!.notificationReference);
        expect(shared.sourceAttribute).toBe(sharedAttribute.shareInfo!.sourceAttribute);
    });
});
