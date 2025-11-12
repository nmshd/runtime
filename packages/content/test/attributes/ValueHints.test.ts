import { type } from "@js-soft/ts-serval";
import { AbstractLengthMeasurement, CommunicationLanguage, Nationality, StreetAddress, ValueHints, ValueHintsJSON, ValueHintsValue } from "@nmshd/content";
import { expectThrows } from "../testUtils.js";

@type("TestLengthMeasurement")
class TestLenghtMeasurement extends AbstractLengthMeasurement {}

describe("ValueHints", function () {
    test("serialize and deserialize filled ValueHints", function () {
        const valueHintsJSON: ValueHintsJSON = {
            "@type": "ValueHints",
            editHelp: "This is a help",
            min: 0,
            max: 1000,
            pattern: "/abc/i",
            values: [
                {
                    key: 0,
                    displayName: "Min"
                },
                {
                    key: 1000,
                    displayName: "Max"
                }
            ],
            defaultValue: 5
        };
        const valueHints = ValueHints.from(valueHintsJSON);
        expect(valueHints).toBeInstanceOf(ValueHints);
        expect(valueHints.toJSON()).toStrictEqual({ ...valueHintsJSON, propertyHints: {} });
    });

    test("serialize and deserialize filled ValueHints (int)", function () {
        const valueHintsJSON: ValueHintsJSON = {
            "@type": "ValueHints",
            editHelp: "This is a help",
            min: 0,
            max: 1000,
            pattern: "/abc/i",
            values: [
                {
                    key: 0,
                    displayName: "Min"
                },
                {
                    key: 1000,
                    displayName: "Max"
                }
            ],
            defaultValue: 5
        };
        const valueHints = ValueHints.from(valueHintsJSON);
        expect(valueHints).toBeInstanceOf(ValueHints);
        expect(valueHints.toJSON()).toStrictEqual({ ...valueHintsJSON, propertyHints: {} });
    });

    test("gets languages out of Language", function () {
        const valueHints = CommunicationLanguage.valueHints;
        expect(valueHints).toBeInstanceOf(ValueHints);

        expect(valueHints.values).toBeDefined();
        expect(valueHints.values!).toBeInstanceOf(Array);
        expect(valueHints.values!).toHaveLength(183);
        expect(valueHints.values![31].key).toBe("de");
        expect(valueHints.values![31].displayName).toBe("i18n://attributes.values.languages.de");
    });

    test("gets countries out of Country", function () {
        const valueHints = Nationality.valueHints;
        expect(valueHints).toBeInstanceOf(ValueHints);

        expect(valueHints.values).toBeDefined();
        expect(valueHints.values!).toBeInstanceOf(Array);
        expect(valueHints.values!).toHaveLength(249);
        expect(valueHints.values![61].key).toBe("DE");
        expect(valueHints.values![61].displayName).toBe("i18n://attributes.values.countries.DE");
    });

    test("deserializing a ValueHint with a defaultValue with the wrong type (object) fails", function () {
        expectThrows(
            () =>
                ValueHints.fromAny({
                    defaultValue: {}
                }),
            ".*Value is not an allowed type"
        );
    });

    test("deserializing a ValueHint with a defaultValue with the wrong type (array) fails", function () {
        expectThrows(
            () =>
                ValueHints.fromAny({
                    defaultValue: []
                }),
            ".*Value is not an allowed type"
        );
    });

    test("deserializing a ValueHintValue with a key with the wrong type (object) fails", function () {
        expectThrows(
            () =>
                ValueHintsValue.fromAny({
                    key: {},
                    displayName: "aDisplayName"
                }),
            ".*Value is not an allowed type"
        );
    });

    test("deserializing a ValueHintValue with a key with the wrong type (array) fails", function () {
        expectThrows(
            () =>
                ValueHintsValue.fromAny({
                    key: [],
                    displayName: "aDisplayName"
                }),
            ".*Value is not an allowed type"
        );
    });

    test("returns propertyHints in case of complex attributes", function () {
        const valueHints = StreetAddress.valueHints;

        expect(Object.keys(valueHints.propertyHints)).toHaveLength(7);
    });

    test("TestLengthMeasurement ValueHints", function () {
        const valueHints = TestLenghtMeasurement.valueHints;

        expect(Object.keys(valueHints.propertyHints)).toHaveLength(2);
        expect(valueHints.propertyHints.unit.values).toHaveLength(12);
    });
});
