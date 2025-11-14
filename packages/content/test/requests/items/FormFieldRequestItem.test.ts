import { FormFieldRequestItem, FormFieldSettings, IntegerFormFieldSettings, RatingFormFieldSettings, SelectionFormFieldSettings, StringFormFieldSettings } from "@nmshd/content";

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

    test("should throw when trying to create a FormFieldRequestItem with StringFormFieldSettings and a min which is not an integer", () => {
        const aMinWhichIsNotAnInteger = 0.9;

        expect(() =>
            FormFieldRequestItem.from({
                title: "aFormField",
                mustBeAccepted: false,
                settings: StringFormFieldSettings.from({ min: aMinWhichIsNotAnInteger })
            })
        ).toThrow("This value must be an integer.");
    });

    test("should throw when trying to create a FormFieldRequestItem with StringFormFieldSettings and a max which is not an integer", () => {
        const aMaxWhichIsNotAnInteger = 10.1;

        expect(() =>
            FormFieldRequestItem.from({
                title: "aFormField",
                mustBeAccepted: false,
                settings: StringFormFieldSettings.from({ max: aMaxWhichIsNotAnInteger })
            })
        ).toThrow("This value must be an integer.");
    });

    test("should throw when trying to create a FormFieldRequestItem with IntegerFormFieldSettings and a min which is not an integer", () => {
        const aMinWhichIsNotAnInteger = 0.9;

        expect(() =>
            FormFieldRequestItem.from({
                title: "aFormField",
                mustBeAccepted: false,
                settings: IntegerFormFieldSettings.from({ min: aMinWhichIsNotAnInteger })
            })
        ).toThrow("This value must be an integer.");
    });

    test("should throw when trying to create a FormFieldRequestItem with IntegerFormFieldSettings and a max which is not an integer", () => {
        const aMaxWhichIsNotAnInteger = 10.1;

        expect(() =>
            FormFieldRequestItem.from({
                title: "aFormField",
                mustBeAccepted: false,
                settings: IntegerFormFieldSettings.from({ max: aMaxWhichIsNotAnInteger })
            })
        ).toThrow("This value must be an integer.");
    });

    test("should throw when trying to create a FormFieldRequestItem with RatingFormFieldSettings and a maxRating which is not an integer", () => {
        const aRatingWhichIsNotAnInteger = 5.5;

        expect(() =>
            FormFieldRequestItem.from({
                title: "aFormField",
                mustBeAccepted: false,
                settings: RatingFormFieldSettings.from({ maxRating: aRatingWhichIsNotAnInteger as any })
            })
        ).toThrow("This value must be an integer.");
    });

    test("should throw when trying to create a FormFieldRequestItem with SelectionFormFieldSettings and an option too long", () => {
        const aStringTooLong = "x".repeat(4097);

        expect(() =>
            FormFieldRequestItem.from({
                title: "aFormField",
                mustBeAccepted: false,
                settings: SelectionFormFieldSettings.from({ options: [aStringTooLong] })
            })
        ).toThrow("An option cannot be shorter than 1 character or longer than 4096 characters.");
    });

    test("should throw when trying to create a FormFieldRequestItem with SelectionFormFieldSettings and an option too short", () => {
        const aStringTooShort = "";

        expect(() =>
            FormFieldRequestItem.from({
                title: "aFormField",
                mustBeAccepted: false,
                settings: SelectionFormFieldSettings.from({ options: [aStringTooShort] })
            })
        ).toThrow("An option cannot be shorter than 1 character or longer than 4096 characters.");
    });
});
