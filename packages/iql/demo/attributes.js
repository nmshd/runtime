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
        tags: ["emergency", "hello world", "pew"],
        validFrom: "2021-02-03T00:00:00",
        validTo: "2024-01-01T00:00:00",
        flag: true
    },
    {
        value: {
            "@type": "GivenName",
            value: "Steven Nicholas"
        },
        validFrom: "2020-01-01T00:00:00",
        validTo: "2023-11-01T00:00:00",
        flag: true,
        emptyValue: ""
    },
    {
        value: {
            "@type": "LastName",
            value: "O'Malley"
        },
        validFrom: "2021-01-01T00:00:00",
        validTo: "2023-12-01T00:00:00",
        friends: ["Hans Peter", "Julia", "'X' \\\\ '", "'X'\\\\'"]
    },
    {
        value: {
            "@type": "LanguageCertification",
            grade: "c1",
            language: "en",
            validFrom: "2021-01-01T00:00:00",
            validTo: "2023-01-01T00:00:00",
            lvl1: {
                lvl2: {
                    lvl3: "hello world",
                    date: "2019-03-11",
                    cities: ["Paris", "New York"]
                }
            }
        },
        validFrom: "2021-01-01T00:00:00",
        validTo: "2023-01-01T00:00:00",
        peer: "idasdf0x123152",
        tags: ["language:en", "language:de"]
    },
    {
        value: {
            "@type": "LanguageCertification",
            grade: "b2",
            language: "de"
        },
        tags: ["language:en", "language:es"],
        validFrom: "2021-01-01T00:00:00",
        validTo: "2028-01-01T00:00:00"
    },
    {
        value: {
            "@type": "FileReference",
            id: "0xaffed00fdecafbad"
        },
        tags: ["language:de", "language:en", "content:edu.de.higher.certOfEnrolment", "#hashtag pewpew"],
        validFrom: "2019-01-01T00:00:00",
        validTo: "2020-01-14T00:00:00"
    },
    {
        value: {
            "@type": "FileReference",
            id: "0xdeadbeef"
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
]
