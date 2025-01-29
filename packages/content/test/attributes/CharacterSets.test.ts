import { ParsingError, Serializable } from "@js-soft/ts-serval";
import {
    Consent,
    DeliveryBoxAddress,
    IDeliveryBoxAddress,
    IPostOfficeBoxAddress,
    PostOfficeBoxAddress,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    RelationshipAttributeQuery,
    ThirdPartyRelationshipAttributeQuery,
    ValueHintsValue
} from "../../src";
import { characterSets } from "../../src/attributes/constants/CharacterSets";

const errorMessageA =
    "Value does not match regular expression /^( |'|[,-.]|[A-Z]|[`-z]|~|¨|´|·|[À-Ö]|[Ø-ö]|[ø-ž]|[Ƈ-ƈ]|Ə|Ɨ|[Ơ-ơ]|[Ư-ư]|Ʒ|[Ǎ-ǜ]|[Ǟ-ǟ]|[Ǣ-ǰ]|[Ǵ-ǵ]|[Ǹ-ǿ]|[Ȓ-ȓ]|[Ș-ț]|[Ȟ-ȟ]|[ȧ-ȳ]|ə|ɨ|ʒ|[ʹ-ʺ]|[ʾ-ʿ]|ˈ|ˌ|[Ḃ-ḃ]|[Ḇ-ḇ]|[Ḋ-ḑ]|ḗ|[Ḝ-ḫ]|[ḯ-ḷ]|[Ḻ-ḻ]|[Ṁ-ṉ]|[Ṓ-ṛ]|[Ṟ-ṣ]|[Ṫ-ṯ]|[Ẁ-ẇ]|[Ẍ-ẗ]|ẞ|[Ạ-ỹ]|’|‡|A̋|C(̀|̄|̆|̈|̕|̣|̦|̨̆)|D̂|F(̀|̄)|G̀|H(̄|̦|̱)|J(́|̌)|K(̀|̂|̄|̇|̕|̛|̦|͟H|͟h)|L(̂|̥|̥̄|̦)|M(̀|̂|̆|̐)|N(̂|̄|̆|̦)|P(̀|̄|̕|̣)|R(̆|̥|̥̄)|S(̀|̄|̛̄|̱)|T(̀|̄|̈|̕|̛)|U̇|Z(̀|̄|̆|̈|̧)|a̋|c(̀|̄|̆|̈|̕|̣|̦|̨̆)|d̂|f(̀|̄)|g̀|h(̄|̦)|j́|k(̀|̂|̄|̇|̕|̛|̦|͟h)|l(̂|̥|̥̄|̦)|m(̀|̂|̆|̐)|n(̂|̄|̆|̦)|p(̀|̄|̕|̣)|r(̆|̥|̥̄)|s(̀|̄|̛̄|̱)|t(̀|̄|̕|̛)|u̇|z(̀|̄|̆|̈|̧)|Ç̆|Û̄|ç̆|û̄|ÿ́|Č(̕|̣)|č(̕|̣)|ē̍|Ī́|ī́|ō̍|Ž(̦|̧)|ž(̦|̧)|Ḳ̄|ḳ̄|Ṣ̄|ṣ̄|Ṭ̄|ṭ̄|Ạ̈|ạ̈|Ọ̈|ọ̈|Ụ(̄|̈)|ụ(̄|̈))*$/";
const errorMessageB =
    "Value does not match regular expression /^([ -~]|[¡-£]|¥|[§-¬]|[®-·]|[¹-»]|[¿-ž]|[Ƈ-ƈ]|Ə|Ɨ|[Ơ-ơ]|[Ư-ư]|Ʒ|[Ǎ-ǜ]|[Ǟ-ǟ]|[Ǣ-ǰ]|[Ǵ-ǵ]|[Ǹ-ǿ]|[Ȓ-ȓ]|[Ș-ț]|[Ȟ-ȟ]|[ȧ-ȳ]|ə|ɨ|ʒ|[ʹ-ʺ]|[ʾ-ʿ]|ˈ|ˌ|[Ḃ-ḃ]|[Ḇ-ḇ]|[Ḋ-ḑ]|ḗ|[Ḝ-ḫ]|[ḯ-ḷ]|[Ḻ-ḻ]|[Ṁ-ṉ]|[Ṓ-ṛ]|[Ṟ-ṣ]|[Ṫ-ṯ]|[Ẁ-ẇ]|[Ẍ-ẗ]|ẞ|[Ạ-ỹ]|’|‡|€|A̋|C(̀|̄|̆|̈|̕|̣|̦|̨̆)|D̂|F(̀|̄)|G̀|H(̄|̦|̱)|J(́|̌)|K(̀|̂|̄|̇|̕|̛|̦|͟H|͟h)|L(̂|̥|̥̄|̦)|M(̀|̂|̆|̐)|N(̂|̄|̆|̦)|P(̀|̄|̕|̣)|R(̆|̥|̥̄)|S(̀|̄|̛̄|̱)|T(̀|̄|̈|̕|̛)|U̇|Z(̀|̄|̆|̈|̧)|a̋|c(̀|̄|̆|̈|̕|̣|̦|̨̆)|d̂|f(̀|̄)|g̀|h(̄|̦)|j́|k(̀|̂|̄|̇|̕|̛|̦|͟h)|l(̂|̥|̥̄|̦)|m(̀|̂|̆|̐)|n(̂|̄|̆|̦)|p(̀|̄|̕|̣)|r(̆|̥|̥̄)|s(̀|̄|̛̄|̱)|t(̀|̄|̕|̛)|u̇|z(̀|̄|̆|̈|̧)|Ç̆|Û̄|ç̆|û̄|ÿ́|Č(̕|̣)|č(̕|̣)|ē̍|Ī́|ī́|ō̍|Ž(̦|̧)|ž(̦|̧)|Ḳ̄|ḳ̄|Ṣ̄|ṣ̄|Ṭ̄|ṭ̄|Ạ̈|ạ̈|Ọ̈|ọ̈|Ụ(̄|̈)|ụ(̄|̈))*$/";
const errorMessageC =
    "Value does not match regular expression /^([\\u0009-\\u000A]|\\u000D|[ -~]|[ -¬]|[®-ž]|[Ƈ-ƈ]|Ə|Ɨ|[Ơ-ơ]|[Ư-ư]|Ʒ|[Ǎ-ǜ]|[Ǟ-ǟ]|[Ǣ-ǰ]|[Ǵ-ǵ]|[Ǹ-ǿ]|[Ȓ-ȓ]|[Ș-ț]|[Ȟ-ȟ]|[ȧ-ȳ]|ə|ɨ|ʒ|[ʹ-ʺ]|[ʾ-ʿ]|ˈ|ˌ|[Ḃ-ḃ]|[Ḇ-ḇ]|[Ḋ-ḑ]|ḗ|[Ḝ-ḫ]|[ḯ-ḷ]|[Ḻ-ḻ]|[Ṁ-ṉ]|[Ṓ-ṛ]|[Ṟ-ṣ]|[Ṫ-ṯ]|[Ẁ-ẇ]|[Ẍ-ẗ]|ẞ|[Ạ-ỹ]|’|‡|€|A̋|C(̀|̄|̆|̈|̕|̣|̦|̨̆)|D̂|F(̀|̄)|G̀|H(̄|̦|̱)|J(́|̌)|K(̀|̂|̄|̇|̕|̛|̦|͟H|͟h)|L(̂|̥|̥̄|̦)|M(̀|̂|̆|̐)|N(̂|̄|̆|̦)|P(̀|̄|̕|̣)|R(̆|̥|̥̄)|S(̀|̄|̛̄|̱)|T(̀|̄|̈|̕|̛)|U̇|Z(̀|̄|̆|̈|̧)|a̋|c(̀|̄|̆|̈|̕|̣|̦|̨̆)|d̂|f(̀|̄)|g̀|h(̄|̦)|j́|k(̀|̂|̄|̇|̕|̛|̦|͟h)|l(̂|̥|̥̄|̦)|m(̀|̂|̆|̐)|n(̂|̄|̆|̦)|p(̀|̄|̕|̣)|r(̆|̥|̥̄)|s(̀|̄|̛̄|̱)|t(̀|̄|̕|̛)|u̇|z(̀|̄|̆|̈|̧)|Ç̆|Û̄|ç̆|û̄|ÿ́|Č(̕|̣)|č(̕|̣)|ē̍|Ī́|ī́|ō̍|Ž(̦|̧)|ž(̦|̧)|Ḳ̄|ḳ̄|Ṣ̄|ṣ̄|Ṭ̄|ṭ̄|Ạ̈|ạ̈|Ọ̈|ọ̈|Ụ(̄|̈)|ụ(̄|̈))*$/";

test("Consent is considered as valid", () => {
    const consent = Consent.from({ consent: "z-\u000D¾£()," });
    expect(consent.consent.toString()).toBe("z-\u000D¾£(),");
});

test("Consent is considered as invalid", () => {
    const invalidCall = () => {
        Consent.from({
            consent: "\u0012"
        });
    };
    expect(invalidCall).toThrow(new ParsingError("Consent", "consent", errorMessageC));
});

const correctDeliveryBoxAddress: IDeliveryBoxAddress = {
    city: "aCity",
    country: "DE",
    deliveryBoxId: "aBoxId~0",
    recipient: "aRecipient@7",
    userId: "aUserId<6",
    zipCode: "aZipCode"
};

test("DeliveryBoxAddress is considered as valid", () => {
    const deliveryBoxAddress = DeliveryBoxAddress.from(correctDeliveryBoxAddress);
    expect(deliveryBoxAddress.valueHints.propertyHints.deliveryBoxId.pattern).toBe(characterSets.din91379DatatypeB.toString().slice(1, -1).replaceAll("/", "\\/"));
    expect(deliveryBoxAddress.valueHints.propertyHints.recipient.pattern).toBe(characterSets.din91379DatatypeB.toString().slice(1, -1).replaceAll("/", "\\/"));
    expect(deliveryBoxAddress.valueHints.propertyHints.userId.pattern).toBe(characterSets.din91379DatatypeB.toString().slice(1, -1).replaceAll("/", "\\/"));
});

test.each(["recipient", "userId", "deliveryBoxId"])("%s of DeliveryBoxAddress is considered as invalid", (propertyName) => {
    const invalidCall = () => {
        DeliveryBoxAddress.from({
            ...correctDeliveryBoxAddress,
            [propertyName]: "invalidValue≥"
        });
    };

    expect(invalidCall).toThrow(new ParsingError("DeliveryBoxAddress", propertyName, errorMessageB));
});

const correctPostOfficeBoxAddress: IPostOfficeBoxAddress = {
    city: "aCity",
    country: "DE",
    boxId: "aBoxId#",
    recipient: "aRecipient_",
    zipCode: "aZipCode"
};

test("PostOfficeBoxAddress is considered as valid", () => {
    const postOfficeBoxAddress = PostOfficeBoxAddress.from(correctPostOfficeBoxAddress);
    expect(postOfficeBoxAddress.valueHints.propertyHints.boxId.pattern).toBe(characterSets.din91379DatatypeB.toString().slice(1, -1).replaceAll("/", "\\/"));
    expect(postOfficeBoxAddress.valueHints.propertyHints.recipient.pattern).toBe(characterSets.din91379DatatypeB.toString().slice(1, -1).replaceAll("/", "\\/"));
});

test.each(["boxId", "recipient"])("%s of PostOfficeBoxAddress is considered as invalid", (propertyName) => {
    const invalidCall = () => {
        PostOfficeBoxAddress.from({
            ...correctPostOfficeBoxAddress,
            [propertyName]: "invalidValue≤"
        });
    };
    expect(invalidCall).toThrow(new ParsingError("PostOfficeBoxAddress", propertyName, errorMessageB));
});

const restrictedIdentityAttributeTypesA = ["BirthName", "GivenName", "HonorificPrefix", "HonorificSuffix", "MiddleName", "Pseudonym", "Surname"];
const restrictedIdentityAttributeTypesB = ["City", "HouseNumber", "State", "Street", "ZipCode", "AffiliationOrganization", "DisplayName", "JobTitle"];
const restrictedIdentityAttributeTypesC = ["AffiliationRole", "AffiliationUnit", "StatementPredicate"];

const identityAttributeTestParameters = restrictedIdentityAttributeTypesA
    .map((type) => ({
        type,
        positiveTestValue: "ÄĞǼẌ\u0041\u0308",
        negativeTestValue: "€",
        errorMessage: errorMessageA,
        valueHintsPattern: characterSets.din91379DatatypeA.toString().slice(1, -1).replaceAll("/", "\\/")
    }))
    .concat(
        restrictedIdentityAttributeTypesB.map((type) => ({
            type,
            positiveTestValue: "µẄ€k͟hŽ̧",
            negativeTestValue: "z-\u000D",
            errorMessage: errorMessageB,
            valueHintsPattern: characterSets.din91379DatatypeB.toString().slice(1, -1).replaceAll("/", "\\/")
        }))
    )
    .concat(
        restrictedIdentityAttributeTypesC.map((type) => ({
            type,
            positiveTestValue: "z-\u000D¾£(),",
            negativeTestValue: "\u0012",
            errorMessage: errorMessageC,
            valueHintsPattern: characterSets.din91379DatatypeC.toString().slice(1, -1).replaceAll("/", "\\/")
        }))
    );

test.each(identityAttributeTestParameters)("$type is considered as valid", ({ type, positiveTestValue, valueHintsPattern }) => {
    const attribute = Serializable.fromUnknown({ "@type": type, value: positiveTestValue }) as any;
    expect(attribute.value).toBe(positiveTestValue);
    expect(attribute.valueHints.pattern).toBe(valueHintsPattern);
});

test.each(identityAttributeTestParameters)("$type is considered as invalid", ({ type, negativeTestValue, errorMessage }) => {
    const invalidCall = () => Serializable.fromUnknown({ "@type": type, value: negativeTestValue });
    expect(invalidCall).toThrow(new ParsingError(type, "value", errorMessage));
});

const relationshipAttributeValueTestParameters = [
    { type: "ProprietaryString", propertyInErrorMessage: "value", valueHintsPattern: characterSets.din91379DatatypeC.toString().slice(1, -1).replaceAll("/", "\\/") },
    { type: "ProprietaryJSON", propertyInErrorMessage: "value:Object", valueHintsPattern: undefined },
    { type: "ProprietaryXML", propertyInErrorMessage: "value", valueHintsPattern: characterSets.din91379DatatypeC.toString().slice(1, -1).replaceAll("/", "\\/") }
];

test.each(relationshipAttributeValueTestParameters)("value of $type is considered as valid", ({ type, valueHintsPattern }) => {
    const attribute = Serializable.fromUnknown({ "@type": type, value: "z-\u000D¾£(),", title: "aTitle" }) as any;
    expect(attribute.value).toBe("z-\u000D¾£(),");
    expect(attribute.valueHints.pattern).toBe(valueHintsPattern);
});

test.each(relationshipAttributeValueTestParameters)("value of $type is considered as invalid", ({ type, propertyInErrorMessage }) => {
    const invalidCall = () => {
        Serializable.fromUnknown({ "@type": type, value: "z-\u0012", title: "aTitle" });
    };
    expect(invalidCall).toThrow(new ParsingError(type, propertyInErrorMessage, errorMessageC));
});

const proprietaryAttributeTestParameters = [
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
    { type: "ProprietaryXML", value: "aString" },
    { type: "RelationshipAttributeCreationHints", valueType: "ProprietaryBoolean", confidentiality: RelationshipAttributeConfidentiality.Private }
];

test.each(proprietaryAttributeTestParameters)("title of $type is considered as valid", ({ type, value, valueType, confidentiality }) => {
    const attribute = Serializable.fromUnknown({ "@type": type, value, valueType, confidentiality, title: "\u000D¾£()," });
    expect((attribute as any).title).toBe("\u000D¾£(),");
});

test.each(proprietaryAttributeTestParameters)("title of $type is considered as invalid", ({ type, value, valueType, confidentiality }) => {
    const invalidCall = () => {
        Serializable.fromUnknown({ "@type": type, value, valueType, confidentiality, title: "Ω" });
    };
    expect(invalidCall).toThrow(new ParsingError(type, "title", errorMessageC));
});

test.each(proprietaryAttributeTestParameters)("description of $type is considered as valid", ({ type, value, valueType, confidentiality }) => {
    const attribute = Serializable.fromUnknown({ "@type": type, value, valueType, confidentiality, title: "aTitle", description: "\u000D¾£()," });
    expect((attribute as any).description).toBe("\u000D¾£(),");
});

test.each(proprietaryAttributeTestParameters)("description of $type is considered as invalid", ({ type, value, valueType, confidentiality }) => {
    const invalidCall = () => {
        Serializable.fromUnknown({ "@type": type, value, valueType, confidentiality, title: "aTitle", description: "Ω" });
    };
    expect(invalidCall).toThrow(new ParsingError(type, "description", errorMessageC));
});

test("Key of RelationshipAttribute is valid", () => {
    const attribute = RelationshipAttribute.from({
        key: "\u000D¾£(),",
        confidentiality: RelationshipAttributeConfidentiality.Private,
        value: {
            "@type": "ProprietaryBoolean",
            value: true,
            title: "aTitle"
        },
        "@type": "RelationshipAttribute",
        owner: "theOwner"
    });
    expect(attribute.key).toBe("\u000D¾£(),");
});

test("Key of RelationshipAttribute is invalid", () => {
    const invalidCall = () => {
        RelationshipAttribute.from({
            key: "Б",
            confidentiality: RelationshipAttributeConfidentiality.Private,
            value: {
                "@type": "ProprietaryBoolean",
                value: true,
                title: "aTitle"
            },
            "@type": "RelationshipAttribute",
            owner: "theOwner"
        });
    };
    expect(invalidCall).toThrow(new ParsingError("RelationshipAttribute", "key", errorMessageC));
});

test("Key of RelationshipAttributeQuery is valid", () => {
    const attribute = RelationshipAttributeQuery.from({
        owner: "theOwner",
        attributeCreationHints: { confidentiality: RelationshipAttributeConfidentiality.Private, title: "aTitle", valueType: "ProprietaryBoolean" },
        key: "\u000D¾£(),"
    });
    expect(attribute.key).toBe("\u000D¾£(),");
});

test("Key of RelationshipAttributeQuery is invalid", () => {
    const invalidCall = () => {
        RelationshipAttributeQuery.from({
            owner: "theOwner",
            attributeCreationHints: { confidentiality: RelationshipAttributeConfidentiality.Private, title: "aTitle", valueType: "ProprietaryBoolean" },
            key: "Б"
        });
    };
    expect(invalidCall).toThrow(new ParsingError("RelationshipAttributeQuery", "key", errorMessageC));
});

test("Key of ThirdPartyRelationshipAttributeQuery is valid", () => {
    const attribute = ThirdPartyRelationshipAttributeQuery.from({
        owner: "",
        thirdParty: ["aThirdParty"],
        key: "\u000D¾£(),"
    });
    expect(attribute.key).toBe("\u000D¾£(),");
});

test("Key of ThirdPartyRelationshipAttributeQuery is invalid", () => {
    const invalidCall = () => {
        ThirdPartyRelationshipAttributeQuery.from({
            owner: "",
            thirdParty: ["aThirdParty"],
            key: "Б"
        });
    };
    expect(invalidCall).toThrow(new ParsingError("ThirdPartyRelationshipAttributeQuery", "key", errorMessageC));
});

describe.each(["ValueHints", "ValueHintsOverride"])("%s tests", (type) => {
    test("is valid", () => {
        const validCall = () => {
            Serializable.fromUnknown({
                "@type": type,
                defaultValue: "\u000D¾£(),",
                editHelp: "\u000D¾£(),",
                values: [
                    {
                        key: "\u000D¾£(),",
                        displayName: "\u000D¾£(),"
                    }
                ]
            });
        };
        expect(validCall).not.toThrow();
    });

    test("defaultValue is invalid", () => {
        const invalidCall = () => {
            Serializable.fromUnknown({ "@type": type, defaultValue: "™" });
        };
        expect(invalidCall).toThrow(new ParsingError(type, "defaultValue:Object", errorMessageC));
    });

    test("editHelp is invalid", () => {
        const invalidCall = () => {
            Serializable.fromUnknown({ "@type": type, editHelp: "™" });
        };
        expect(invalidCall).toThrow(new ParsingError(type, "editHelp", errorMessageC));
    });
});

test("key of ValueHintsValue is invalid", () => {
    const invalidCall = () => {
        ValueHintsValue.from({ key: "™", displayName: "aDisplayName" });
    };
    expect(invalidCall).toThrow(new ParsingError("ValueHintsValue", "key:Object", errorMessageC));
});

test("displayName of ValueHintsValue is invalid", () => {
    const invalidCall = () => {
        ValueHintsValue.from({ key: "aKey", displayName: "💩" });
    };
    expect(invalidCall).toThrow(new ParsingError("ValueHintsValue", "displayName", errorMessageC));
});
