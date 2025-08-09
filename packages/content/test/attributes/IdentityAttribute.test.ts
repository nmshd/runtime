import { CoreAddress } from "@nmshd/core-types";
import {
    Affiliation,
    AffiliationOrganization,
    AffiliationRole,
    AffiliationUnit,
    BirthDate,
    BirthDateJSON,
    BirthDay,
    BirthMonth,
    BirthYear,
    GivenName,
    IBirthDate,
    IdentityAttribute,
    Nationality
} from "../../src";

describe("IdentityAttribute", function () {
    test("should allow to create new attributes from objects (nested values)", function () {
        const birthDateContent = {
            "@type": "BirthDate",
            day: { value: 22 },
            month: { value: 2 },
            year: { value: 2022 }
        };
        const birthDateContentSerialized = {
            "@type": "BirthDate",
            day: 22,
            month: 2,
            year: 2022
        };
        const birthDate = IdentityAttribute.from({
            value: birthDateContent,
            owner: CoreAddress.from("address")
        });
        expect(birthDate).toBeInstanceOf(IdentityAttribute);
        expect(birthDate.value).toBeInstanceOf(BirthDate);

        if (!(birthDate.value instanceof BirthDate)) throw new Error("Should not happen");

        expect(birthDate.value.toJSON()).toStrictEqual(birthDateContentSerialized);
        expect(birthDate.value.day).toBeInstanceOf(BirthDay);
        expect(birthDate.value.month).toBeInstanceOf(BirthMonth);
        expect(birthDate.value.year).toBeInstanceOf(BirthYear);
    });

    test("should allow to create new attributes from objects (only values)", function () {
        const birthDateContent = {
            "@type": "BirthDate",
            day: 22,
            month: 2,
            year: 2022
        };
        const birthDate = IdentityAttribute.from({
            value: birthDateContent,
            owner: CoreAddress.from("address")
        });
        expect(birthDate).toBeInstanceOf(IdentityAttribute);
        expect(birthDate.value).toBeInstanceOf(BirthDate);

        if (!(birthDate.value instanceof BirthDate)) throw new Error("Should not happen");

        expect(birthDate.value.toJSON()).toStrictEqual(birthDateContent);
        expect(birthDate.value.day).toBeInstanceOf(BirthDay);
        expect(birthDate.value.month).toBeInstanceOf(BirthMonth);
        expect(birthDate.value.year).toBeInstanceOf(BirthYear);
    });

    test("should allow to validate string values", function () {
        let nationality = IdentityAttribute.from<Nationality>({
            value: {
                "@type": "Nationality",
                value: "DE"
            },
            owner: "address"
        });
        expect(nationality).toBeInstanceOf(IdentityAttribute);
        expect(nationality.value).toBeInstanceOf(Nationality);

        nationality = IdentityAttribute.from({
            value: {
                "@type": "Nationality",
                value: "DE"
            },
            owner: CoreAddress.from("address")
        });
        expect(nationality).toBeInstanceOf(IdentityAttribute);
        expect(nationality.value).toBeInstanceOf(Nationality);

        expect(() =>
            IdentityAttribute.from({
                value: {
                    "@type": "Nationality",
                    value: "xx"
                },
                owner: CoreAddress.from("address")
            })
        ).toThrow("Nationality.value:String :: must be one of");

        expect(() =>
            IdentityAttribute.from({
                value: {
                    "@type": "Nationality",
                    value: 27 as any
                },
                owner: CoreAddress.from("address")
            })
        ).toThrow("Nationality.value :: Value is not a string");

        expect(() =>
            IdentityAttribute.from({
                value: {
                    "@type": "Nationality",
                    // @ts-expect-error
                    value: undefined
                },
                owner: "address"
            })
        ).toThrow("Nationality.value :: Value is not defined");
    });

    test("should allow to validate integer values", function () {
        let age = IdentityAttribute.from<BirthDate>({
            value: {
                "@type": "BirthDate",
                day: 1,
                month: 10,
                year: 2000
            },
            owner: CoreAddress.from("address")
        });
        expect(age).toBeInstanceOf(IdentityAttribute);
        expect(age.value).toBeInstanceOf(BirthDate);

        age = IdentityAttribute.from({
            value: {
                "@type": "BirthDate",
                day: 1,
                month: 10,
                year: 2000
            },
            owner: CoreAddress.from("address")
        });
        expect(age).toBeInstanceOf(IdentityAttribute);
        expect(age.value).toBeInstanceOf(BirthDate);

        expect(() =>
            IdentityAttribute.from({
                value: {
                    "@type": "BirthDate",
                    month: "10" as any,
                    day: 1,
                    year: 2000
                },
                owner: CoreAddress.from("address")
            })
        ).toThrow("BirthMonth.value :: Value is not a number");
    });

    test("should allow to create new attributes from JSON", function () {
        const birthDateContent = {
            "@type": "BirthDate",
            day: { value: 22 },
            month: { value: 2 },
            year: { value: 2022 }
        };
        const birthDateContentSerialized = {
            "@type": "BirthDate",
            day: 22,
            month: 2,
            year: 2022
        };
        const birthDate = IdentityAttribute.from<BirthDate, IBirthDate, BirthDateJSON>({ value: birthDateContent, owner: CoreAddress.from("address") });

        expect(birthDate).toBeInstanceOf(IdentityAttribute);
        expect(birthDate.value).toBeInstanceOf(BirthDate);
        expect(birthDate.value.toJSON()).toStrictEqual(birthDateContentSerialized);
        expect(birthDate.value.day).toBeInstanceOf(BirthDay);
        expect(birthDate.value.month).toBeInstanceOf(BirthMonth);
        expect(birthDate.value.year).toBeInstanceOf(BirthYear);
    });

    test("should deserialize content", function () {
        const attribute = IdentityAttribute.from<GivenName>({
            owner: CoreAddress.from("address"),
            value: {
                "@type": "GivenName",
                value: "John"
            }
        });

        expect(attribute.value).toBeDefined();
        expect(attribute).toBeInstanceOf(IdentityAttribute);
        expect(attribute.value).toBeInstanceOf(GivenName);
        expect(attribute.value.value).toBe("John");
    });

    test("should validate attribute values from JSON", function () {
        expect(() =>
            IdentityAttribute.from({
                value: { "@type": "BirthDate", day: { value: 22 }, month: { value: 13 }, year: { value: 2022 } },
                owner: CoreAddress.from("address")
            })
        ).toThrow("BirthMonth.value:Number :: must be an integer value between 1 and 12");
    });

    test("should validate attribute values from objects", function () {
        expect(() =>
            IdentityAttribute.from({
                value: {
                    "@type": "BirthDate",
                    month: "12" as any,
                    day: 1,
                    year: 2000
                },
                owner: CoreAddress.from("address")
            })
        ).toThrow("BirthMonth.value :: Value is not a number.");

        expect(() =>
            IdentityAttribute.from({
                value: {
                    "@type": "BirthDate",
                    month: 13,
                    day: 1,
                    year: 2000
                },
                owner: CoreAddress.from("address")
            })
        ).toThrow("BirthMonth.value:Number :: must be an integer value between 1 and 12");
    });

    test("should allow the creation of nested attributes", function () {
        const affiliation = {
            "@type": "Affiliation",
            organization: "j&s-soft AG",
            role: "Developer",
            unit: "enmeshed"
        };
        const affiliationInstance = Affiliation.fromAny(affiliation);
        expect(affiliationInstance).toBeInstanceOf(Affiliation);

        const affiliationAttribute = IdentityAttribute.from<Affiliation>({ value: affiliation, owner: CoreAddress.from("address") });

        expect(affiliationAttribute.value).toBeInstanceOf(Affiliation);
        expect(affiliationAttribute.value.organization).toBeInstanceOf(AffiliationOrganization);

        expect(affiliationAttribute.value.role).toBeInstanceOf(AffiliationRole);
        expect(affiliationAttribute.value.unit).toBeInstanceOf(AffiliationUnit);
    });

    test("should validate uniqueness of tags", function () {
        expect(() =>
            IdentityAttribute.from({
                value: {
                    "@type": "Nationality",
                    value: "DE"
                },
                owner: CoreAddress.from("address"),
                tags: ["tag1", "tag1"]
            })
        ).toThrow("IdentityAttribute.tags:Array :: The tags are not unique");
    });
});
