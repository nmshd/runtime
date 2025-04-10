import { FormFieldAcceptResponseItem } from "../../../src";

describe("creation of FormFieldAcceptResponseItem", () => {
    test("should create a FormFieldAcceptResponseItem with a string", () => {
        const item = FormFieldAcceptResponseItem.from({
            result: "Accepted",
            response: "aResponse"
        });

        expect(item).toBeInstanceOf(FormFieldAcceptResponseItem);
        expect(item.response).toBe("aResponse");
    });

    test("should create a FormFieldAcceptResponseItem with a string array", () => {
        const item = FormFieldAcceptResponseItem.from({
            result: "Accepted",
            response: ["aResponse"]
        });

        expect(item).toBeInstanceOf(FormFieldAcceptResponseItem);
        expect(item.response).toStrictEqual(["aResponse"]);
    });

    test("should throw when trying to create a FormFieldAcceptResponseItem with an array with different things", () => {
        expect(() =>
            FormFieldAcceptResponseItem.from({
                result: "Accepted",
                response: ["aResponse", 1, true] as any
            })
        ).toThrow("is an array, it must be a string array");
    });

    test("should throw when trying to create a FormFieldAcceptResponseItem with an object", () => {
        expect(() =>
            FormFieldAcceptResponseItem.from({
                result: "Accepted",
                response: {} as any
            })
        ).toThrow("Value is not an allowed type");
    });
});
