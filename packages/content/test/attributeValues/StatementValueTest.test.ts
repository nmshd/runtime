import { DigitalIdentityDescriptor, Statement, StatementIssuerConditions, StatementObject, StatementPredicate, StatementSubject } from "../../src";
import { GenericValueTest } from "./GenericValueTest";

new GenericValueTest().runParametrized({
    testName: "Statement Test",
    typeName: "Statement",
    typeClass: Statement,
    expectedJSON: {
        "@type": "Statement",
        subject: {
            address: "id1234"
        },
        predicate: {
            value: "hasAttribute"
        },
        object: {
            address: "id1235",
            attributes: [
                {
                    givenName: "Max",
                    surname: "Mustermann"
                }
            ]
        },
        issuer: {
            address: "id1236"
        },
        issuerConditions: {
            validFrom: "2023-06-01T00:00:00.000Z",
            validTo: "2023-06-01T00:00:00.000Z",
            evidence: {
                value: "ownFact"
            },
            authorityType: {
                value: "ownAuthority"
            }
        }
    },
    valueJSON: {
        "@type": "Statement",
        subject: {
            address: "id1234"
        },
        predicate: "hasAttribute",
        object: {
            address: "id1235",
            attributes: [
                {
                    givenName: "Max",
                    surname: "Mustermann"
                }
            ]
        },
        issuer: {
            address: "id1236"
        },
        issuerConditions: {
            validFrom: "2023-06-01T00:00:00.000Z",
            validTo: "2023-06-01T00:00:00.000Z",
            evidence: {
                value: "ownFact"
            },
            authorityType: {
                value: "ownAuthority"
            }
        }
    },
    valueVerboseJSON: {
        "@type": "Statement",
        subject: {
            address: "id1234"
        },
        predicate: "hasAttribute",
        object: {
            address: "id1235",
            attributes: [
                {
                    givenName: "Max",
                    surname: "Mustermann"
                }
            ]
        },
        issuer: {
            address: "id1236"
        },
        issuerConditions: {
            validFrom: "2023-06-01T00:00:00.000Z",
            validTo: "2023-06-01T00:00:00.000Z",
            evidence: {
                "@type": "StatementEvidence",
                value: "ownFact"
            },
            authorityType: {
                "@type": "StatementAuthorityType",
                value: "ownAuthority"
            }
        }
    },
    valueInterface: {
        subject: StatementSubject.fromAny({ address: "id1234" }),
        predicate: StatementPredicate.fromAny("hasAttribute"),
        object: StatementObject.fromAny({
            address: "id1235",
            attributes: [
                {
                    givenName: "Max",
                    surname: "Mustermann"
                }
            ]
        }),
        issuer: DigitalIdentityDescriptor.fromAny({ address: "id1236" }),
        issuerConditions: StatementIssuerConditions.fromAny({
            validTo: "2023-06-01T00:00:00.000Z",
            validFrom: "2023-06-01T00:00:00.000Z",
            evidence: {
                "@type": "StatementEvidence",
                value: "ownFact"
            },
            authorityType: {
                "@type": "StatementAuthorityType",
                value: "ownAuthority"
            }
        })
    }
});
new GenericValueTest().runParametrized({
    testName: "Statement Test (with z- predicate)",
    typeName: "Statement",
    typeClass: Statement,
    expectedJSON: {
        "@type": "Statement",
        subject: {
            address: "id1234"
        },
        predicate: {
            value: "z-isTeacher"
        },
        object: {
            address: "id1235"
        },
        issuer: {
            address: "id1236"
        },
        issuerConditions: {
            validFrom: "2023-06-01T00:00:00.000Z",
            validTo: "2023-06-01T00:00:00.000Z",
            evidence: {
                value: "ownFact"
            },
            authorityType: {
                value: "ownAuthority"
            }
        }
    },
    valueJSON: {
        "@type": "Statement",
        subject: {
            address: "id1234"
        },
        predicate: "z-isTeacher",
        object: {
            address: "id1235"
        },
        issuer: {
            address: "id1236"
        },
        issuerConditions: {
            validFrom: "2023-06-01T00:00:00.000Z",
            validTo: "2023-06-01T00:00:00.000Z",
            evidence: {
                value: "ownFact"
            },
            authorityType: {
                value: "ownAuthority"
            }
        }
    },
    valueVerboseJSON: {
        "@type": "Statement",
        subject: {
            address: "id1234"
        },
        predicate: "z-isTeacher",
        object: {
            address: "id1235"
        },
        issuer: {
            address: "id1236"
        },
        issuerConditions: {
            validFrom: "2023-06-01T00:00:00.000Z",
            validTo: "2023-06-01T00:00:00.000Z",
            evidence: {
                "@type": "StatementEvidence",
                value: "ownFact"
            },
            authorityType: {
                "@type": "StatementAuthorityType",
                value: "ownAuthority"
            }
        }
    },
    valueInterface: {
        subject: StatementSubject.fromAny({ address: "id1234" }),
        predicate: StatementPredicate.fromAny("z-isTeacher"),
        object: StatementObject.fromAny({ address: "id1235" }),
        issuer: DigitalIdentityDescriptor.fromAny({ address: "id1236" }),
        issuerConditions: StatementIssuerConditions.fromAny({
            validTo: "2023-06-01T00:00:00.000Z",
            validFrom: "2023-06-01T00:00:00.000Z",
            evidence: {
                "@type": "StatementEvidence",
                value: "ownFact"
            },
            authorityType: {
                "@type": "StatementAuthorityType",
                value: "ownAuthority"
            }
        })
    }
});

describe("Statement negative Test", function () {
    describe("Statement set to 'hasPredicate'", function () {
        test.each([
            {
                address: "id1235",
                attributes: []
            },
            {
                address: "id1235"
            }
        ])("should throw ValidationError for invalid input", function (value: any) {
            const invalidStatement = {
                "@type": "Statement",
                subject: {
                    address: "id1234"
                },
                predicate: "hasAttribute",
                object: value,
                issuer: {
                    address: "id1236"
                },
                issuerConditions: {
                    validFrom: "2023-06-01T00:00:00.000Z",
                    validTo: "2023-06-01T00:00:00.000Z",
                    evidence: {
                        value: "ownFact"
                    },
                    authorityType: {
                        value: "ownAuthority"
                    }
                }
            };
            expect(() => Statement.fromAny(invalidStatement)).toThrow("If the predicate of the Statement is 'hasAttribute' you have to define attributes in 'object.attributes'");
        });
    });
});
