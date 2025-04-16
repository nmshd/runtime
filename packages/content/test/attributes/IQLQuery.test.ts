import { AttributeValues, IQLQuery, IQLQueryCreationHintsJSON } from "../../src";

describe("IQLQuery", function () {
    const validIqlQueries = ["#test", "LanguageCertificate && #language:de"];
    for (const q of validIqlQueries) {
        test(`can be created from valid query string '${q}'`, function () {
            const serializable = IQLQuery.from({
                queryString: q
            });
            expect(serializable).toBeInstanceOf(IQLQuery);
        });
    }

    test.each(["aRandomString", "$", "( foo "])("can't be created from invalid query string '%p'", function (q) {
        expect(() => {
            IQLQuery.from({
                queryString: q
            });
            // eslint-disable-next-line jest/require-to-throw-message
        }).toThrow();
    });

    test("can be created with creation hints", function () {
        const hint: IQLQueryCreationHintsJSON = {
            valueType: "ZipCode"
        };

        const serializable = IQLQuery.from({
            queryString: validIqlQueries[0],
            attributeCreationHints: hint
        });

        expect(serializable).toBeInstanceOf(IQLQuery);
        expect(serializable.attributeCreationHints?.valueType).toBe(hint.valueType);
    });

    test("can be created with creation hints that include tags", function () {
        const hint: IQLQueryCreationHintsJSON = {
            valueType: "GivenName",
            tags: ["x+%+tag1", "x+%+tag2"]
        };

        const serializable = IQLQuery.from({
            queryString: validIqlQueries[0],
            attributeCreationHints: hint
        });

        expect(serializable).toBeInstanceOf(IQLQuery);
        expect(serializable.attributeCreationHints?.valueType).toBe(hint.valueType);
        expect(serializable.attributeCreationHints?.tags).toStrictEqual(hint.tags!);
    });

    test("cannot be created with wrong creation hints", function () {
        const hint = {
            valueType: "GivenNameABC" as AttributeValues.Identity.TypeName,
            tags: []
        };

        expect(() => {
            IQLQuery.from({
                queryString: validIqlQueries[0],
                attributeCreationHints: hint
            });
        }).toThrow("IQLQueryCreationHints.valueType:String :: must be one of:");
    });
});
