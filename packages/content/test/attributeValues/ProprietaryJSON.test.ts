import { ProprietaryJSON } from "../../src";

describe("ProprietaryJSON", function () {
    test.each([
        {},
        [],
        [1, 2, 3],
        ["1", "2", "3"],
        [1, "2", null, { a: 1 }],
        1,
        "a-string",
        {
            string: "b",
            number: 1,
            null: null,
            boolean: true,
            array: [1, 2, 3],
            object: {
                aKey: "aValue"
            }
        }
    ])(
        "(de-)serialize %j",

        function (value: any) {
            const prop = ProprietaryJSON.from({ title: "a-title", value });
            const json = prop.toJSON();

            expect(json.value).toStrictEqual(value);
        }
    );
});
