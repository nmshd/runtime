import { longText } from "./proxy";

jest.mock("./original", () => {
    return {
        text: "other text"
    };
});

test("Test", () => {
    expect(longText).toBe("The other text");
});
