import { FormFieldAcceptResponseItem, ResponseItemResult } from "../../../src";

describe("creation of FormFieldAcceptResponseItem", () => {
    test("should create a FormFieldAcceptResponseItem with a string", () => {
        const item = FormFieldAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            response: "aString"
        });

        expect(item).toBeInstanceOf(FormFieldAcceptResponseItem);
        expect(item.response).toBe("aString");
    });

    test("should create a FormFieldAcceptResponseItem with a string array", () => {
        const item = FormFieldAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            response: ["aString"]
        });

        expect(item).toBeInstanceOf(FormFieldAcceptResponseItem);
        expect(item.response).toStrictEqual(["aString"]);
    });

    test("should throw when trying to create a FormFieldAcceptResponseItem with an array that not only contains strings", () => {
        expect(() =>
            FormFieldAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                response: ["aString", 1, true] as any
            })
        ).toThrow("If the response is an array, it must be a string array");
    });

    test("should throw when trying to create a FormFieldAcceptResponseItem with an object", () => {
        expect(() =>
            FormFieldAcceptResponseItem.from({
                result: ResponseItemResult.Accepted,
                response: {} as any
            })
        ).toThrow("Value is not an allowed type.");
    });
});
