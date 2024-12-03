import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { AccountController, AttributeTagClient, ClientResult, Transport } from "@nmshd/transport";
import { spy, when } from "ts-mockito";
import { ConsumptionController } from "../../../src";
import { TestUtil } from "../../core/TestUtil";

describe("AttributeTagCollection", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let consumptionController: ConsumptionController;
    let accountController: AccountController;

    let mockedClient: AttributeTagClient;

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

        const accounts = await TestUtil.provideAccounts(transport, 1);
        ({ consumptionController, accountController } = accounts[0]);

        const client = consumptionController.attributes["attributeTagClient"];
        mockedClient = spy(client);
    });

    afterAll(async function () {
        await accountController.close();

        await connection.close();
    });

    test("should receive the legal tags from the Backbone", async function () {
        when(mockedClient.getBackboneAttributeTagCollection()).thenResolve(ClientResult.ok(mockTags));
        const tags = await consumptionController.attributes.getAttributeTagCollection();

        expect(tags.toJSON()).toStrictEqualExcluding(mockTags, "@type");
    });
});
