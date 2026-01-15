import { ParsingError } from "@js-soft/ts-serval";
import { SocialInsuranceNumber } from "../../src";

describe("Test valid SocialInsuranceNumbers", () => {
    const validSocialInsuranceNumbers = ["123456789", "VALIDNUMBER", "VALIDNUMBER123456789"];

    test.each(validSocialInsuranceNumbers)("SocialInsuranceNumber %s is recognized as valid", (number) => {
        const validSocialInsuranceNumber = SocialInsuranceNumber.from({ value: number });
        expect(validSocialInsuranceNumber.value.toString()).toBe(number);
    });
});

describe("Test invalid SocialInsuranceNumbers", () => {
    const invalidSocialInsuranceNumbers = ["lowercaseinvalidnumber", "INVALIDNUMBER_WITHSPECIALCHAR$"];

    test.each(invalidSocialInsuranceNumbers)("SocialInsuranceNumber %s is recognized as invalid", (number) => {
        const invalidSocialInsuranceNumberCall = () => {
            SocialInsuranceNumber.from({
                value: number
            });
        };
        expect(invalidSocialInsuranceNumberCall).toThrow(
            new ParsingError(
                "SocialInsuranceNumber",
                "value",
                "Value does not match regular expression /^[A-Z0-9]+$/"
            )
        );
    });

    test("returns an error when trying to create an Attribute Value Type SocialInsuranceNumber which is empty", function () {
        const invalidSocialInsuranceNumberCall = () => {
            SocialInsuranceNumber.from({
                value: ""
            });
        };
        expect(invalidSocialInsuranceNumberCall).toThrow(new ParsingError("SocialInsuranceNumber", "value", "Value is shorter than 4 characters"));
    });

    test("returns an error when trying to create an Attribute Value Type SocialInsuranceNumber which is too long", function () {
        const invalidSocialInsuranceNumberCall = () => {
            SocialInsuranceNumber.from({
                value: "INVALIDNUMBERWITHTOOMANYCHARACTERS"
            });
        };
        expect(invalidSocialInsuranceNumberCall).toThrow(new ParsingError("SocialInsuranceNumber", "value", "Value is longer than 32 characters"));
    });
});
