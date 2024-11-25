import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, ClientResult, TagClient, Transport } from "../../../src";
import { RestClientMocker } from "../../testHelpers/RestClientMocker";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("TagsController", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let account: AccountController;

    let clientMocker: RestClientMocker<TagClient>;

    /* eslint-disable @typescript-eslint/naming-convention */
    const mockTags = {
        supportedLanguages: ["de", "en"],
        tagsForAttributeValueTypes: {
            IdentityFileReference: {
                schulabschluss: {
                    displayNames: {
                        de: "Abschluss",
                        en: "Degree"
                    },
                    children: {
                        realschule: {
                            displayNames: {
                                de: "Realschule",
                                en: "Secondary School"
                            },
                            children: {
                                zeugnis: {
                                    displayNames: {
                                        de: "Zeugnis",
                                        en: "Diploma"
                                    }
                                }
                            }
                        },
                        gymnasium: {
                            displayNames: {
                                de: "Gymnasium",
                                en: "High School"
                            },
                            children: {
                                zeugnis: {
                                    displayNames: {
                                        de: "Zeugnis",
                                        en: "Diploma"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            PhoneNumber: {
                notfall: {
                    displayNames: {
                        de: "Notfallkontakt",
                        en: "Emergency Contact"
                    }
                }
            },
            StreetAddress: {
                lieferung: {
                    displayNames: {
                        de: "Lieferadresse",
                        en: "Deliver Address"
                    }
                },
                heimat: {
                    displayNames: {
                        de: "Heimatadresse",
                        en: "Home Address"
                    }
                }
            }
        }
    };
    /* eslint-enable @typescript-eslint/naming-convention */

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 1);
        account = accounts[0];

        const client = (account.tags as any).client as TagClient;
        clientMocker = new RestClientMocker(client);
    });

    afterAll(async function () {
        await account.close();

        await connection.close();
    });

    test("should receive the legal tags from the Backbone", async function () {
        clientMocker.mockMethod("getTags", () => {
            return ClientResult.ok(mockTags);
        });
        const tags = await account.tags.getTags();

        expect(tags.toJSON()).toStrictEqualExcluding(mockTags, "@type");
    });
});
