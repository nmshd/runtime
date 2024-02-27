import {
    AbstractIntegerJSON,
    AbstractStringJSON,
    BirthDay,
    BirthMonth,
    BirthYear,
    CommunicationLanguage,
    GivenName,
    IdentityAttribute,
    Nationality,
    PersonName,
    Sex
} from "@nmshd/content";
import { CoreAddress } from "@nmshd/transport";
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
            value: GivenName.from("Hugo")
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
        expect(value.value).toBe("Hugo");
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

    test("check the BirthDay", async () => {
        const attribute = IdentityAttribute.from<BirthDay>({
            owner: transportService1Address,
            value: BirthDay.from(17)
        }).toJSON();
        const dvo = await expander1.expandAttribute(attribute);
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("DraftIdentityAttributeDVO");
        expect(dvo.id).toBe("");
        expect(dvo.name).toBe("i18n://dvo.attribute.name.BirthDay");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.BirthDay");
        expect(dvo.content).toStrictEqual(attribute);
        const value = dvo.value as AbstractIntegerJSON;
        expect(value["@type"]).toBe("BirthDay");
        expect(value.value).toBe(17);
        expect(dvo.owner.type).toBe("IdentityDVO");
        expect(dvo.owner.id).toStrictEqual(attribute.owner);
        expect(dvo.owner.name).toBe("i18n://dvo.identity.self.name");
        expect(dvo.owner.isSelf).toBe(true);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("Integer");
        expect(dvo.renderHints.editType).toBe("SelectLike");
        expect(dvo.renderHints.dataType).toBe("Day");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.min).toBe(1);
        expect(dvo.valueHints.max).toBe(31);
    });

    test("check the BirthMonth", async () => {
        const attribute = IdentityAttribute.from<BirthMonth>({
            owner: transportService1Address,
            value: BirthMonth.from(11)
        }).toJSON();
        const dvo = await expander1.expandAttribute(attribute);
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("DraftIdentityAttributeDVO");
        expect(dvo.id).toBe("");
        expect(dvo.name).toBe("i18n://dvo.attribute.name.BirthMonth");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.BirthMonth");
        expect(dvo.content).toStrictEqual(attribute);
        const value = dvo.value as AbstractIntegerJSON;
        expect(value["@type"]).toBe("BirthMonth");
        expect(value.value).toBe(11);
        expect(dvo.owner.type).toBe("IdentityDVO");
        expect(dvo.owner.id).toStrictEqual(attribute.owner);
        expect(dvo.owner.name).toBe("i18n://dvo.identity.self.name");
        expect(dvo.owner.isSelf).toBe(true);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("Integer");
        expect(dvo.renderHints.editType).toBe("SelectLike");
        expect(dvo.renderHints.dataType).toBe("Month");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.min).toBe(1);
        expect(dvo.valueHints.max).toBe(12);
    });

    test("check the BirthYear", async () => {
        const attribute = IdentityAttribute.from<BirthYear>({
            owner: transportService1Address,
            value: BirthYear.from(2001)
        }).toJSON();
        const dvo = await expander1.expandAttribute(attribute);
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("DraftIdentityAttributeDVO");
        expect(dvo.id).toBe("");
        expect(dvo.name).toBe("i18n://dvo.attribute.name.BirthYear");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.BirthYear");
        expect(dvo.content).toStrictEqual(attribute);
        const value = dvo.value as AbstractIntegerJSON;
        expect(value["@type"]).toBe("BirthYear");
        expect(value.value).toBe(2001);
        expect(dvo.owner.type).toBe("IdentityDVO");
        expect(dvo.owner.id).toStrictEqual(attribute.owner);
        expect(dvo.owner.name).toBe("i18n://dvo.identity.self.name");
        expect(dvo.owner.isSelf).toBe(true);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("Integer");
        expect(dvo.renderHints.editType).toBe("SelectLike");
        expect(dvo.renderHints.dataType).toBe("Year");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.min).toBe(1);
        expect(dvo.valueHints.max).toBe(9999);
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

    test("check a complex PersonName", async () => {
        const attribute = IdentityAttribute.from<PersonName>({
            owner: transportService1Address,
            value: PersonName.from({
                honorificPrefix: "Dr.",
                givenName: "Heinz",
                middleName: "Gerhard",
                surname: "Ranzig",
                honorificSuffix: "von Warnermünde"
            })
        }).toJSON();
        const dvo = await expander1.expandAttribute(attribute);
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("DraftIdentityAttributeDVO");
        expect(dvo.id).toBe("");
        expect(dvo.name).toBe("i18n://dvo.attribute.name.PersonName");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.PersonName");
        expect(dvo.content).toStrictEqual(attribute);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("PersonName");
        expect(dvo.owner.type).toBe("IdentityDVO");
        expect(dvo.owner.id).toStrictEqual(attribute.owner);
        expect(dvo.owner.name).toBe("i18n://dvo.identity.self.name");
        expect(dvo.owner.isSelf).toBe(true);

        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("Object");
        expect(dvo.renderHints.editType).toBe("Complex");
        expect(dvo.renderHints.dataType).toBeUndefined();
        expect(dvo.renderHints.propertyHints).toBeDefined();
        expect(dvo.renderHints.propertyHints!["givenName"]).toBeDefined();
        expect(dvo.renderHints.propertyHints!["givenName"].editType).toBe("InputLike");
        expect(dvo.renderHints.propertyHints!["givenName"].technicalType).toBe("String");

        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.propertyHints!["givenName"]).toBeDefined();
        expect(dvo.valueHints.propertyHints!["givenName"].max).toBe(100);
    });
});
