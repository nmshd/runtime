import { DigitalIdentityDescriptor, Statement, StatementIssuerConditions, StatementObject, StatementPredicate, StatementSubject } from "@nmshd/content";
import { GenericValueTest } from "./GenericValueTest.js";

new GenericValueTest().runParametrized({
    testName: "Statement Test",
    typeName: "Statement",
    typeClass: Statement,
    expectedJSON: {
        "@type": "Statement",
        subject: {
            address: "did:e:a-domain:dids:anidentity"
        },
        predicate: {
            value: "hasAttribute"
        },
        object: {
            address: "did:e:a-domain:dids:anidentity",
            attributes: [
                {
                    givenName: "Max",
                    surname: "Mustermann"
                }
            ]
        },
        issuer: {
            address: "did:e:a-domain:dids:anidentity"
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
            address: "did:e:a-domain:dids:anidentity"
        },
        predicate: "hasAttribute",
        object: {
            address: "did:e:a-domain:dids:anidentity",
            attributes: [
                {
                    givenName: "Max",
                    surname: "Mustermann"
                }
            ]
        },
        issuer: {
            address: "did:e:a-domain:dids:anidentity"
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
            address: "did:e:a-domain:dids:anidentity"
        },
        predicate: "hasAttribute",
        object: {
            address: "did:e:a-domain:dids:anidentity",
            attributes: [
                {
                    givenName: "Max",
                    surname: "Mustermann"
                }
            ]
        },
        issuer: {
            address: "did:e:a-domain:dids:anidentity"
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
        subject: StatementSubject.fromAny({ address: "did:e:a-domain:dids:anidentity" }),
        predicate: StatementPredicate.fromAny("hasAttribute"),
        object: StatementObject.fromAny({
            address: "did:e:a-domain:dids:anidentity",
            attributes: [
                {
                    givenName: "Max",
                    surname: "Mustermann"
                }
            ]
        }),
        issuer: DigitalIdentityDescriptor.fromAny({ address: "did:e:a-domain:dids:anidentity" }),
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
            address: "did:e:a-domain:dids:anidentity"
        },
        predicate: {
            value: "z-isTeacher"
        },
        object: {
            address: "did:e:a-domain:dids:anidentity"
        },
        issuer: {
            address: "did:e:a-domain:dids:anidentity"
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
            address: "did:e:a-domain:dids:anidentity"
        },
        predicate: "z-isTeacher",
        object: {
            address: "did:e:a-domain:dids:anidentity"
        },
        issuer: {
            address: "did:e:a-domain:dids:anidentity"
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
            address: "did:e:a-domain:dids:anidentity"
        },
        predicate: "z-isTeacher",
        object: {
            address: "did:e:a-domain:dids:anidentity"
        },
        issuer: {
            address: "did:e:a-domain:dids:anidentity"
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
        subject: StatementSubject.fromAny({ address: "did:e:a-domain:dids:anidentity" }),
        predicate: StatementPredicate.fromAny("z-isTeacher"),
        object: StatementObject.fromAny({ address: "did:e:a-domain:dids:anidentity" }),
        issuer: DigitalIdentityDescriptor.fromAny({ address: "did:e:a-domain:dids:anidentity" }),
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
                address: "did:e:a-domain:dids:anidentity",
                attributes: []
            },
            {
                address: "did:e:a-domain:dids:anidentity"
            }
        ])("should throw ValidationError for invalid input", function (value: any) {
            const invalidStatement = {
                "@type": "Statement",
                subject: {
                    address: "did:e:a-domain:dids:anidentity"
                },
                predicate: "hasAttribute",
                object: value,
                issuer: {
                    address: "did:e:a-domain:dids:anidentity"
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
