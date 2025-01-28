import { ParsingError, Serializable } from "@js-soft/ts-serval";
import { Consent } from "../../src";

const errorMessageA =
    "Value does not match regular expression /^( |'|[,-.]|[A-Z]|[`-z]|~|¨|´|·|[À-Ö]|[Ø-ö]|[ø-ž]|[Ƈ-ƈ]|Ə|Ɨ|[Ơ-ơ]|[Ư-ư]|Ʒ|[Ǎ-ǜ]|[Ǟ-ǟ]|[Ǣ-ǰ]|[Ǵ-ǵ]|[Ǹ-ǿ]|[Ȓ-ȓ]|[Ș-ț]|[Ȟ-ȟ]|[ȧ-ȳ]|ə|ɨ|ʒ|[ʹ-ʺ]|[ʾ-ʿ]|ˈ|ˌ|[Ḃ-ḃ]|[Ḇ-ḇ]|[Ḋ-ḑ]|ḗ|[Ḝ-ḫ]|[ḯ-ḷ]|[Ḻ-ḻ]|[Ṁ-ṉ]|[Ṓ-ṛ]|[Ṟ-ṣ]|[Ṫ-ṯ]|[Ẁ-ẇ]|[Ẍ-ẗ]|ẞ|[Ạ-ỹ]|’|‡|A̋|C(̀|̄|̆|̈|̕|̣|̦|̨̆)|D̂|F(̀|̄)|G̀|H(̄|̦|̱)|J(́|̌)|K(̀|̂|̄|̇|̕|̛|̦|͟H|͟h)|L(̂|̥|̥̄|̦)|M(̀|̂|̆|̐)|N(̂|̄|̆|̦)|P(̀|̄|̕|̣)|R(̆|̥|̥̄)|S(̀|̄|̛̄|̱)|T(̀|̄|̈|̕|̛)|U̇|Z(̀|̄|̆|̈|̧)|a̋|c(̀|̄|̆|̈|̕|̣|̦|̨̆)|d̂|f(̀|̄)|g̀|h(̄|̦)|j́|k(̀|̂|̄|̇|̕|̛|̦|͟h)|l(̂|̥|̥̄|̦)|m(̀|̂|̆|̐)|n(̂|̄|̆|̦)|p(̀|̄|̕|̣)|r(̆|̥|̥̄)|s(̀|̄|̛̄|̱)|t(̀|̄|̕|̛)|u̇|z(̀|̄|̆|̈|̧)|Ç̆|Û̄|ç̆|û̄|ÿ́|Č(̕|̣)|č(̕|̣)|ē̍|Ī́|ī́|ō̍|Ž(̦|̧)|ž(̦|̧)|Ḳ̄|ḳ̄|Ṣ̄|ṣ̄|Ṭ̄|ṭ̄|Ạ̈|ạ̈|Ọ̈|ọ̈|Ụ(̄|̈)|ụ(̄|̈))*$/";
const errorMessageB =
    "Value does not match regular expression /^([ -~]|[¡-£]|¥|[§-¬]|[®-·]|[¹-»]|[¿-ž]|[Ƈ-ƈ]|Ə|Ɨ|[Ơ-ơ]|[Ư-ư]|Ʒ|[Ǎ-ǜ]|[Ǟ-ǟ]|[Ǣ-ǰ]|[Ǵ-ǵ]|[Ǹ-ǿ]|[Ȓ-ȓ]|[Ș-ț]|[Ȟ-ȟ]|[ȧ-ȳ]|ə|ɨ|ʒ|[ʹ-ʺ]|[ʾ-ʿ]|ˈ|ˌ|[Ḃ-ḃ]|[Ḇ-ḇ]|[Ḋ-ḑ]|ḗ|[Ḝ-ḫ]|[ḯ-ḷ]|[Ḻ-ḻ]|[Ṁ-ṉ]|[Ṓ-ṛ]|[Ṟ-ṣ]|[Ṫ-ṯ]|[Ẁ-ẇ]|[Ẍ-ẗ]|ẞ|[Ạ-ỹ]|’|‡|€|A̋|C(̀|̄|̆|̈|̕|̣|̦|̨̆)|D̂|F(̀|̄)|G̀|H(̄|̦|̱)|J(́|̌)|K(̀|̂|̄|̇|̕|̛|̦|͟H|͟h)|L(̂|̥|̥̄|̦)|M(̀|̂|̆|̐)|N(̂|̄|̆|̦)|P(̀|̄|̕|̣)|R(̆|̥|̥̄)|S(̀|̄|̛̄|̱)|T(̀|̄|̈|̕|̛)|U̇|Z(̀|̄|̆|̈|̧)|a̋|c(̀|̄|̆|̈|̕|̣|̦|̨̆)|d̂|f(̀|̄)|g̀|h(̄|̦)|j́|k(̀|̂|̄|̇|̕|̛|̦|͟h)|l(̂|̥|̥̄|̦)|m(̀|̂|̆|̐)|n(̂|̄|̆|̦)|p(̀|̄|̕|̣)|r(̆|̥|̥̄)|s(̀|̄|̛̄|̱)|t(̀|̄|̕|̛)|u̇|z(̀|̄|̆|̈|̧)|Ç̆|Û̄|ç̆|û̄|ÿ́|Č(̕|̣)|č(̕|̣)|ē̍|Ī́|ī́|ō̍|Ž(̦|̧)|ž(̦|̧)|Ḳ̄|ḳ̄|Ṣ̄|ṣ̄|Ṭ̄|ṭ̄|Ạ̈|ạ̈|Ọ̈|ọ̈|Ụ(̄|̈)|ụ(̄|̈))*$/";
const errorMessageC =
    "Value does not match regular expression /^([\\u0009-\\u000A]|\\u000D|[ -~]|[ -¬]|[®-ž]|[Ƈ-ƈ]|Ə|Ɨ|[Ơ-ơ]|[Ư-ư]|Ʒ|[Ǎ-ǜ]|[Ǟ-ǟ]|[Ǣ-ǰ]|[Ǵ-ǵ]|[Ǹ-ǿ]|[Ȓ-ȓ]|[Ș-ț]|[Ȟ-ȟ]|[ȧ-ȳ]|ə|ɨ|ʒ|[ʹ-ʺ]|[ʾ-ʿ]|ˈ|ˌ|[Ḃ-ḃ]|[Ḇ-ḇ]|[Ḋ-ḑ]|ḗ|[Ḝ-ḫ]|[ḯ-ḷ]|[Ḻ-ḻ]|[Ṁ-ṉ]|[Ṓ-ṛ]|[Ṟ-ṣ]|[Ṫ-ṯ]|[Ẁ-ẇ]|[Ẍ-ẗ]|ẞ|[Ạ-ỹ]|’|‡|€|A̋|C(̀|̄|̆|̈|̕|̣|̦|̨̆)|D̂|F(̀|̄)|G̀|H(̄|̦|̱)|J(́|̌)|K(̀|̂|̄|̇|̕|̛|̦|͟H|͟h)|L(̂|̥|̥̄|̦)|M(̀|̂|̆|̐)|N(̂|̄|̆|̦)|P(̀|̄|̕|̣)|R(̆|̥|̥̄)|S(̀|̄|̛̄|̱)|T(̀|̄|̈|̕|̛)|U̇|Z(̀|̄|̆|̈|̧)|a̋|c(̀|̄|̆|̈|̕|̣|̦|̨̆)|d̂|f(̀|̄)|g̀|h(̄|̦)|j́|k(̀|̂|̄|̇|̕|̛|̦|͟h)|l(̂|̥|̥̄|̦)|m(̀|̂|̆|̐)|n(̂|̄|̆|̦)|p(̀|̄|̕|̣)|r(̆|̥|̥̄)|s(̀|̄|̛̄|̱)|t(̀|̄|̕|̛)|u̇|z(̀|̄|̆|̈|̧)|Ç̆|Û̄|ç̆|û̄|ÿ́|Č(̕|̣)|č(̕|̣)|ē̍|Ī́|ī́|ō̍|Ž(̦|̧)|ž(̦|̧)|Ḳ̄|ḳ̄|Ṣ̄|ṣ̄|Ṭ̄|ṭ̄|Ạ̈|ạ̈|Ọ̈|ọ̈|Ụ(̄|̈)|ụ(̄|̈))*$/";

describe("Test Attributes", () => {
    test("Consent is considered as valid", () => {
        const consent = Consent.from({ consent: "\u000D" });
        expect(consent.consent.toString()).toBe("\u000D");
    });

    test("Consent is considered as invalid", () => {
        const invalidCall = () => {
            Consent.from({
                consent: "\u0012"
            });
        };
        expect(invalidCall).toThrow(new ParsingError("Consent", "consent", errorMessageC));
    });

    const regularIdentityAttributeTypesA = ["BirthName", "GivenName", "HonorificPrefix", "HonorificSuffix", "MiddleName", "Pseudonym", "Surname"];
    const regularIdentityAttributeTypesB = ["City", "HouseNumber", "State", "Street", "ZipCode", "AffiliationOrganization", "DisplayName", "JobTitle"];
    const regularIdentityAttributeTypesC = ["AffiliationRole", "AffiliationUnit", "StatementPredicate"];

    const testMapping = regularIdentityAttributeTypesA
        .map((x) => ({ type: x, testValue: "Gräf", wrongTestValue: "€", errorMessage: errorMessageA }))
        .concat(regularIdentityAttributeTypesB.map((x) => ({ type: x, testValue: "€", wrongTestValue: "z-\u000D", errorMessage: errorMessageB })))
        .concat(regularIdentityAttributeTypesC.map((x) => ({ type: x, testValue: "z-\u000D", wrongTestValue: "\u0012", errorMessage: errorMessageC })));

    test.each(testMapping)("$testValue is considered as valid for type $type", ({ type, testValue }) => {
        const attribute = Serializable.fromUnknown({ "@type": type, value: testValue });
        expect((attribute as any).value).toBe(testValue);
    });

    test.each(testMapping)("$wrongTestValue is considered as invalid for type $type", ({ type, wrongTestValue, errorMessage }) => {
        const invalidCall = () => Serializable.fromUnknown({ "@type": type, value: wrongTestValue });
        expect(invalidCall).toThrow(new ParsingError(type, "value", errorMessage));
    });

    const regularRelationshipAttributeTypesC = [
        { type: "ProprietaryString", errorProperty: "value" },
        { type: "ProprietaryJSON", errorProperty: "value:Object" },
        { type: "ProprietaryXML", errorProperty: "value" }
    ];

    test.each(regularRelationshipAttributeTypesC)("is considered as valid for type $type", ({ type }) => {
        const attribute = Serializable.fromUnknown({ "@type": type, value: "z-\u000D", title: "aTitle" });
        expect((attribute as any).value).toBe("z-\u000D");
    });

    test.each(regularRelationshipAttributeTypesC)("is considered as invalid for type $type", ({ type, errorProperty }) => {
        const invalidCall = () => {
            Serializable.fromUnknown({ "@type": type, value: "z-\u0012", title: "aTitle" });
        };
        expect(invalidCall).toThrow(new ParsingError(type, errorProperty, errorMessageC));
    });

    const proprietaryAttributeTypes = [
        { type: "ProprietaryBoolean", value: true },
        { type: "ProprietaryCountry", value: "DE" },
        { type: "ProprietaryEMailAddress", value: "email@email.de" },
        { type: "ProprietaryFileReference", value: "FIL123456789012345678901234567" },
        { type: "ProprietaryFloat", value: 1 },
        { type: "ProprietaryHEXColor", value: "#000000" },
        { type: "ProprietaryInteger", value: 1 },
        { type: "ProprietaryLanguage", value: "de" },
        { type: "ProprietaryPhoneNumber", value: "1234567890" },
        { type: "ProprietaryString", value: "aString" },
        { type: "ProprietaryURL", value: "mail.de" },
        { type: "ProprietaryJSON", value: "aString" },
        { type: "ProprietaryXML", value: "aString" }
    ];

    test.each(proprietaryAttributeTypes)("title is considered as valid for type $type", ({ type, value }) => {
        const attribute = Serializable.fromUnknown({ "@type": type, value, title: "\u000D" });
        expect((attribute as any).title).toBe("\u000D");
    });

    test.each(proprietaryAttributeTypes)("title is considered as invalid for type $type", ({ type, value }) => {
        const invalidCall = () => {
            Serializable.fromUnknown({ "@type": type, value, title: "\u0012" });
        };
        expect(invalidCall).toThrow(new ParsingError(type, "title", errorMessageC));
    });

    test.each(proprietaryAttributeTypes)("description is considered as valid for type $type", ({ type, value }) => {
        const attribute = Serializable.fromUnknown({ "@type": type, value, title: "aTitle", description: "\u000D" });
        expect((attribute as any).description).toBe("\u000D");
    });

    test.each(proprietaryAttributeTypes)("description is considered as invalid for type $type", ({ type, value }) => {
        const invalidCall = () => {
            Serializable.fromUnknown({ "@type": type, value, title: "aTitle", description: "\u0012" });
        };
        expect(invalidCall).toThrow(new ParsingError(type, "description", errorMessageC));
    });
});
