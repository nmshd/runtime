import { BirthCity, BirthCountry, BirthDate, BirthDay, BirthMonth, BirthPlace, BirthState, BirthYear } from "@nmshd/content";
import { GenericValueTest } from "./GenericValueTest.js";

new GenericValueTest().runParametrized({
    testName: "BirthDate Test",
    typeName: "BirthDate",
    typeClass: BirthDate,
    expectedJSON: {
        "@type": "BirthDate",
        day: 15,
        month: 7,
        year: 2010
    },
    valueJSON: {
        "@type": "BirthDate",
        day: 15,
        month: 7,
        year: 2010
    },
    valueVerboseJSON: {
        "@type": "BirthDate",
        day: {
            "@type": "BirthDay",
            value: 15
        },
        month: {
            "@type": "BirthMonth",
            value: 7
        },
        year: {
            "@type": "BirthYear",
            value: 2010
        }
    },
    valueInterface: {
        day: BirthDay.fromAny(15),
        month: BirthMonth.fromAny(7),
        year: BirthYear.fromAny(2010)
    },
    valueString: "2010-07-15"
});

new GenericValueTest().runParametrized({
    testName: "BirthPlace Test",
    typeName: "BirthPlace",
    typeClass: BirthPlace,
    expectedJSON: {
        "@type": "BirthPlace",
        city: "Bruchsal",
        country: "DE"
    },
    valueJSON: {
        "@type": "BirthPlace",
        city: "Bruchsal",
        country: "DE"
    },
    valueVerboseJSON: {
        "@type": "BirthPlace",
        city: {
            "@type": "BirthCity",
            value: "Bruchsal"
        },
        country: {
            "@type": "BirthCountry",
            value: "DE"
        }
    },
    valueInterface: {
        city: BirthCity.fromAny("Bruchsal"),
        country: BirthCountry.fromAny("DE")
    },
    valueString: "Bruchsal, DE"
});

new GenericValueTest().runParametrized({
    testName: "BirthPlace Test (with State)",
    typeName: "BirthPlace",
    typeClass: BirthPlace,
    expectedJSON: {
        "@type": "BirthPlace",
        city: "Bruchsal",
        country: "DE",
        state: "Baden-Württemberg"
    },
    valueJSON: {
        "@type": "BirthPlace",
        city: "Bruchsal",
        country: "DE",
        state: "Baden-Württemberg"
    },
    valueVerboseJSON: {
        "@type": "BirthPlace",
        city: {
            "@type": "BirthCity",
            value: "Bruchsal"
        },
        country: {
            "@type": "BirthCountry",
            value: "DE"
        },
        state: {
            "@type": "BirthState",
            value: "Baden-Württemberg"
        }
    },
    valueInterface: {
        city: BirthCity.fromAny("Bruchsal"),
        country: BirthCountry.fromAny("DE"),
        state: BirthState.fromAny("Baden-Württemberg")
    },
    valueString: "Bruchsal, Baden-Württemberg, DE"
});
