import { IdentityAttributeQuery } from "@nmshd/content";

describe("IdentityAttributeQuery", function () {
    test("should allow to create a new query", function () {
        const attributeQuery = IdentityAttributeQuery.from({
            valueType: "StreetAddress",
            tags: ["x:Delivery"]
        });
        expect(attributeQuery).toBeInstanceOf(IdentityAttributeQuery);

        const attributeQueryType = IdentityAttributeQuery.from({
            valueType: "StreetAddress"
        });
        expect(attributeQueryType).toBeInstanceOf(IdentityAttributeQuery);

        const attributeQueryTags = IdentityAttributeQuery.from({
            valueType: "StreetAddress",
            tags: ["x:Delivery"]
        });
        expect(attributeQueryTags).toBeInstanceOf(IdentityAttributeQuery);
    });

    test.each(["", "non-existing-value-type"])("should validate valueType ('%s' should be invalid)", function (invalidValueType) {
        expect(() =>
            IdentityAttributeQuery.from({
                // @ts-expect-error
                valueType: invalidValueType
            })
        ).toThrow("IdentityAttributeQuery.valueType:String :: must be one of:");
    });
});
