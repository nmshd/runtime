import { FormFieldRequestItem, FormFieldSettings, StringFormFieldSettings } from "../../../src";

describe("creation of FormFieldRequestItem", () => {
    test("should create a FormFieldRequestItem with a StringFormFieldSettings", () => {
        const item = FormFieldRequestItem.from({
            title: "aTitle",
            mustBeAccepted: false,
            settings: StringFormFieldSettings.from({}).toJSON()
        });

        expect(item).toBeInstanceOf(FormFieldRequestItem);
        expect(item.settings).toBeInstanceOf(FormFieldSettings);
        expect(item.settings).toBeInstanceOf(StringFormFieldSettings);
    });
});
