import { BirthMonth, ProprietaryInteger, RenderHintsEditType, RenderHintsTechnicalType } from "@nmshd/content";

describe("ValueHints Inheritance", function () {
    describe("Identity Attributes", function () {
        test("read from instance", function () {
            const month = BirthMonth.fromAny({ value: 5 });
            expect(month.valueHints.min).toBe(1);
            expect(month.valueHints.max).toBe(12);

            expect(month.valueHints.editHelp).toMatch(/i18n.*/);
        });

        test("read static", function () {
            expect(BirthMonth.valueHints.min).toBe(1);
            expect(BirthMonth.valueHints.max).toBe(12);

            expect(BirthMonth.valueHints.editHelp).toMatch(/i18n.*/);
        });
    });

    describe("Proprietary Attrtibutes", function () {
        test("override", function () {
            const integer = ProprietaryInteger.from({
                value: 5,
                valueHintsOverride: { min: 1, max: 2 },
                title: "testInteger"
            });
            expect(integer.valueHints.min).toBe(1);
            expect(integer.valueHints.max).toBe(2);
        });
    });
});

describe("RenderHints Inheritance", function () {
    describe("Identity Attributes", function () {
        test("read from instance", function () {
            const month = BirthMonth.fromAny({ value: 5 });
            expect(month.renderHints.technicalType).toBe(RenderHintsTechnicalType.Integer);
            expect(month.renderHints.editType).toBe(RenderHintsEditType.SelectLike);
        });

        test("read static", function () {
            expect(BirthMonth.renderHints.technicalType).toBe(RenderHintsTechnicalType.Integer);
            expect(BirthMonth.renderHints.editType).toBe(RenderHintsEditType.SelectLike);
        });
    });

    describe("Proprietary Attrtibutes", function () {
        test("read from instance", function () {
            const integer = ProprietaryInteger.from({ value: 5, title: "testInteger" });
            expect(integer.renderHints.technicalType).toBe(RenderHintsTechnicalType.Integer);
            expect(integer.renderHints.editType).toBe(RenderHintsEditType.ButtonLike);
        });

        test("override", function () {
            const integer = ProprietaryInteger.from({
                value: 5,
                valueHintsOverride: { min: 1, max: 2 },
                title: "testInteger"
            });
            expect(integer.renderHints.technicalType).toBe(RenderHintsTechnicalType.Integer);
            expect(integer.renderHints.editType).toBe(RenderHintsEditType.ButtonLike);
        });
    });
});
