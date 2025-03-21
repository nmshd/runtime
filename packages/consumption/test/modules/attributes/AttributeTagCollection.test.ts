import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, ClientResult, TagClient, Transport } from "@nmshd/transport";
import { anything, spy, when } from "ts-mockito";
import { AttributeTagCollection, ConsumptionController } from "../../../src";
import { TestUtil } from "../../core/TestUtil";

describe("AttributeTagCollection", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let consumptionController: ConsumptionController;
    let accountController: AccountController;

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
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        ({ consumptionController, accountController } = (await TestUtil.provideAccounts(transport, 1))[0]);

        const client = consumptionController.attributes["attributeTagClient"];
        mockedClient = spy(client);
    });

    afterAll(async function () {
        await accountController.close();

        await connection.close();
    });

    test("should receive the legal tags from the Backbone", async function () {
        when(mockedClient.getTagCollection(anything())).thenResolve(ClientResult.ok(mockTags));
        const tags = await consumptionController.attributes.getAttributeTagCollection();

        expect(tags).toStrictEqual(AttributeTagCollection.from(mockTags));
    });
});
