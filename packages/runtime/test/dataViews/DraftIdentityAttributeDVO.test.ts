import { AbstractStringJSON, CommunicationLanguage, GivenName, IdentityAttribute, MaritalStatus, Nationality, Sex, StreetAddress } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { DataViewExpander, TransportServices } from "../../src";
import { RuntimeServiceProvider } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let transportServices1: TransportServices;
let transportService1Address: CoreAddress;

let expander1: DataViewExpander;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(1);
    transportServices1 = runtimeServices[0].transport;
    expander1 = runtimeServices[0].expander;

    transportService1Address = CoreAddress.from((await transportServices1.account.getIdentityInfo()).value.address);
}, 30000);

afterAll(() => serviceProvider.stop());

describe("DraftIdentityAttributeDVO", () => {
    test("check the GivenName", async () => {
        const attribute = IdentityAttribute.from<GivenName>({
            owner: transportService1Address,
            value: GivenName.from("aGivenName")
        }).toJSON();
        const dvo = await expander1.expandAttribute(attribute);
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("DraftIdentityAttributeDVO");
        expect(dvo.id).toBe("");
        expect(dvo.name).toBe("i18n://dvo.attribute.name.GivenName");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.GivenName");
        expect(dvo.content).toStrictEqual(attribute);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("GivenName");
        expect(value.value).toBe("aGivenName");
        expect(dvo.owner.type).toBe("IdentityDVO");
        expect(dvo.owner.id).toStrictEqual(attribute.owner);
        expect(dvo.owner.name).toBe("i18n://dvo.identity.self.name");
        expect(dvo.owner.isSelf).toBe(true);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("InputLike");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.max).toBe(100);
    });

    test("check the Sex", async () => {
        const attribute = IdentityAttribute.from<Sex>({
            owner: transportService1Address,
            value: Sex.from("male")
        }).toJSON();
        const dvo = await expander1.expandAttribute(attribute);
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("DraftIdentityAttributeDVO");
        expect(dvo.id).toBe("");
        expect(dvo.name).toBe("i18n://dvo.attribute.name.Sex");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.Sex");
        expect(dvo.content).toStrictEqual(attribute);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("Sex");
        expect(value.value).toBe("male");
        expect(dvo.owner.type).toBe("IdentityDVO");
        expect(dvo.owner.id).toStrictEqual(attribute.owner);
        expect(dvo.owner.name).toBe("i18n://dvo.identity.self.name");
        expect(dvo.owner.isSelf).toBe(true);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("ButtonLike");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.values).toStrictEqual([
            { key: "intersex", displayName: "i18n://attributes.values.sex.intersex" },
            { key: "female", displayName: "i18n://attributes.values.sex.female" },
            { key: "male", displayName: "i18n://attributes.values.sex.male" }
        ]);
    });

    test("check the Nationality", async () => {
        const attribute = IdentityAttribute.from<Nationality>({
            owner: transportService1Address,
            value: Nationality.from("DE")
        }).toJSON();
        const dvo = await expander1.expandAttribute(attribute);
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("DraftIdentityAttributeDVO");
        expect(dvo.id).toBe("");
        expect(dvo.name).toBe("i18n://dvo.attribute.name.Nationality");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.Nationality");
        expect(dvo.content).toStrictEqual(attribute);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("Nationality");
        expect(value.value).toBe("DE");
        expect(dvo.owner.type).toBe("IdentityDVO");
        expect(dvo.owner.id).toStrictEqual(attribute.owner);
        expect(dvo.owner.name).toBe("i18n://dvo.identity.self.name");
        expect(dvo.owner.isSelf).toBe(true);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("SelectLike");
        expect(dvo.renderHints.dataType).toBe("Country");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.min).toBe(2);
        expect(dvo.valueHints.max).toBe(2);
        expect(dvo.valueHints.values).toHaveLength(249);
        expect(dvo.valueHints.values![61]).toStrictEqual({ key: "DE", displayName: "i18n://attributes.values.countries.DE" });
    });

    test("check the CommunicationLanguage", async () => {
        const attribute = IdentityAttribute.from<CommunicationLanguage>({
            owner: transportService1Address,
            value: CommunicationLanguage.from("de")
        }).toJSON();
        const dvo = await expander1.expandAttribute(attribute);
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("DraftIdentityAttributeDVO");
        expect(dvo.id).toBe("");
        expect(dvo.name).toBe("i18n://dvo.attribute.name.CommunicationLanguage");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.CommunicationLanguage");
        expect(dvo.content).toStrictEqual(attribute);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("CommunicationLanguage");
        expect(value.value).toBe("de");
        expect(dvo.owner.type).toBe("IdentityDVO");
        expect(dvo.owner.id).toStrictEqual(attribute.owner);
        expect(dvo.owner.name).toBe("i18n://dvo.identity.self.name");
        expect(dvo.owner.isSelf).toBe(true);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("SelectLike");
        expect(dvo.renderHints.dataType).toBe("Language");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.min).toBe(2);
        expect(dvo.valueHints.max).toBe(2);
        expect(dvo.valueHints.values).toHaveLength(183);
        expect(dvo.valueHints.values![31]).toStrictEqual({ key: "de", displayName: "i18n://attributes.values.languages.de" });
    });

    test("check the MaritalStatus", async () => {
        const attribute = IdentityAttribute.from<MaritalStatus>({
            owner: transportService1Address,
            value: MaritalStatus.from("married")
        }).toJSON();
        const dvo = await expander1.expandAttribute(attribute);
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("DraftIdentityAttributeDVO");
        expect(dvo.id).toBe("");
        expect(dvo.name).toBe("i18n://dvo.attribute.name.MaritalStatus");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.MaritalStatus");
        expect(dvo.content).toStrictEqual(attribute);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("MaritalStatus");
        expect(value.value).toBe("married");
        expect(dvo.owner.type).toBe("IdentityDVO");
        expect(dvo.owner.id).toStrictEqual(attribute.owner);
        expect(dvo.owner.name).toBe("i18n://dvo.identity.self.name");
        expect(dvo.owner.isSelf).toBe(true);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("ButtonLike");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.values).toStrictEqual([
            { key: "single", displayName: "i18n://attributes.values.maritalStatus.single" },
            { key: "married", displayName: "i18n://attributes.values.maritalStatus.married" },
            { key: "separated", displayName: "i18n://attributes.values.maritalStatus.separated" },
            { key: "divorced", displayName: "i18n://attributes.values.maritalStatus.divorced" },
            { key: "widowed", displayName: "i18n://attributes.values.maritalStatus.widowed" },
            { key: "civilPartnership", displayName: "i18n://attributes.values.maritalStatus.civilPartnership" },
            { key: "civilPartnershipDissolved", displayName: "i18n://attributes.values.maritalStatus.civilPartnershipDissolved" },
            { key: "civilPartnerDeceased", displayName: "i18n://attributes.values.maritalStatus.civilPartnerDeceased" }
        ]);
    });

    test("check a complex StreetAddress", async () => {
        const attribute = IdentityAttribute.from<StreetAddress>({
            owner: transportService1Address,
            value: StreetAddress.from({
                street: "aStreet",
                houseNo: "aHouseNo",
                zipCode: "aZipCode",
                city: "aCity",
                country: "DE",
                recipient: "aRecipient"
            })
        }).toJSON();
        const dvo = await expander1.expandAttribute(attribute);
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("DraftIdentityAttributeDVO");
        expect(dvo.id).toBe("");
        expect(dvo.name).toBe("i18n://dvo.attribute.name.StreetAddress");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.StreetAddress");
        expect(dvo.content).toStrictEqual(attribute);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("StreetAddress");
        expect(dvo.owner.type).toBe("IdentityDVO");
        expect(dvo.owner.id).toStrictEqual(attribute.owner);
        expect(dvo.owner.name).toBe("i18n://dvo.identity.self.name");
        expect(dvo.owner.isSelf).toBe(true);

        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("Object");
        expect(dvo.renderHints.editType).toBe("Complex");
        expect(dvo.renderHints.dataType).toBeUndefined();
        expect(dvo.renderHints.propertyHints).toBeDefined();
        expect(dvo.renderHints.propertyHints!["street"]).toBeDefined();
        expect(dvo.renderHints.propertyHints!["street"].editType).toBe("InputLike");
        expect(dvo.renderHints.propertyHints!["street"].technicalType).toBe("String");

        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.propertyHints!["street"]).toBeDefined();
        expect(dvo.valueHints.propertyHints!["street"].max).toBe(100);
    });
});
