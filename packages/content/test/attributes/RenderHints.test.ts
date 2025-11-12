import { RenderHints, StreetAddress } from "@nmshd/content";

describe("RenderHints", function () {
    test("returns propertyHints in case of complex attributes", function () {
        const renderHints = StreetAddress.renderHints;

        expect(Object.keys(renderHints.propertyHints)).toHaveLength(7);
    });

    test("correctly serializes complex renderHints", function () {
        const renderHintsJson = StreetAddress.renderHints.toJSON();
        const renderHints = RenderHints.from(renderHintsJson);

        expect(Object.keys(renderHints.propertyHints)).toHaveLength(7);
        expect(renderHints.propertyHints.street).toBeInstanceOf(RenderHints);
    });
});
