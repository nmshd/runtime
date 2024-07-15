/* Dummy data for the demo. */
export const attributes = [
    {
        value: {
            "@type": "PhoneNumber",
            value: "06221/215221"
        },
        validFrom: "2011-01-01T00:00:00",
        validTo: "2013-01-01T00:00:00"
    },
    {
        value: {
            "@type": "PhoneNumber",
            value: "06221/553132"
        },
        tags: ["emergency"],
        validFrom: "2021-02-03T00:00:00",
        validTo: "2024-01-01T00:00:00"
    },
    {
        value: {
            "@type": "Website",
            value: "https://enmeshed.eu"
        }
    },
    {
        value: {
            "@type": "GivenName",
            value: "Steven-Nicholas"
        },
        validFrom: "2020-01-01T00:00:00",
        validTo: "2023-11-01T00:00:00"
    },
    {
        value: {
            "@type": "LastName",
            value: "O'Malley"
        },
        validFrom: "2021-01-01T00:00:00",
        validTo: "2023-12-01T00:00:00"
    },
    {
        value: {
            "@type": "StreetAddress",
            recipient: "Steven-Nicholas O'Malley",
            street: "Luisenstr.",
            houseNo: "7",
            zipCode: "76646",
            city: "Bruchsal",
            country: "DE"
        },
        tags: ["delivery", "business"]
    },
    {
        value: {
            "@type": "StreetAddress",
            recipient: "Steven-Nicholas O'Malley",
            street: "Frankfurter Straße",
            houseNo: "81",
            zipCode: "76646",
            city: "Bruchsal",
            country: "DE"
        },
        tags: ["private"]
    },
    {
        value: {
            "@type": "IdentityFileReference",
            value: "0xdeadbeef"
        },
        tags: [
            "urn:xbildung-de:xbildung:codeliste:artdesnachweises=http://www.xbildung.de/def/xbildung/0.9/code/ArtDesNachweises",
            "urn:xhochschule-de:destatis:codeliste:artdeshsa=http://xhochschule.de/def/destatis/WS22/code/ArtDesHSA/111",
            "urn:xbildung-de:unesco:codeliste:isced2011=6",
            "urn:xbildung-de:unesco:codeliste:isced2011=64",
            "urn:xbildung-de:unesco:codeliste:isced2011=647",
            "content:edu.de.higher.certOfEnrolment",
            "language:es"
        ],
        validFrom: "2021-01-01T00:00:00",
        validTo: "2023-01-01T00:00:00"
    }
];
