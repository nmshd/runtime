import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { IThirdPartyRelationshipAttributeQuery, ThirdPartyRelationshipAttributeQuery, ThirdPartyRelationshipAttributeQueryJSON } from "@nmshd/content";

interface TestTypeContainingThirdPartyRelationshipAttributeQueryTestJSON {
    "@type": "TestTypeContainingThirdPartyRelationshipAttributeQueryTest";
    query: ThirdPartyRelationshipAttributeQueryJSON;
}

interface ITestTypeContainingThirdPartyRelationshipAttributeQueryTest extends ISerializable {
    query: IThirdPartyRelationshipAttributeQuery;
}

class TestTypeContainingThirdPartyRelationshipAttributeQueryTest extends Serializable implements ITestTypeContainingThirdPartyRelationshipAttributeQueryTest {
    @serialize()
    @validate()
    public query: ThirdPartyRelationshipAttributeQuery;

    public static from(
        value: ITestTypeContainingThirdPartyRelationshipAttributeQueryTest | Omit<TestTypeContainingThirdPartyRelationshipAttributeQueryTestJSON, "@type">
    ): TestTypeContainingThirdPartyRelationshipAttributeQueryTest {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): TestTypeContainingThirdPartyRelationshipAttributeQueryTestJSON {
        return super.toJSON(verbose, serializeAsString) as TestTypeContainingThirdPartyRelationshipAttributeQueryTestJSON;
    }
}

describe("ThirdPartyRelationshipAttributeQuery", function () {
    test.each([
        { in: "test", out: ["test"] },
        { in: ["test"], out: ["test"] },
        { in: ["test", "test"], out: ["test", "test"] },
        { in: { address: "test" }, out: ["test"] },
        { in: [{ address: "test" }], out: ["test"] },
        { in: [{ address: "test" }, { address: "test" }], out: ["test", "test"] }
    ])("accepts %j as thirdParty", function (params) {
        const serialized = ThirdPartyRelationshipAttributeQuery.from({
            key: "test",
            owner: "thirdParty",

            // casting as any to test backwards compatibility
            thirdParty: params.in as unknown as any
        });

        expect(serialized).toBeInstanceOf(ThirdPartyRelationshipAttributeQuery);

        const json = serialized.toJSON();
        expect(json.thirdParty).toStrictEqual(params.out);
    });

    test.each([1, true, null, undefined, [], {}, { address: 1 }])("throws on '%p' as thirdParty", function (thirdParty: any) {
        expect(() => {
            ThirdPartyRelationshipAttributeQuery.from({
                key: "test",
                owner: "",
                thirdParty: thirdParty
            });
        }).toThrow(/(Value is not)|(may not be empty)/);
    });

    test.each([
        { in: "test", out: ["test"] },
        { in: ["test"], out: ["test"] }
    ])(
        "(de-)serialize ThirdPartyRelationshipAttributeQuery as a property with %j as thirdParty",

        function (params) {
            const test = TestTypeContainingThirdPartyRelationshipAttributeQueryTest.from({
                query: {
                    "@type": "ThirdPartyRelationshipAttributeQuery",
                    key: "test",
                    owner: "thirdParty",

                    // casting as any to test backwards compatibility
                    thirdParty: params.in as unknown as any
                }
            });

            const json = test.toJSON();
            expect(json.query).toStrictEqual({
                key: "test",
                owner: "thirdParty",
                thirdParty: params.out
            });
        }
    );
});
