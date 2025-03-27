import { GivenName, HonorificPrefix, HonorificSuffix, MiddleName, PersonName, Surname } from "../../src";
import { GenericValueTest } from "./GenericValueTest";

new GenericValueTest().runParametrized({
    testName: "PersonName Test (no Titles)",
    typeName: "PersonName",
    typeClass: PersonName,
    expectedJSON: {
        "@type": "PersonName",
        givenName: "Test GivenName",
        surname: "TestSurname"
    },
    valueJSON: {
        "@type": "PersonName",
        givenName: "Test GivenName",
        surname: "TestSurname"
    },
    valueVerboseJSON: {
        "@type": "PersonName",
        givenName: "Test GivenName",
        surname: {
            "@type": "Surname",
            value: "TestSurname"
        }
    },
    valueInterface: {
        givenName: "Test GivenName",
        surname: Surname.fromAny("TestSurname")
    },
    valueString: "Test GivenName TestSurname"
});

new GenericValueTest().runParametrized({
    testName: "PersonName Test (with Prefix)",
    typeName: "PersonName",
    typeClass: PersonName,
    expectedJSON: {
        "@type": "PersonName",
        givenName: "TestGivenName1 TestGivenName2",
        middleName: "Middler",
        surname: "TestSurname",
        honorificPrefix: "anHonorificPrefix",
        honorificSuffix: "anHonorificSuffix"
    },
    valueJSON: {
        "@type": "PersonName",
        givenName: "TestGivenName1 TestGivenName2",
        middleName: "Middler",
        surname: "TestSurname",
        honorificPrefix: "anHonorificPrefix",
        honorificSuffix: "anHonorificSuffix"
    },
    valueVerboseJSON: {
        "@type": "PersonName",
        givenName: {
            "@type": "GivenName",
            value: "TestGivenName1 TestGivenName2"
        },
        middleName: {
            "@type": "MiddleName",
            value: "Middler"
        },
        surname: {
            "@type": "Surname",
            value: "TestSurname"
        },
        honorificPrefix: {
            "@type": "HonorificPrefix",
            value: "anHonorificPrefix"
        },
        honorificSuffix: {
            "@type": "HonorificSuffix",
            value: "anHonorificSuffix"
        }
    },
    valueInterface: {
        givenName: GivenName.fromAny("TestGivenName1 TestGivenName2"),
        middleName: MiddleName.fromAny("Middler"),
        surname: Surname.fromAny("TestSurname"),
        honorificPrefix: HonorificPrefix.fromAny("anHonorificPrefix"),
        honorificSuffix: HonorificSuffix.fromAny("anHonorificSuffix")
    },
    valueString: "anHonorificPrefix TestGivenName1 TestGivenName2 Middler TestSurname anHonorificSuffix"
});
