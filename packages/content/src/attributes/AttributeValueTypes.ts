import {
    Affiliation,
    AffiliationJSON,
    AffiliationOrganization,
    AffiliationOrganizationJSON,
    AffiliationRole,
    AffiliationRoleJSON,
    AffiliationUnit,
    AffiliationUnitJSON,
    BirthCity,
    BirthCityJSON,
    BirthCountry,
    BirthCountryJSON,
    BirthDate,
    BirthDateJSON,
    BirthDay,
    BirthDayJSON,
    BirthMonth,
    BirthMonthJSON,
    BirthName,
    BirthNameJSON,
    BirthPlace,
    BirthPlaceJSON,
    BirthState,
    BirthStateJSON,
    BirthYear,
    BirthYearJSON,
    Citizenship,
    CitizenshipJSON,
    City,
    CityJSON,
    CommunicationLanguage,
    CommunicationLanguageJSON,
    Consent,
    ConsentJSON,
    Country,
    CountryJSON,
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
    HouseNumber,
    HouseNumberJSON,
    IAffiliation,
    IAffiliationOrganization,
    IAffiliationRole,
    IAffiliationUnit,
    IBirthCity,
    IBirthCountry,
    IBirthDate,
    IBirthDay,
    IBirthMonth,
    IBirthName,
    IBirthPlace,
    IBirthState,
    IBirthYear,
    ICitizenship,
    ICity,
    ICommunicationLanguage,
    IConsent,
    ICountry,
    IDeliveryBoxAddress,
    IdentityFileReference,
    IdentityFileReferenceJSON,
    IDisplayName,
    IEMailAddress,
    IFaxNumber,
    IGivenName,
    IHonorificPrefix,
    IHonorificSuffix,
    IHouseNumber,
    IIdentityFileReference,
    IJobTitle,
    IMiddleName,
    INationality,
    IPersonName,
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
    IState,
    IStreet,
    IStreetAddress,
    ISurname,
    IWebsite,
    IZipCode,
    JobTitle,
    JobTitleJSON,
    MiddleName,
    MiddleNameJSON,
    Nationality,
    NationalityJSON,
    PersonName,
    PersonNameJSON,
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
    State,
    StateJSON,
    Street,
    StreetAddress,
    StreetAddressJSON,
    StreetJSON,
    Surname,
    SurnameJSON,
    Website,
    WebsiteJSON,
    ZipCode,
    ZipCodeJSON
} from "./types";
import { IVerifiableCredential, VerifiableCredential, VerifiableCredentialJSON } from "./types/VerifiableCredential";

// ################################################ Editable IdentityAttribute Value Types ###################################################################

export module AttributeValues {
    export module Identity {
        export module Editable {
            export type Json =
                | AffiliationJSON
                | BirthDateJSON
                | BirthNameJSON
                | BirthPlaceJSON
                | CitizenshipJSON
                | CommunicationLanguageJSON
                | DeliveryBoxAddressJSON
                | DisplayNameJSON
                | EMailAddressJSON
                | FaxNumberJSON
                | IdentityFileReferenceJSON
                | JobTitleJSON
                | NationalityJSON
                | PersonNameJSON
                | PhoneNumberJSON
                | PostOfficeBoxAddressJSON
                | PseudonymJSON
                | SexJSON
                | StreetAddressJSON
                | WebsiteJSON;

            export type Interface =
                | IAffiliation
                | IBirthDate
                | IBirthName
                | IBirthPlace
                | ICitizenship
                | ICommunicationLanguage
                | IDeliveryBoxAddress
                | IDisplayName
                | IEMailAddress
                | IFaxNumber
                | IIdentityFileReference
                | IJobTitle
                | INationality
                | IPersonName
                | IPhoneNumber
                | IPostOfficeBoxAddress
                | IPseudonym
                | ISex
                | IStreetAddress
                | IWebsite;

            export type Class =
                | Affiliation
                | BirthDate
                | BirthName
                | BirthPlace
                | Citizenship
                | CommunicationLanguage
                | DeliveryBoxAddress
                | DisplayName
                | EMailAddress
                | FaxNumber
                | IdentityFileReference
                | JobTitle
                | Nationality
                | PersonName
                | PhoneNumber
                | PostOfficeBoxAddress
                | Pseudonym
                | Sex
                | StreetAddress
                | Website;

            export const CLASSES = [
                Affiliation,
                BirthDate,
                BirthName,
                BirthPlace,
                Citizenship,
                CommunicationLanguage,
                DeliveryBoxAddress,
                DisplayName,
                EMailAddress,
                FaxNumber,
                IdentityFileReference,
                SchematizedXML,
                VerifiableCredential,
                JobTitle,
                Nationality,
                PersonName,
                PhoneNumber,
                PostOfficeBoxAddress,
                Pseudonym,
                Sex,
                StreetAddress,
                Website
            ];

            export const TYPE_NAMES = [
                "Affiliation",
                "BirthDate",
                "BirthName",
                "BirthPlace",
                "Citizenship",
                "CommunicationLanguage",
                "DeliveryBoxAddress",
                "DisplayName",
                "EMailAddress",
                "FaxNumber",
                "IdentityFileReference",
                "SchematizedXML",
                "VerifiableCredential",
                "JobTitle",
                "Nationality",
                "PersonName",
                "PhoneNumber",
                "PostOfficeBoxAddress",
                "Pseudonym",
                "Sex",
                "StreetAddress",
                "Website"
            ] as const;

            export const TYPE_NAMES_STRINGIFIED = JSON.stringify(TYPE_NAMES);
            export type TypeName = (typeof TYPE_NAMES)[number];
        }

        export module Uneditable {
            export type Json =
                | AffiliationOrganizationJSON
                | AffiliationRoleJSON
                | AffiliationUnitJSON
                | BirthCityJSON
                | BirthCountryJSON
                | BirthDayJSON
                | BirthMonthJSON
                | BirthStateJSON
                | BirthYearJSON
                | CityJSON
                | CountryJSON
                | GivenNameJSON
                | HonorificPrefixJSON
                | HonorificSuffixJSON
                | HouseNumberJSON
                | MiddleNameJSON
                | SchematizedXMLJSON
                | VerifiableCredentialJSON
                | StateJSON
                // | StatementJSON
                | StreetJSON
                | SurnameJSON
                | ZipCodeJSON;

            export type Interface =
                | IAffiliationOrganization
                | IAffiliationRole
                | IAffiliationUnit
                | IBirthCity
                | IBirthCountry
                | IBirthDay
                | IBirthMonth
                | IBirthState
                | IBirthYear
                | ICity
                | ICountry
                | IGivenName
                | IHonorificPrefix
                | IHonorificSuffix
                | IHouseNumber
                | IMiddleName
                | ISchematizedXML
                | IVerifiableCredential
                | IState
                // | IStatement
                | IStreet
                | ISurname
                | IZipCode;

            export type Class =
                | AffiliationOrganization
                | AffiliationRole
                | AffiliationUnit
                | BirthCity
                | BirthCountry
                | BirthDay
                | BirthMonth
                | BirthState
                | BirthYear
                | City
                | Country
                | GivenName
                | HonorificPrefix
                | HonorificSuffix
                | HouseNumber
                | MiddleName
                | SchematizedXML
                | VerifiableCredential
                | State
                // | Statement
                | Street
                | Surname
                | ZipCode;

            export const CLASSES = [
                AffiliationOrganization,
                AffiliationRole,
                AffiliationUnit,
                BirthCity,
                BirthCountry,
                BirthDay,
                BirthMonth,
                BirthState,
                BirthYear,
                City,
                Country,
                GivenName,
                HonorificPrefix,
                HonorificSuffix,
                HouseNumber,
                MiddleName,
                SchematizedXML,
                VerifiableCredential,
                State,
                // Statement,
                Street,
                Surname,
                ZipCode
            ];

            export const TYPE_NAMES = [
                "AffiliationOrganization",
                "AffiliationRole",
                "AffiliationUnit",
                "BirthCity",
                "BirthCountry",
                "BirthDay",
                "BirthMonth",
                "BirthState",
                "BirthYear",
                "City",
                "Country",
                "GivenName",
                "HonorificPrefix",
                "HonorificSuffix",
                "HouseNumber",
                "MiddleName",
                "SchematizedXML",
                "VerifiableCredential",
                "State",
                // "Statement",
                "Street",
                "Surname",
                "ZipCode"
            ] as const;

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

    export module Relationship {
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
