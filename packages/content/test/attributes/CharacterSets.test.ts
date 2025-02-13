import { ParsingError, Serializable } from "@js-soft/ts-serval";
import {
    Consent,
    DeliveryBoxAddress,
    IDeliveryBoxAddress,
    IPostOfficeBoxAddress,
    PostOfficeBoxAddress,
    ProprietaryString,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    RelationshipAttributeQuery,
    ThirdPartyRelationshipAttributeQuery,
    ValueHintsValue
} from "../../src";
import { characterSets } from "../../src/attributes/constants/CharacterSets";

const errorMessageDatatypeA = `Value does not match regular expression ${characterSets.din91379DatatypeA.toString()}`;
const errorMessageDatatypeB = `Value does not match regular expression ${characterSets.din91379DatatypeB.toString()}`;
const errorMessageDatatypeC = `Value does not match regular expression ${characterSets.din91379DatatypeC.toString()}`;

test("Consent is considered as valid", () => {
    const consent = Consent.from({ consent: "z-validValue\u000D¾£()," });
    expect(consent.consent.toString()).toBe("z-validValue\u000D¾£(),");
});

test("Consent is considered as invalid", () => {
    const invalidCall = () => {
        Consent.from({
            consent: "invalidValue\u0012"
        });
    };
    expect(invalidCall).toThrow(new ParsingError("Consent", "consent", errorMessageDatatypeC));
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

    expect(invalidCall).toThrow(new ParsingError("DeliveryBoxAddress", propertyName, errorMessageDatatypeB));
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
    expect(invalidCall).toThrow(new ParsingError("PostOfficeBoxAddress", propertyName, errorMessageDatatypeB));
});

const restrictedIdentityAttributeTypesA = ["BirthName", "GivenName", "HonorificPrefix", "HonorificSuffix", "MiddleName", "Pseudonym", "Surname"];
const restrictedIdentityAttributeTypesB = ["City", "HouseNumber", "State", "Street", "ZipCode", "AffiliationOrganization", "DisplayName", "JobTitle"];
const restrictedIdentityAttributeTypesC = ["AffiliationRole", "AffiliationUnit", "StatementPredicate"];

const identityAttributeTestParameters = restrictedIdentityAttributeTypesA
    .map((type) => ({
        type,
        positiveTestValue: "validValueÄĞǼẌ ",
        negativeTestValue: "invalidValue€",
        errorMessage: errorMessageDatatypeA,
        valueHintsPattern: characterSets.din91379DatatypeA.toString().slice(1, -1).replaceAll("/", "\\/")
    }))
    .concat(
        restrictedIdentityAttributeTypesB.map((type) => ({
            type,
            positiveTestValue: "validValueµẄ€k͟hŽ̧",
            negativeTestValue: "z-invalidValue\u000D",
            errorMessage: errorMessageDatatypeB,
            valueHintsPattern: characterSets.din91379DatatypeB.toString().slice(1, -1).replaceAll("/", "\\/")
        }))
    )
    .concat(
        restrictedIdentityAttributeTypesC.map((type) => ({
            type,
            positiveTestValue: "z-validValue\u000D¾£(),",
            negativeTestValue: "invalidValue\u0012",
            errorMessage: errorMessageDatatypeC,
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

test("value of ProprietaryString is considered as valid", () => {
    const attribute = ProprietaryString.from({ value: "z-validValue\u000D¾£(),", title: "aTitle" }) as any;
    expect(attribute.value).toBe("z-validValue\u000D¾£(),");
    expect(attribute.valueHints.pattern).toBe(characterSets.din91379DatatypeC.toString().slice(1, -1).replaceAll("/", "\\/"));
});

test("value of ProprietaryString is considered as invalid", () => {
    const invalidCall = () => {
        ProprietaryString.from({ value: "z-invalidValue\u0012", title: "aTitle" });
    };
    expect(invalidCall).toThrow(new ParsingError("ProprietaryString", "value", errorMessageDatatypeC));
});

const proprietaryAttributeTestParameters = [
    { type: "ProprietaryBoolean", value: true },
    { type: "ProprietaryCountry", value: "DE" },
    { type: "ProprietaryEMailAddress", value: "email@email.de" },
    { type: "ProprietaryFileReference", value: "FIL123456789012345678901234567" },
    { type: "ProprietaryFloat", value: 1 },
    { type: "ProprietaryHEXColor", value: "#000000" },
    { type: "ProprietaryInteger", value: 1 },
    { type: "ProprietaryJSON", value: "aString" },
    { type: "ProprietaryLanguage", value: "de" },
    { type: "ProprietaryPhoneNumber", value: "1234567890" },
    { type: "ProprietaryString", value: "aString" },
    { type: "ProprietaryURL", value: "mail.de" },
    { type: "ProprietaryXML", value: "aString" },
    { type: "RelationshipAttributeCreationHints", valueType: "ProprietaryBoolean", confidentiality: RelationshipAttributeConfidentiality.Private }
];

test.each(proprietaryAttributeTestParameters)("title of $type is considered as valid", ({ type, value, valueType, confidentiality }) => {
    const attribute = Serializable.fromUnknown({ "@type": type, value, valueType, confidentiality, title: "validValue\u000D¾£()," });
    expect((attribute as any).title).toBe("validValue\u000D¾£(),");
});

test.each(proprietaryAttributeTestParameters)("title of $type is considered as invalid", ({ type, value, valueType, confidentiality }) => {
    const invalidCall = () => {
        Serializable.fromUnknown({ "@type": type, value, valueType, confidentiality, title: "invalidValueΩ" });
    };
    expect(invalidCall).toThrow(new ParsingError(type, "title", errorMessageDatatypeC));
});

test.each(proprietaryAttributeTestParameters)("description of $type is considered as valid", ({ type, value, valueType, confidentiality }) => {
    const attribute = Serializable.fromUnknown({ "@type": type, value, valueType, confidentiality, title: "aTitle", description: "validValue\u000D¾£()," });
    expect((attribute as any).description).toBe("validValue\u000D¾£(),");
});

test.each(proprietaryAttributeTestParameters)("description of $type is considered as invalid", ({ type, value, valueType, confidentiality }) => {
    const invalidCall = () => {
        Serializable.fromUnknown({ "@type": type, value, valueType, confidentiality, title: "aTitle", description: "invalidValueΩ" });
    };
    expect(invalidCall).toThrow(new ParsingError(type, "description", errorMessageDatatypeC));
});

test("key of RelationshipAttribute is considered as valid", () => {
    const attribute = RelationshipAttribute.from({
        key: "validValue\u000D¾£(),",
        confidentiality: RelationshipAttributeConfidentiality.Private,
        value: {
            "@type": "ProprietaryBoolean",
            value: true,
            title: "aTitle"
        },
        "@type": "RelationshipAttribute",
        owner: "theOwner"
    });
    expect(attribute.key).toBe("validValue\u000D¾£(),");
});

test("key of RelationshipAttribute is considered as invalid", () => {
    const invalidCall = () => {
        RelationshipAttribute.from({
            key: "invalidValueБ",
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
    expect(invalidCall).toThrow(new ParsingError("RelationshipAttribute", "key", errorMessageDatatypeC));
});

test("key of RelationshipAttributeQuery is considered as valid", () => {
    const attribute = RelationshipAttributeQuery.from({
        owner: "theOwner",
        attributeCreationHints: { confidentiality: RelationshipAttributeConfidentiality.Private, title: "aTitle", valueType: "ProprietaryBoolean" },
        key: "validValue\u000D¾£(),"
    });
    expect(attribute.key).toBe("validValue\u000D¾£(),");
});

test("key of RelationshipAttributeQuery is considered as invalid", () => {
    const invalidCall = () => {
        RelationshipAttributeQuery.from({
            owner: "theOwner",
            attributeCreationHints: { confidentiality: RelationshipAttributeConfidentiality.Private, title: "aTitle", valueType: "ProprietaryBoolean" },
            key: "invalidValueБ"
        });
    };
    expect(invalidCall).toThrow(new ParsingError("RelationshipAttributeQuery", "key", errorMessageDatatypeC));
});

test("key of ThirdPartyRelationshipAttributeQuery is considered as valid", () => {
    const attribute = ThirdPartyRelationshipAttributeQuery.from({
        owner: "",
        thirdParty: ["aThirdParty"],
        key: "validValue\u000D¾£(),"
    });
    expect(attribute.key).toBe("validValue\u000D¾£(),");
});

test("key of ThirdPartyRelationshipAttributeQuery is considered as invalid", () => {
    const invalidCall = () => {
        ThirdPartyRelationshipAttributeQuery.from({
            owner: "",
            thirdParty: ["aThirdParty"],
            key: "invalidValueБ"
        });
    };
    expect(invalidCall).toThrow(new ParsingError("ThirdPartyRelationshipAttributeQuery", "key", errorMessageDatatypeC));
});

describe.each(["ValueHints", "ValueHintsOverride"])("%s tests", (type) => {
    test("is considered as valid", () => {
        const validCall = () => {
            Serializable.fromUnknown({
                "@type": type,
                defaultValue: "validValue\u000D¾£(),",
                editHelp: "validValue\u000D¾£(),",
                values: [
                    {
                        key: "validValue\u000D¾£(),",
                        displayName: "validValue\u000D¾£(),"
                    }
                ]
            });
        };
        expect(validCall).not.toThrow();
    });

    test("defaultValue is considered as invalid", () => {
        const invalidCall = () => {
            Serializable.fromUnknown({ "@type": type, defaultValue: "invalidValue™" });
        };
        expect(invalidCall).toThrow(new ParsingError(type, "defaultValue:Object", errorMessageDatatypeC));
    });

    test("editHelp is considered as invalid", () => {
        const invalidCall = () => {
            Serializable.fromUnknown({ "@type": type, editHelp: "invalidValue™" });
        };
        expect(invalidCall).toThrow(new ParsingError(type, "editHelp", errorMessageDatatypeC));
    });
});

test("key of ValueHintsValue is considered as invalid", () => {
    const invalidCall = () => {
        ValueHintsValue.from({ key: "invalidValue™", displayName: "aDisplayName" });
    };
    expect(invalidCall).toThrow(new ParsingError("ValueHintsValue", "key:Object", errorMessageDatatypeC));
});

test("displayName of ValueHintsValue is considered as invalid", () => {
    const invalidCall = () => {
        ValueHintsValue.from({ key: "aKey", displayName: "invalidValue💩" });
    };
    expect(invalidCall).toThrow(new ParsingError("ValueHintsValue", "displayName", errorMessageDatatypeC));
});
