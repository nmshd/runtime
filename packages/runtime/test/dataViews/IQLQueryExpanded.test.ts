import { AbstractStringJSON, CommunicationLanguage, IQLQueryJSON, StreetAddress } from "@nmshd/content";
import { ConsumptionServices, DataViewExpander, LocalAttributeDTO, OwnIdentityAttributeDVO } from "../../src";
import { RuntimeServiceProvider } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let consumptionServices1: ConsumptionServices;
let expander1: DataViewExpander;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(1);
    consumptionServices1 = runtimeServices[0].consumption;
    expander1 = runtimeServices[0].expander;
}, 30000);

afterAll(() => serviceProvider.stop());

describe("IQLQueryExpanded", () => {
    const attributes: LocalAttributeDTO[] = [];

    beforeAll(async () => {
        attributes.push(
            (
                await consumptionServices1.attributes.createOwnIdentityAttribute({
                    content: {
                        value: {
                            "@type": "GivenName",
                            value: "aGivenName"
                        },
                        tags: ["x:default"]
                    }
                })
            ).value
        );
        attributes.push(
            (
                await consumptionServices1.attributes.createOwnIdentityAttribute({
                    content: {
                        value: {
                            "@type": "GivenName",
                            value: "Egon"
                        }
                    }
                })
            ).value
        );
        attributes.push(
            (
                await consumptionServices1.attributes.createOwnIdentityAttribute({
                    content: {
                        value: {
                            "@type": "GivenName",
                            value: "Tester"
                        },
                        tags: ["x:fake"]
                    }
                })
            ).value
        );
        attributes.push(
            (
                await consumptionServices1.attributes.createOwnIdentityAttribute({
                    content: {
                        value: {
                            "@type": "Surname",
                            value: "Nachname"
                        },
                        tags: ["x:fake"]
                    }
                })
            ).value
        );
    });

    test("check all GivenNames", async () => {
        const query: IQLQueryJSON = {
            "@type": "IQLQuery",
            queryString: "GivenName"
        };
        const expandedQuery = await expander1.processIQLQuery(query);
        expect(expandedQuery).toBeDefined();
        expect(expandedQuery.type).toBe("ProcessedIQLQueryDVO");
        expect(expandedQuery.name).toBe("i18n://dvo.attributeQuery.name.IQLQuery");
        expect(expandedQuery.description).toBe("i18n://dvo.attributeQuery.description.IQLQuery");
        expect(expandedQuery.valueType).toBe("GivenName");
        expect(expandedQuery.renderHints!["@type"]).toBe("RenderHints");
        expect(expandedQuery.renderHints!.technicalType).toBe("String");
        expect(expandedQuery.renderHints!.editType).toBe("InputLike");
        expect(expandedQuery.valueHints!["@type"]).toBe("ValueHints");
        expect(expandedQuery.valueHints!.max).toBe(100);
        expect(expandedQuery.results).toHaveLength(3);

        let dvo: OwnIdentityAttributeDVO = expandedQuery.results[0];
        let attribute = attributes[0];
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("OwnIdentityAttributeDVO");
        expect(dvo.id).toStrictEqual(attribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.GivenName");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.GivenName");
        expect(dvo.date).toStrictEqual(attribute.createdAt);
        expect(dvo.content).toStrictEqual(attribute.content);
        const givenName = dvo.value as AbstractStringJSON;
        expect(givenName["@type"]).toBe("GivenName");
        expect(givenName.value).toBe("aGivenName");
        expect(dvo.tags![0]).toBe("x:default");
        expect(dvo.createdAt).toStrictEqual(attribute.createdAt);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.forwardingPeers).toBeUndefined();
        expect(dvo.forwardedSharingInfos).toBeUndefined();
        expect(dvo.owner).toStrictEqual(attribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("InputLike");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.max).toBe(100);

        dvo = expandedQuery.results[1];
        attribute = attributes[1];
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("OwnIdentityAttributeDVO");
        expect(dvo.id).toStrictEqual(attribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.GivenName");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.GivenName");
        expect(dvo.date).toStrictEqual(attribute.createdAt);
        expect(dvo.content).toStrictEqual(attribute.content);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("GivenName");
        expect(value.value).toBe("Egon");
        expect(dvo.createdAt).toStrictEqual(attribute.createdAt);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.forwardingPeers).toBeUndefined();
        expect(dvo.forwardedSharingInfos).toBeUndefined();
        expect(dvo.owner).toStrictEqual(attribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("InputLike");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.max).toBe(100);

        dvo = expandedQuery.results[2];
        attribute = attributes[2];
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("OwnIdentityAttributeDVO");
        expect(dvo.id).toStrictEqual(attribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.GivenName");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.GivenName");
        expect(dvo.date).toStrictEqual(attribute.createdAt);
        expect(dvo.content).toStrictEqual(attribute.content);
        const value3 = dvo.value as AbstractStringJSON;
        expect(value3["@type"]).toBe("GivenName");
        expect(value3.value).toBe("Tester");
        expect(dvo.tags![0]).toBe("x:fake");
        expect(dvo.createdAt).toStrictEqual(attribute.createdAt);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.forwardingPeers).toBeUndefined();
        expect(dvo.forwardedSharingInfos).toBeUndefined();
        expect(dvo.owner).toStrictEqual(attribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("InputLike");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.max).toBe(100);
    });

    test("check only default GivenName", async () => {
        const query: IQLQueryJSON = {
            "@type": "IQLQuery",
            queryString: "GivenName && #x:default"
        };
        const expandedQuery = await expander1.processIQLQuery(query);
        expect(expandedQuery).toBeDefined();
        expect(expandedQuery.type).toBe("ProcessedIQLQueryDVO");
        expect(expandedQuery.name).toBe("i18n://dvo.attributeQuery.name.IQLQuery");
        expect(expandedQuery.description).toBe("i18n://dvo.attributeQuery.description.IQLQuery");
        expect(expandedQuery.valueType).toBe("GivenName");
        expect(expandedQuery.renderHints!["@type"]).toBe("RenderHints");
        expect(expandedQuery.renderHints!.technicalType).toBe("String");
        expect(expandedQuery.renderHints!.editType).toBe("InputLike");
        expect(expandedQuery.valueHints!["@type"]).toBe("ValueHints");
        expect(expandedQuery.valueHints!.max).toBe(100);
        expect(expandedQuery.results).toHaveLength(1);

        const dvo: OwnIdentityAttributeDVO = expandedQuery.results[0];
        const attribute = attributes[0];
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("OwnIdentityAttributeDVO");
        expect(dvo.id).toStrictEqual(attribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.GivenName");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.GivenName");
        expect(dvo.date).toStrictEqual(attribute.createdAt);
        expect(dvo.content).toStrictEqual(attribute.content);
        const givenName = dvo.value as AbstractStringJSON;
        expect(givenName["@type"]).toBe("GivenName");
        expect(givenName.value).toBe("aGivenName");
        expect(dvo.tags![0]).toBe("x:default");
        expect(dvo.createdAt).toStrictEqual(attribute.createdAt);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.forwardingPeers).toBeUndefined();
        expect(dvo.forwardedSharingInfos).toBeUndefined();
        expect(dvo.owner).toStrictEqual(attribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("InputLike");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.max).toBe(100);
    });

    test("check only fake GivenName", async () => {
        const query: IQLQueryJSON = {
            "@type": "IQLQuery",
            queryString: "GivenName && #x:fake"
        };
        const expandedQuery = await expander1.processIQLQuery(query);
        expect(expandedQuery).toBeDefined();
        expect(expandedQuery.type).toBe("ProcessedIQLQueryDVO");
        expect(expandedQuery.name).toBe("i18n://dvo.attributeQuery.name.IQLQuery");
        expect(expandedQuery.description).toBe("i18n://dvo.attributeQuery.description.IQLQuery");
        expect(expandedQuery.valueType).toBe("GivenName");
        expect(expandedQuery.renderHints!["@type"]).toBe("RenderHints");
        expect(expandedQuery.renderHints!.technicalType).toBe("String");
        expect(expandedQuery.renderHints!.editType).toBe("InputLike");
        expect(expandedQuery.valueHints!["@type"]).toBe("ValueHints");
        expect(expandedQuery.valueHints!.max).toBe(100);
        expect(expandedQuery.results).toHaveLength(1);

        const dvo: OwnIdentityAttributeDVO = expandedQuery.results[0];
        const attribute = attributes[2];
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("OwnIdentityAttributeDVO");
        expect(dvo.id).toStrictEqual(attribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.GivenName");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.GivenName");
        expect(dvo.date).toStrictEqual(attribute.createdAt);
        expect(dvo.content).toStrictEqual(attribute.content);
        const givenName = dvo.value as AbstractStringJSON;
        expect(givenName["@type"]).toBe("GivenName");
        expect(givenName.value).toBe("Tester");
        expect(dvo.tags![0]).toBe("x:fake");
        expect(dvo.createdAt).toStrictEqual(attribute.createdAt);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.forwardingPeers).toBeUndefined();
        expect(dvo.forwardedSharingInfos).toBeUndefined();
        expect(dvo.owner).toStrictEqual(attribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("InputLike");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.max).toBe(100);
    });

    test("check all fake attributes", async () => {
        const query: IQLQueryJSON = {
            "@type": "IQLQuery",
            queryString: "#x:fake"
        };
        const expandedQuery = await expander1.processIQLQuery(query);
        expect(expandedQuery).toBeDefined();
        expect(expandedQuery.type).toBe("ProcessedIQLQueryDVO");
        expect(expandedQuery.name).toBe("i18n://dvo.attributeQuery.name.IQLQuery");
        expect(expandedQuery.description).toBe("i18n://dvo.attributeQuery.description.IQLQuery");
        expect(expandedQuery.valueType).toBeUndefined();
        expect(expandedQuery.renderHints).toBeUndefined();
        expect(expandedQuery.valueHints).toBeUndefined();
        expect(expandedQuery.results).toHaveLength(2);

        let dvo: OwnIdentityAttributeDVO = expandedQuery.results[0];
        let attribute = attributes[2];
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("OwnIdentityAttributeDVO");
        expect(dvo.id).toStrictEqual(attribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.GivenName");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.GivenName");
        expect(dvo.date).toStrictEqual(attribute.createdAt);
        expect(dvo.content).toStrictEqual(attribute.content);
        const givenName = dvo.value as AbstractStringJSON;
        expect(givenName["@type"]).toBe("GivenName");
        expect(givenName.value).toBe("Tester");
        expect(dvo.tags![0]).toBe("x:fake");
        expect(dvo.createdAt).toStrictEqual(attribute.createdAt);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.forwardingPeers).toBeUndefined();
        expect(dvo.forwardedSharingInfos).toBeUndefined();
        expect(dvo.owner).toStrictEqual(attribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("InputLike");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.max).toBe(100);

        dvo = expandedQuery.results[1];
        attribute = attributes[3];
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("OwnIdentityAttributeDVO");
        expect(dvo.id).toStrictEqual(attribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.Surname");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.Surname");
        expect(dvo.date).toStrictEqual(attribute.createdAt);
        expect(dvo.content).toStrictEqual(attribute.content);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("Surname");
        expect(value.value).toBe("Nachname");
        expect(dvo.tags![0]).toBe("x:fake");
        expect(dvo.createdAt).toStrictEqual(attribute.createdAt);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.forwardingPeers).toBeUndefined();
        expect(dvo.forwardedSharingInfos).toBeUndefined();
        expect(dvo.owner).toStrictEqual(attribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("InputLike");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.max).toBe(100);
    });

    test("check non-existing attributes", async () => {
        const query: IQLQueryJSON = {
            "@type": "IQLQuery",
            queryString: "#NONEXISTANT"
        };
        const expandedQuery = await expander1.processIQLQuery(query);
        expect(expandedQuery).toBeDefined();
        expect(expandedQuery.type).toBe("ProcessedIQLQueryDVO");
        expect(expandedQuery.name).toBe("i18n://dvo.attributeQuery.name.IQLQuery");
        expect(expandedQuery.description).toBe("i18n://dvo.attributeQuery.description.IQLQuery");
        expect(expandedQuery.valueType).toBeUndefined();
        expect(expandedQuery.renderHints).toBeUndefined();
        expect(expandedQuery.valueHints).toBeUndefined();
        expect(expandedQuery.results).toHaveLength(0);
    });

    test("check iql query with fallback (CommunicationLanguage)", async () => {
        const query: IQLQueryJSON = {
            "@type": "IQLQuery",
            queryString: "CommunicationLanguage || #language",
            attributeCreationHints: {
                valueType: "CommunicationLanguage"
            }
        };
        const expandedQuery = await expander1.processIQLQuery(query);
        expect(expandedQuery).toBeDefined();
        expect(expandedQuery.type).toBe("ProcessedIQLQueryDVO");
        expect(expandedQuery.name).toBe("i18n://dvo.attributeQuery.name.IQLQuery");
        expect(expandedQuery.description).toBe("i18n://dvo.attributeQuery.description.IQLQuery");
        expect(expandedQuery.valueType).toBe("CommunicationLanguage");
        expect(expandedQuery.renderHints).toStrictEqual(CommunicationLanguage.renderHints.toJSON());
        expect(expandedQuery.valueHints).toStrictEqual(CommunicationLanguage.valueHints.toJSON());
        expect(expandedQuery.results).toHaveLength(0);
    });

    test("check iql query with fallback (StreetAddress)", async () => {
        const query: IQLQueryJSON = {
            "@type": "IQLQuery",
            queryString: "StreetAddress && #delivery",
            attributeCreationHints: {
                valueType: "StreetAddress",
                tags: ["x:delivery"]
            }
        };
        const expandedQuery = await expander1.processIQLQuery(query);
        expect(expandedQuery).toBeDefined();
        expect(expandedQuery.type).toBe("ProcessedIQLQueryDVO");
        expect(expandedQuery.name).toBe("i18n://dvo.attributeQuery.name.IQLQuery");
        expect(expandedQuery.description).toBe("i18n://dvo.attributeQuery.description.IQLQuery");
        expect(expandedQuery.valueType).toBe("StreetAddress");
        expect(expandedQuery.renderHints).toStrictEqual(StreetAddress.renderHints.toJSON());
        expect(expandedQuery.valueHints).toStrictEqual(StreetAddress.valueHints.toJSON());
        expect(expandedQuery.results).toHaveLength(0);
        expect(expandedQuery.tags).toHaveLength(1);
        expect(expandedQuery.tags![0]).toBe("x:delivery");
    });
});
