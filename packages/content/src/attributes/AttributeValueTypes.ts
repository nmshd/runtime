import {
    Affiliation,
    AffiliationJSON,
    BankAccount,
    BankAccountJSON,
    BirthDate,
    BirthDateJSON,
    BirthName,
    BirthNameJSON,
    BirthPlace,
    BirthPlaceJSON,
    Citizenship,
    CitizenshipJSON,
    CommunicationLanguage,
    CommunicationLanguageJSON,
    Consent,
    ConsentJSON,
    DeliveryBoxAddress,
    DeliveryBoxAddressJSON,
    DisplayName,
    DisplayNameJSON,
    EMailAddress,
    EMailAddressJSON,
    FaxNumber,
    FaxNumberJSON,
    GivenName,
    GivenNameJSON,
    HonorificPrefix,
    HonorificPrefixJSON,
    HonorificSuffix,
    HonorificSuffixJSON,
    IAffiliation,
    IBankAccount,
    IBirthDate,
    IBirthName,
    IBirthPlace,
    ICitizenship,
    ICommunicationLanguage,
    IConsent,
    IDeliveryBoxAddress,
    IdentityFileReference,
    IdentityFileReferenceJSON,
    IDisplayName,
    IEMailAddress,
    IFaxNumber,
    IGivenName,
    IHonorificPrefix,
    IHonorificSuffix,
    IIdentityFileReference,
    IJobTitle,
    IMaritalStatus,
    IMiddleName,
    INationality,
    IPhoneNumber,
    IPostOfficeBoxAddress,
    IProprietaryBoolean,
    IProprietaryCountry,
    IProprietaryEMailAddress,
    IProprietaryFileReference,
    IProprietaryFloat,
    IProprietaryHEXColor,
    IProprietaryInteger,
    IProprietaryJSON,
    IProprietaryLanguage,
    IProprietaryPhoneNumber,
    IProprietaryString,
    IProprietaryURL,
    IProprietaryXML,
    IPseudonym,
    ISchematizedXML,
    ISex,
    ISocialInsuranceNumber,
    IStreetAddress,
    ISurname,
    IWebsite,
    JobTitle,
    JobTitleJSON,
    MaritalStatus,
    MaritalStatusJSON,
    MiddleName,
    MiddleNameJSON,
    Nationality,
    NationalityJSON,
    PhoneNumber,
    PhoneNumberJSON,
    PostOfficeBoxAddress,
    PostOfficeBoxAddressJSON,
    ProprietaryBoolean,
    ProprietaryBooleanJSON,
    ProprietaryCountry,
    ProprietaryCountryJSON,
    ProprietaryEMailAddress,
    ProprietaryEMailAddressJSON,
    ProprietaryFileReference,
    ProprietaryFileReferenceJSON,
    ProprietaryFloat,
    ProprietaryFloatJSON,
    ProprietaryHEXColor,
    ProprietaryHEXColorJSON,
    ProprietaryInteger,
    ProprietaryIntegerJSON,
    ProprietaryJSON,
    ProprietaryJSONJSON,
    ProprietaryLanguage,
    ProprietaryLanguageJSON,
    ProprietaryPhoneNumber,
    ProprietaryPhoneNumberJSON,
    ProprietaryString,
    ProprietaryStringJSON,
    ProprietaryURL,
    ProprietaryURLJSON,
    ProprietaryXML,
    ProprietaryXMLJSON,
    Pseudonym,
    PseudonymJSON,
    SchematizedXML,
    SchematizedXMLJSON,
    Sex,
    SexJSON,
    SocialInsuranceNumber,
    SocialInsuranceNumberJSON,
    StreetAddress,
    StreetAddressJSON,
    Surname,
    SurnameJSON,
    Website,
    WebsiteJSON
} from "./types";

// ################################################ Editable IdentityAttribute Value Types ###################################################################

export namespace AttributeValues {
    export namespace Identity {
        export namespace Editable {
            export type Json =
                | AffiliationJSON
                | BankAccountJSON
                | BirthDateJSON
                | BirthNameJSON
                | BirthPlaceJSON
                | CitizenshipJSON
                | CommunicationLanguageJSON
                | DeliveryBoxAddressJSON
                | DisplayNameJSON
                | EMailAddressJSON
                | FaxNumberJSON
                | GivenNameJSON
                | HonorificPrefixJSON
                | HonorificSuffixJSON
                | IdentityFileReferenceJSON
                | JobTitleJSON
                | MaritalStatusJSON
                | MiddleNameJSON
                | NationalityJSON
                | PhoneNumberJSON
                | PostOfficeBoxAddressJSON
                | PseudonymJSON
                | SexJSON
                | SocialInsuranceNumberJSON
                | StreetAddressJSON
                | SurnameJSON
                | WebsiteJSON;

            export type Interface =
                | IAffiliation
                | IBankAccount
                | IBirthDate
                | IBirthName
                | IBirthPlace
                | ICitizenship
                | ICommunicationLanguage
                | IDeliveryBoxAddress
                | IDisplayName
                | IEMailAddress
                | IFaxNumber
                | IGivenName
                | IHonorificPrefix
                | IHonorificSuffix
                | IIdentityFileReference
                | IJobTitle
                | IMaritalStatus
                | IMiddleName
                | INationality
                | IPhoneNumber
                | IPostOfficeBoxAddress
                | IPseudonym
                | ISex
                | ISocialInsuranceNumber
                | IStreetAddress
                | ISurname
                | IWebsite;

            export type Class =
                | Affiliation
                | BankAccount
                | BirthDate
                | BirthName
                | BirthPlace
                | Citizenship
                | CommunicationLanguage
                | DeliveryBoxAddress
                | DisplayName
                | EMailAddress
                | FaxNumber
                | GivenName
                | HonorificPrefix
                | HonorificSuffix
                | IdentityFileReference
                | JobTitle
                | MaritalStatus
                | MiddleName
                | Nationality
                | PhoneNumber
                | PostOfficeBoxAddress
                | Pseudonym
                | Sex
                | SocialInsuranceNumber
                | StreetAddress
                | Surname
                | Website;

            export const CLASSES = [
                Affiliation,
                BankAccount,
                BirthDate,
                BirthName,
                BirthPlace,
                Citizenship,
                CommunicationLanguage,
                DeliveryBoxAddress,
                DisplayName,
                EMailAddress,
                FaxNumber,
                GivenName,
                HonorificPrefix,
                HonorificSuffix,
                IdentityFileReference,
                JobTitle,
                MaritalStatus,
                MiddleName,
                Nationality,
                PhoneNumber,
                PostOfficeBoxAddress,
                Pseudonym,
                Sex,
                SocialInsuranceNumber,
                StreetAddress,
                Surname,
                Website
            ];

            export const TYPE_NAMES = [
                "Affiliation",
                "BankAccount",
                "BirthDate",
                "BirthName",
                "BirthPlace",
                "Citizenship",
                "CommunicationLanguage",
                "DeliveryBoxAddress",
                "DisplayName",
                "EMailAddress",
                "FaxNumber",
                "GivenName",
                "HonorificPrefix",
                "HonorificSuffix",
                "IdentityFileReference",
                "JobTitle",
                "Nationality",
                "MaritalStatus",
                "MiddleName",
                "PhoneNumber",
                "PostOfficeBoxAddress",
                "Pseudonym",
                "Sex",
                "SocialInsuranceNumber",
                "StreetAddress",
                "Surname",
                "Website"
            ] as const;

            export const TYPE_NAMES_STRINGIFIED = JSON.stringify(TYPE_NAMES);
            export type TypeName = (typeof TYPE_NAMES)[number];
        }

        export namespace Uneditable {
            export type Json = SchematizedXMLJSON;
            export type Interface = ISchematizedXML;
            export type Class = SchematizedXML;
            export const CLASSES = [SchematizedXML];
            export const TYPE_NAMES = ["SchematizedXML"] as const;

            export const TYPE_NAMES_STRINGIFIED = JSON.stringify(TYPE_NAMES);
            export type TypeName = (typeof TYPE_NAMES)[number];
        }

        export type Json = Editable.Json | Uneditable.Json;
        export type Interface = Editable.Interface | Uneditable.Interface;
        export type Class = Editable.Class | Uneditable.Class;
        export const CLASSES = [...Editable.CLASSES, ...Uneditable.CLASSES];
        export type TypeName = Editable.TypeName | Uneditable.TypeName;
        export const TYPE_NAMES = [...Editable.TYPE_NAMES, ...Uneditable.TYPE_NAMES];
        export const TYPE_NAMES_STRINGIFIED = JSON.stringify(TYPE_NAMES);
    }

    export namespace Relationship {
        export type Json =
            | ProprietaryBooleanJSON
            | ProprietaryCountryJSON
            | ProprietaryEMailAddressJSON
            | ProprietaryFileReferenceJSON
            | ProprietaryFloatJSON
            | ProprietaryHEXColorJSON
            | ProprietaryIntegerJSON
            | ProprietaryLanguageJSON
            | ProprietaryPhoneNumberJSON
            | ProprietaryStringJSON
            | ProprietaryURLJSON
            | ProprietaryJSONJSON
            | ProprietaryXMLJSON
            | ConsentJSON;

        export type Interface =
            | IProprietaryBoolean
            | IProprietaryCountry
            | IProprietaryEMailAddress
            | IProprietaryFileReference
            | IProprietaryFloat
            | IProprietaryHEXColor
            | IProprietaryInteger
            | IProprietaryLanguage
            | IProprietaryPhoneNumber
            | IProprietaryString
            | IProprietaryURL
            | IProprietaryJSON
            | IProprietaryXML
            | IConsent;

        export type Class =
            | ProprietaryBoolean
            | ProprietaryCountry
            | ProprietaryEMailAddress
            | ProprietaryFileReference
            | ProprietaryFloat
            | ProprietaryHEXColor
            | ProprietaryInteger
            | ProprietaryLanguage
            | ProprietaryPhoneNumber
            | ProprietaryString
            | ProprietaryURL
            | ProprietaryJSON
            | ProprietaryXML
            | Consent;

        export const CLASSES = [
            ProprietaryBoolean,
            ProprietaryCountry,
            ProprietaryEMailAddress,
            ProprietaryFileReference,
            ProprietaryFloat,
            ProprietaryHEXColor,
            ProprietaryInteger,
            ProprietaryLanguage,
            ProprietaryPhoneNumber,
            ProprietaryString,
            ProprietaryURL,
            ProprietaryJSON,
            ProprietaryXML,
            Consent
        ];

        export const TYPE_NAMES = [
            "ProprietaryBoolean",
            "ProprietaryCountry",
            "ProprietaryEMailAddress",
            "ProprietaryFileReference",
            "ProprietaryFloat",
            "ProprietaryHEXColor",
            "ProprietaryInteger",
            "ProprietaryLanguage",
            "ProprietaryPhoneNumber",
            "ProprietaryString",
            "ProprietaryURL",
            "ProprietaryJSON",
            "ProprietaryXML",
            "Consent"
        ] as const;

        export const TYPE_NAMES_STRINGIFIED = JSON.stringify(TYPE_NAMES);
        export type TypeName = (typeof TYPE_NAMES)[number];
    }

    export type Json = Identity.Json | Relationship.Json;
    export type Interface = Identity.Interface | Relationship.Interface;
    export type Class = Identity.Class | Relationship.Class;
    export const CLASSES = [...Identity.CLASSES, ...Relationship.CLASSES];
    export type TypeName = Identity.TypeName | Relationship.TypeName;
    export const TYPE_NAMES = [...Identity.TYPE_NAMES, ...Relationship.TYPE_NAMES];
    export const TYPE_NAMES_STRINGIFIED = JSON.stringify(TYPE_NAMES);
}
