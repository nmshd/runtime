import { AbstractStringJSON, IdentityAttributeQueryJSON } from "@nmshd/content";
import { ConsumptionServices, DataViewExpander, LocalAttributeDTO, RepositoryAttributeDVO } from "../../src";
import { RuntimeServiceProvider } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let consumptionServices1: ConsumptionServices;
let expander1: DataViewExpander;

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(1, {
        enableDefaultRepositoryAttributes: true
    });
    consumptionServices1 = runtimeServices[0].consumption;
    expander1 = runtimeServices[0].expander;
}, 30000);

afterAll(() => serviceProvider.stop());

describe("IdentityAttributeQueryExpanded", () => {
    const attributes: LocalAttributeDTO[] = [];

    beforeAll(async () => {
        const firstlyCreatedGivenName = (
            await consumptionServices1.attributes.createRepositoryAttribute({
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "A first given name"
                    },
                    tags: ["notDefault"]
                }
            })
        ).value;

        const secondlyCreatedGivenName = (
            await consumptionServices1.attributes.createRepositoryAttribute({
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "A second given name"
                    },
                    tags: ["default"]
                }
            })
        ).value;

        const updatedSecondlyCreatedGivenName = (await consumptionServices1.attributes.changeDefaultRepositoryAttribute({ attributeId: secondlyCreatedGivenName.id })).value;
        const updatedFirstlyCreatedGivenName = (await consumptionServices1.attributes.getAttribute({ id: firstlyCreatedGivenName.id })).value;

        attributes.push(updatedSecondlyCreatedGivenName, updatedFirstlyCreatedGivenName);
    });

    test("check the order and content of the expanded LocalAttributes that match the query", async () => {
        const query: IdentityAttributeQueryJSON = {
            "@type": "IdentityAttributeQuery",
            valueType: "GivenName"
        };
        const expandedQuery = await expander1.processIdentityAttributeQuery(query);
        expect(expandedQuery).toBeDefined();
        expect(expandedQuery.type).toBe("ProcessedIdentityAttributeQueryDVO");
        expect(expandedQuery.name).toBe("i18n://dvo.attribute.name.GivenName");
        expect(expandedQuery.description).toBe("i18n://dvo.attribute.description.GivenName");
        expect(expandedQuery.valueType).toBe("GivenName");
        expect(expandedQuery.validFrom).toBeUndefined();
        expect(expandedQuery.validTo).toBeUndefined();
        expect(expandedQuery.renderHints["@type"]).toBe("RenderHints");
        expect(expandedQuery.renderHints.technicalType).toBe("String");
        expect(expandedQuery.renderHints.editType).toBe("InputLike");
        expect(expandedQuery.valueHints["@type"]).toBe("ValueHints");
        expect(expandedQuery.valueHints.max).toBe(100);
        expect(expandedQuery.results).toHaveLength(2);

        let dvo: RepositoryAttributeDVO = expandedQuery.results[0] as RepositoryAttributeDVO;
        let attribute = attributes[0];
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("RepositoryAttributeDVO");
        expect(dvo.id).toStrictEqual(attribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.GivenName");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.GivenName");
        expect(dvo.date).toStrictEqual(attribute.createdAt);
        expect(dvo.content).toStrictEqual(attribute.content);
        const givenName = dvo.value as AbstractStringJSON;
        expect(givenName["@type"]).toBe("GivenName");
        expect(givenName.value).toBe("A second given name");
        expect(dvo.tags).toStrictEqual(["default"]);
        expect(dvo.isDefault).toBe(true);
        expect(dvo.createdAt).toStrictEqual(attribute.createdAt);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.isValid).toBe(true);
        expect(dvo.sharedWith).toStrictEqual([]);
        expect(dvo.owner).toStrictEqual(attribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("InputLike");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.max).toBe(100);

        dvo = expandedQuery.results[1] as RepositoryAttributeDVO;
        attribute = attributes[1];
        expect(dvo).toBeDefined();
        expect(dvo.type).toBe("RepositoryAttributeDVO");
        expect(dvo.id).toStrictEqual(attribute.id);
        expect(dvo.name).toBe("i18n://dvo.attribute.name.GivenName");
        expect(dvo.description).toBe("i18n://dvo.attribute.description.GivenName");
        expect(dvo.date).toStrictEqual(attribute.createdAt);
        expect(dvo.content).toStrictEqual(attribute.content);
        const value = dvo.value as AbstractStringJSON;
        expect(value["@type"]).toBe("GivenName");
        expect(value.value).toBe("A first given name");
        expect(dvo.tags).toStrictEqual(["notDefault"]);
        expect(dvo.isDefault).toBeUndefined();
        expect(dvo.createdAt).toStrictEqual(attribute.createdAt);
        expect(dvo.isOwn).toBe(true);
        expect(dvo.isValid).toBe(true);
        expect(dvo.sharedWith).toStrictEqual([]);
        expect(dvo.owner).toStrictEqual(attribute.content.owner);
        expect(dvo.renderHints["@type"]).toBe("RenderHints");
        expect(dvo.renderHints.technicalType).toBe("String");
        expect(dvo.renderHints.editType).toBe("InputLike");
        expect(dvo.valueHints["@type"]).toBe("ValueHints");
        expect(dvo.valueHints.max).toBe(100);
    });
});
