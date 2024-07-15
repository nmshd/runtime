import _ from "lodash";
import * as iql from "../dist/index.js";

/* Dummy data. */
const attributes = [
    {
        // 0
        value: {
            "@type": "PhoneNumber",
            value: "06221/215221"
        },
        tags: ["emergency"]
    },
    {
        // 1
        value: {
            "@type": "PhoneNumber",
            value: "06221/553132"
        },
        flag: true,
        emptyVal: ""
    },
    {
        // 2
        value: {
            "@type": "Foo",
            bar: "Baz",
            fizz: "buzz",
            foo: "a 'b' c",
            ping: "pong()!@#$",
            lvl1: {
                lvl2: {
                    lvl3: "hello world",
                    date: "2019-03-11",
                    cities: ["Paris", "New York"]
                }
            }
        },
        tags: ["language:en", "content:edu.de.higher.bachelor.ofScience"],
        flag: true,
        arr: [String.raw`'X' \\ '`, String.raw`'X'\\'`]
    },
    {
        // 3
        value: {
            "@type": "FileReference",
            id: "0xaffed00fdecafbad",
            lvl1: {
                lvl2: {
                    lvl3: "hello world",
                    date: "2021-03-11"
                }
            }
        },
        tags: ["language:de", "language:en", "content:edu.de.higher.certOfEnrolment"]
    },
    {
        // 4
        value: {
            "@type": "FileReference",
            id: "0xdeadbeefbi6b00bs"
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
        peer: "idasdf0x123152",
        friends: ["Peter", "Julia"]
    },
    {
        // 5
        value: {
            "@type": "LanguageCertification",
            grade: "c1",
            language: "en",
            validFrom: "2021-01-01T00:00:00",
            validTo: "2025-01-01T00:00:00"
        },
        validFrom: "2021-01-01T00:00:00",
        validTo: "2025-01-01T00:00:00",
        peer: "idasdf0x123152",
        tags: ["language:en", "language:de", "language:es"],
        friends: ["Peter"],
        emptyArr: [],
        emptyDict: {}
    }
];

test("Check validity", () => {
    const table = [
        // Valid queries
        // Match by tag without whitespaces
        { iqlQuery: "LanguageCertification.validTo>2023-01-01", isValid: true },
        { iqlQuery: "#isthisthereallife?", isValid: true },
        { iqlQuery: "!#isthisthereallife?", isValid: true },
        { iqlQuery: "!!#isthisthereallife?", isValid: true },
        // Match by tag with whitespaces
        { iqlQuery: "#'is this just fantasy?'", isValid: true },
        // Match by tag with whitespaces
        { iqlQuery: "!#'is this just fantasy?'", isValid: true },
        // Match by tag with whitespaces and single quotes
        { iqlQuery: "#'is this \\'just\\' fantasy?'", isValid: true },
        // Match by attribute type
        { iqlQuery: "PhoneNumber", isValid: true },
        { iqlQuery: "!PhoneNumber", isValid: true },
        // Match by primary field using default fieldname 'valid'
        { iqlQuery: "FirstName=Peter", isValid: true },
        // Match by primary field using an explicit fieldname with its value using whitespaces
        { iqlQuery: "FirstName.value='Peter Pan'", isValid: true },
        // Match by primary field using an explicit fieldname
        { iqlQuery: "FirstName.value=Peter", isValid: true },
        // Match by primary field using an explicit fieldname
        { iqlQuery: "Foo.barBaz=Pow", isValid: true },
        // Match by primary field using an explicit fieldname
        { iqlQuery: "Foo.barBaz='Pow \\'Pow!\\''", isValid: true },
        // Conjunction
        { iqlQuery: "FirstName=Peter && LastName=Pan", isValid: true },
        // Disjunction
        { iqlQuery: "FirstName=Peter || LastName=Pan", isValid: true },
        // Parenthesis
        { iqlQuery: "( FirstName=Peter || LastName=Pan ) && ( #emergency || #vacation )", isValid: true },
        // Parenthesis
        { iqlQuery: "!( FirstName=Peter || LastName=Pan ) && !( #emergency || #vacation )", isValid: true },
        // Metadata field term
        { iqlQuery: "validFrom>2022-01-01T12:00:00", isValid: true },
        // Existence Op
        { iqlQuery: "PhoneNumber?", isValid: true },
        { iqlQuery: "Certificate.signature?", isValid: true },

        // Invalid queries
        // Missing closing single quote
        { iqlQuery: "#'isthisthereallife?", isValid: false },
        // Missing opening single quote
        { iqlQuery: "#isthisthereallife?'", isValid: false },
        // Spurious whitespace before field name
        { iqlQuery: "Foo. barBaz='Pow \\'Pow!\\''", isValid: false },
        // Spurious whitespace after field name
        { iqlQuery: "Foo.barBaz ='Pow \\'Pow!\\''", isValid: false },
        // Spurious whitespace before attribute type
        { iqlQuery: " Foo.barBaz='Pow \\'Pow!\\''", isValid: false },
        // Spurious whitespace after attribute type
        { iqlQuery: "Foo .barBaz='Pow \\'Pow!\\''", isValid: false },
        // Spurious whitespace before field value
        { iqlQuery: "Foo.barBaz= 123", isValid: false },
        // Spurious whitespace after field value
        { iqlQuery: "Foo.barBaz=123 ", isValid: false },
        // Spurious whitespace before quoted field value
        { iqlQuery: "Foo.barBaz= '123'", isValid: false },
        // Spurious whitespace after quoted field value
        { iqlQuery: "Foo.barBaz='123' ", isValid: false },
        // Invalid attribute type
        { iqlQuery: "PhoneNumber(", isValid: false },
        // Missing whitespace inside parens surrounding terms
        { iqlQuery: "(PhoneNumber )", isValid: false },
        { iqlQuery: "( PhoneNumber)", isValid: false }
    ];

    for (const e of table) {
        const result = iql.validate(e.iqlQuery);
        // eslint-disable-next-line jest/no-conditional-in-test
        expect(result.isValid, `IQL query "${e.iqlQuery}" is unexepectedly ${e.isValid ? "invalid" : "valid"}.`).toBe(e.isValid);
    }
});

test("Check queries", () => {
    const table = [
        { iqlQuery: "PhoneNumber", matches: [0, 1] },
        { iqlQuery: "PhoneNumber?", matches: [0, 1] },
        { iqlQuery: "PhoneNumber.value?", matches: [0, 1] },
        { iqlQuery: "PhoneNumber && #emergency", matches: [0] },
        { iqlQuery: "PhoneNumber && tags~emergency", matches: [0] },
        { iqlQuery: "PhoneNumber && !#emergency", matches: [1] },
        { iqlQuery: "PhoneNumber && !tags~emergency", matches: [1] },
        { iqlQuery: "#emergency", matches: [0] },
        { iqlQuery: "#'emergency'", matches: [0] },
        { iqlQuery: "!#emergency", matches: [1, 2, 3, 4, 5] },
        { iqlQuery: "!#'emergency'", matches: [1, 2, 3, 4, 5] },
        { iqlQuery: "#emergency && !#emergency", matches: [] },
        { iqlQuery: "#'emergency' && !#'emergency'", matches: [] },
        { iqlQuery: "!#emergency && #emergency", matches: [] },
        { iqlQuery: "#emergency || !#emergency", matches: [0, 1, 2, 3, 4, 5] },
        { iqlQuery: "!#emergency || #emergency", matches: [0, 1, 2, 3, 4, 5] },
        { iqlQuery: "( #emergency || !#emergency )", matches: [0, 1, 2, 3, 4, 5] },
        { iqlQuery: "( !#emergency || #emergency )", matches: [0, 1, 2, 3, 4, 5] },
        { iqlQuery: "( ( ( !#emergency || #emergency ) ) )", matches: [0, 1, 2, 3, 4, 5] },
        { iqlQuery: "PhoneNumber && ( #emergency || !#emergency )", matches: [0, 1] },
        { iqlQuery: "PhoneNumber && ( !#emergency || #emergency )", matches: [0, 1] },
        { iqlQuery: "( PhoneNumber && ( !#emergency || #emergency ) )", matches: [0, 1] },
        { iqlQuery: "Foo.bar=Baz", matches: [2] },
        { iqlQuery: "Foo.fizz=buzz", matches: [2] },
        { iqlQuery: "Foo.foo='a \\'b\\' c'", matches: [2] },
        { iqlQuery: "Foo.ping=pong()!@#$", matches: [2] },
        { iqlQuery: "Foo.bar=Baz && Foo.fizz=buzz", matches: [2] },
        { iqlQuery: "FileReference && ( #language:de || #language:en )", matches: [3] },
        { iqlQuery: "LanguageCertification.validTo>2024-01-01", matches: [5] },
        { iqlQuery: "Foo.lvl1.lvl2.lvl3='hello world'", matches: [2] },
        { iqlQuery: "Foo.lvl1.lvl2.date>'2019-03-11'", matches: [2] },
        { iqlQuery: "Foo.lvl1.lvl2.date>'2018-03-11'", matches: [2] },
        { iqlQuery: "Foo.lvl1.lvl2.date>'2020-03-11'", matches: [] },
        { iqlQuery: "peer=idasdf0x123152", matches: [4, 5] },
        { iqlQuery: "friends~Peter", matches: [4, 5] },
        { iqlQuery: "friends~Julia", matches: [4] },
        { iqlQuery: "Foo.lvl1.lvl2.cities~Paris", matches: [2] },
        { iqlQuery: "Foo.lvl1.lvl2.cities~'New York'", matches: [2] },
        { iqlQuery: "PhoneNumber=06221/215221", matches: [0] },
        { iqlQuery: "PhoneNumber.value=06221/215221", matches: [0] },
        { iqlQuery: String.raw`arr~\'X\'\\\\\'`, matches: [2] },
        { iqlQuery: String.raw`arr~'\'X\'\\\\\''`, matches: [2] },
        { iqlQuery: String.raw`arr~'\'X\' \\\\ \''`, matches: [2] },
        { iqlQuery: "emptyVal=", matches: [1] },
        { iqlQuery: "emptyVal=''", matches: [1] },
        { iqlQuery: "emptyArr?", matches: [] },
        { iqlQuery: "emptyDict?", matches: [] },
        { iqlQuery: "foobar?", matches: [] }
    ];

    for (const e of table) {
        const matches = iql.execute(e.iqlQuery, attributes);

        // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
        expect(_.isEqual([...matches].sort(), [...e.matches].sort()), `'${e.iqlQuery}' matches records [${matches.toString()}], expected [${e.matches.toString()}].`).toBe(true);
    }
});
