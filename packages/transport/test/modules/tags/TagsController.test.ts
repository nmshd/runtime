import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { spy, when } from "ts-mockito";
import { AccountController, ClientResult, TagClient, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("TagsController", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let account: AccountController;

    let mockedClient: TagClient;

    /* eslint-disable @typescript-eslint/naming-convention */
    const mockTags = {
        supportedLanguages: ["de", "en"],
        tagsForAttributeValueTypes: {
            PhoneNumber: {
                emergency: {
                    displayNames: {
                        de: "Notfallkontakt",
                        en: "Emergency Contact"
                    },
                    children: {
                        first: {
                            displayNames: {
                                de: "Erster Notfallkontakt",
                                en: "First Emergency Contact"
                            }
                        },
                        second: {
                            displayNames: {
                                de: "Zweiter Notfallkontakt",
                                en: "Second Emergency Contact"
                            }
                        }
                    }
                },
                private: {
                    displayNames: {
                        de: "Privat",
                        en: "Private"
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

        const client = account.tags["client"];
        mockedClient = spy(client);
    });

    afterAll(async function () {
        await account.close();

        await connection.close();
    });

    test("should receive the legal tags from the Backbone", async function () {
        when(mockedClient.getTags()).thenResolve(ClientResult.ok(mockTags));
        const tags = await account.tags.getTags();

        expect(tags.toJSON()).toStrictEqualExcluding(mockTags, "@type");
    });
});
