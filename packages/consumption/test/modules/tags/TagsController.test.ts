import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { sleep } from "@js-soft/ts-utils";
import { AccountController, ClientResult, TagClient, Transport } from "@nmshd/transport";
import { anything, reset, spy, verify, when } from "ts-mockito";
import { AttributeTagCollection, ConsumptionController, TagsController } from "../../../src";
import { TestUtil } from "../../core/TestUtil";
import { MockEventBus } from "../MockEventBus";

const mockEventBus = new MockEventBus();

describe("tag definition caching by time", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;
    let testAccount: AccountController;
    let consumptionController: ConsumptionController;
    let tagClientSpy: TagClient;
    beforeEach(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport(connection, mockEventBus, {
            tagCacheLifetimeInMinutes: 1 / 60
        });
        await transport.init();

        const connectorAccount = (await TestUtil.provideAccounts(transport, 1))[0];
        ({ accountController: testAccount, consumptionController } = connectorAccount);
        const tagClient = consumptionController.tags["tagClient"];

        tagClientSpy = spy(tagClient);
        when(tagClientSpy.get("/api/v1/Tags", anything(), anything())).thenResolve(
            ClientResult.ok(
                AttributeTagCollection.from({
                    supportedLanguages: ["en"],
                    tagsForAttributeValueTypes: {}
                }).toJSON(),
                {
                    etag: "some-e-tag"
                }
            )
        );
    });

    afterEach(async function () {
        await testAccount.close();
        await connection.close();
        reset(tagClientSpy);
    });

    test("should cache the tag definitions when called twice within tagCachingDurationInMinutes", async function () {
        await consumptionController.tags.getAttributeTagCollection();
        await consumptionController.tags.getAttributeTagCollection();

        verify(tagClientSpy.getTagCollection(anything())).once();
        reset(tagClientSpy);
    });

    test("should not cache the tag definitions when the tagCachingDurationInMinutes was reached", async function () {
        await consumptionController.tags.getAttributeTagCollection();
        await sleep(1100);
        await consumptionController.tags.getAttributeTagCollection();

        verify(tagClientSpy.getTagCollection(anything())).twice();
        reset(tagClientSpy);
    });
});

describe("tag definition caching by e-tag", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;
    let testAccount: AccountController;
    let consumptionController: ConsumptionController;
    let tagClientSpy: TagClient;
    let tagsControllerSpy: TagsController;
    let etag: string;
    beforeEach(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport(connection, mockEventBus, {
            tagCacheLifetimeInMinutes: 0
        });
        await transport.init();

        const connectorAccount = (await TestUtil.provideAccounts(transport, 1))[0];
        ({ accountController: testAccount, consumptionController } = connectorAccount);
        const tagClient = consumptionController.tags["tagClient"];

        tagClientSpy = spy(tagClient);
        tagsControllerSpy = spy(consumptionController.tags);

        etag = "some-e-tag";
        when(tagClientSpy.get("/api/v1/Tags", anything(), anything())).thenCall((_path, _params, config) => {
            const etagMatched = etag === config?.headers?.["if-none-match"];
            const platformParameters = {
                etag,
                responseStatus: etagMatched ? 304 : 200
            };
            return Promise.resolve(
                ClientResult.ok(
                    etagMatched
                        ? undefined
                        : AttributeTagCollection.from({
                              supportedLanguages: ["en"],
                              tagsForAttributeValueTypes: {}
                          }).toJSON(),
                    platformParameters
                )
            );
        });
    });

    afterEach(async function () {
        await testAccount.close();
        await connection.close();
        reset(tagClientSpy);
        reset(tagsControllerSpy);
    });

    test("should cache the tag definitions when called twice without new etag", async function () {
        await consumptionController.tags.getAttributeTagCollection();
        await sleep(100);
        await consumptionController.tags.getAttributeTagCollection();

        verify(tagClientSpy.getTagCollection(anything())).twice();
        verify(tagsControllerSpy["setTagCollection"](anything())).once();
    });

    test("should not cache the tag definitions when called twice with new etag", async function () {
        await consumptionController.tags.getAttributeTagCollection();
        await sleep(100);
        etag = "some-other-e-tag";
        await consumptionController.tags.getAttributeTagCollection();

        verify(tagClientSpy.getTagCollection(anything())).twice();
        verify(tagsControllerSpy["setTagCollection"](anything())).twice();
    });
});
