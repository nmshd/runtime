import { MongoClient } from "mongodb";

// Connection URL
const url = "mongodb://localhost:27022";
const client = new MongoClient(url);

// Database Name
const dbName = "myProject";

test("Test", async () => {
    // Use connect method to connect to the server
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("documents");
    await collection.deleteMany();
    await collection.insertMany([
        {
            "@type": "Relationship",
            cache: {
                changes: [
                    {
                        id: "RCH0XEkiYuXKFmpXmYUe",
                        relationshipId: "RELGnFs6C7kVoOgNzUKJ",
                        request: {
                            content: {
                                "@type": "RelationshipCreationChangeRequestContent",
                                response: {
                                    items: [
                                        {
                                            "@type": "ResponseItemGroup",
                                            items: [
                                                {
                                                    "@type": "CreateAttributeAcceptResponseItem",
                                                    attributeId: "ATTJJkn3k1YlkLIZbZaF",
                                                    result: "Accepted"
                                                },
                                                {
                                                    "@type": "CreateAttributeAcceptResponseItem",
                                                    attributeId: "ATT68AHMyIsiRao7K2Ed",
                                                    result: "Accepted"
                                                }
                                            ]
                                        }
                                    ],
                                    requestId: "REQEUk15dylez0BEmuTj",
                                    result: "Accepted"
                                }
                            },
                            createdAt: "2024-03-28T16:23:10.776Z",
                            createdBy: "id1FqXaGvP3wWNPtDPckHr72cpst3PymMsuJ",
                            createdByDevice: "DVCYMt2RsavpYvNnYasm"
                        },
                        status: "Pending",
                        type: "Creation"
                    }
                ],
                template: {
                    cache: {
                        content: {
                            "@type": "RelationshipTemplateContent",
                            onNewRelationship: {
                                items: [
                                    {
                                        "@type": "RequestItemGroup",
                                        items: [
                                            {
                                                "@type": "CreateAttributeRequestItem",
                                                attribute: {
                                                    "@type": "RelationshipAttribute",
                                                    confidentiality: "protected",
                                                    isTechnical: false,
                                                    key: "givenName",
                                                    owner: "id18Ha8LgpfPcLMcc8uVei5WWigZEdSaAhh7",
                                                    value: {
                                                        "@type": "ProprietaryString",
                                                        title: "aTitle",
                                                        value: "aProprietaryStringValue"
                                                    }
                                                },
                                                mustBeAccepted: true
                                            },
                                            {
                                                "@type": "CreateAttributeRequestItem",
                                                attribute: {
                                                    "@type": "RelationshipAttribute",
                                                    confidentiality: "protected",
                                                    isTechnical: false,
                                                    key: "surname",
                                                    owner: "id18Ha8LgpfPcLMcc8uVei5WWigZEdSaAhh7",
                                                    value: {
                                                        "@type": "ProprietaryString",
                                                        title: "aTitle",
                                                        value: "aProprietaryStringValue"
                                                    }
                                                },
                                                mustBeAccepted: true
                                            }
                                        ],
                                        mustBeAccepted: true,
                                        title: "Templator Attributes"
                                    }
                                ]
                            }
                        },
                        createdAt: "2024-03-28T16:23:03.918Z",
                        createdBy: "id18Ha8LgpfPcLMcc8uVei5WWigZEdSaAhh7",
                        createdByDevice: "DVCEvgIp3PmCeu3gwdVh",
                        expiresAt: "2024-03-28T16:33:03.487Z",
                        identity: {
                            address: "id18Ha8LgpfPcLMcc8uVei5WWigZEdSaAhh7",
                            publicKey: { pub: "rXXy45FB27z8xqrWzZNAqAcL6hL-WKH6IXjemW2qXSo", alg: 3 },
                            realm: "id1"
                        },
                        maxNumberOfAllocations: 1,
                        templateKey: {
                            id: "TRPRTKTFrGZkwH4QYpTw",
                            pub: "a95IE6kTjf2ma3NOmxGFvGN21-Rjc-Yft6jUlqnwnj4",
                            alg: 3
                        }
                    },
                    cachedAt: "2024-03-28T16:23:05.139Z",
                    id: "RLTbNMGIBIIVtTFxmE6x",
                    isOwn: false,
                    secretKey: { key: "nW4J239kEIg6DIxaCj20-fADMRUGJlB1Krz0gmrnnY4", alg: 3 }
                }
            },
            cachedAt: "2024-03-28T16:23:10.634Z",
            id: "RELGnFs6C7kVoOgNzUKJ",
            peer: {
                address: "id18Ha8LgpfPcLMcc8uVei5WWigZEdSaAhh7",
                publicKey: { pub: "rXXy45FB27z8xqrWzZNAqAcL6hL-WKH6IXjemW2qXSo", alg: 3 },
                realm: "id1"
            },
            relationshipSecretId: "TRPRSEqhNwmJn2E0twbY",
            status: "Pending",
            peerAddress: "id18Ha8LgpfPcLMcc8uVei5WWigZEdSaAhh7",
            templateId: "RLTbNMGIBIIVtTFxmE6x"
        }
    ]);

    await collection.find({}).toArray();
    await client.close();
});
