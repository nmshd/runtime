import { FormFieldRequestItem, FormFieldSettings, StringFormFieldSettings } from "../../../src";

describe("creation of FormFieldRequestItem", () => {
    test("should create a FormFieldRequestItem with a StringFormFieldSettings JSON", () => {
        const item = FormFieldRequestItem.from({
            title: "aTitle",
            mustBeAccepted: false,
            settings: StringFormFieldSettings.from({}).toJSON()
        });

        expect(item).toBeInstanceOf(FormFieldRequestItem);
        expect(item.settings).toBeInstanceOf(FormFieldSettings);
        expect(item.settings).toBeInstanceOf(StringFormFieldSettings);
    });

    test("should create a FormFieldRequestItem with a StringFormFieldSettings object", () => {
        const item = FormFieldRequestItem.from({
            title: "aTitle",
            mustBeAccepted: false,
            settings: StringFormFieldSettings.from({})
        });

        expect(item).toBeInstanceOf(FormFieldRequestItem);
        expect(item.settings).toBeInstanceOf(FormFieldSettings);
        expect(item.settings).toBeInstanceOf(StringFormFieldSettings);
    });
});
