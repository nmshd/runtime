import { FormFieldRequestItem, FormFieldSettings, IntegerFormFieldSettings, StringFormFieldSettings } from "../../../src";

describe("creation of FormFieldRequestItem", () => {
    test("should create a FormFieldRequestItem with a StringFormFieldSettings JSON", () => {
        const item = FormFieldRequestItem.from({
            title: "aFormField",
            mustBeAccepted: false,
            settings: StringFormFieldSettings.from({}).toJSON()
        });

        expect(item).toBeInstanceOf(FormFieldRequestItem);
        expect(item.settings).toBeInstanceOf(FormFieldSettings);
        expect(item.settings).toBeInstanceOf(StringFormFieldSettings);
    });

    test("should create a FormFieldRequestItem with a StringFormFieldSettings object", () => {
        const item = FormFieldRequestItem.from({
            title: "aFormField",
            mustBeAccepted: false,
            settings: StringFormFieldSettings.from({})
        });

        expect(item).toBeInstanceOf(FormFieldRequestItem);
        expect(item.settings).toBeInstanceOf(FormFieldSettings);
        expect(item.settings).toBeInstanceOf(StringFormFieldSettings);
    });

    test("should throw when trying to create a FormFieldRequestItem with a StringFormFieldSettings and a min which is not an integer", () => {
        const aMinWhichIsNotAnInteger = 0.9;

        expect(() =>
            FormFieldRequestItem.from({
                title: "aFormField",
                mustBeAccepted: false,
                settings: StringFormFieldSettings.from({ min: aMinWhichIsNotAnInteger })
            })
        ).toThrow("This value must be an integer.");
    });

    test("should throw when trying to create a FormFieldRequestItem with a StringFormFieldSettings and a max which is not an integer", () => {
        const aMaxWhichIsNotAnInteger = 10.1;

        expect(() =>
            FormFieldRequestItem.from({
                title: "aFormField",
                mustBeAccepted: false,
                settings: StringFormFieldSettings.from({ max: aMaxWhichIsNotAnInteger })
            })
        ).toThrow("This value must be an integer.");
    });

    test("should throw when trying to create a FormFieldRequestItem with an IntegerFormFieldSettings and a min which is not an integer", () => {
        const aMinWhichIsNotAnInteger = 0.9;

        expect(() =>
            FormFieldRequestItem.from({
                title: "aFormField",
                mustBeAccepted: false,
                settings: IntegerFormFieldSettings.from({ min: aMinWhichIsNotAnInteger })
            })
        ).toThrow("This value must be an integer.");
    });

    test("should throw when trying to create a FormFieldRequestItem with an IntegerFormFieldSettings and a max which is not an integer", () => {
        const aMaxWhichIsNotAnInteger = 10.1;

        expect(() =>
            FormFieldRequestItem.from({
                title: "aFormField",
                mustBeAccepted: false,
                settings: IntegerFormFieldSettings.from({ max: aMaxWhichIsNotAnInteger })
            })
        ).toThrow("This value must be an integer.");
    });
});
