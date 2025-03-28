import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { ThirdPartyRelationshipAttributeQuery } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import { AttributeListenerCreatedEvent, ConsumptionController } from "../../../src";
import { TestUtil } from "../../core/TestUtil";
import { MockEventBus } from "../MockEventBus";

const mockEventBus = new MockEventBus();

describe("AttributeListenersController", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    const dummyQuery = ThirdPartyRelationshipAttributeQuery.from({
        key: "aKey",
        owner: "",
        thirdParty: ["aThirdParty"]
    });
    const dummyPeer = CoreAddress.from("aPeer");

    let consumptionController: ConsumptionController;
    let testAccount: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport(mockEventBus);
        await transport.init();

        const account = (await TestUtil.provideAccounts(connection, transport, 1))[0];
        ({ accountController: testAccount, consumptionController } = account);
    });

    afterAll(async function () {
        await testAccount.close();
        await connection.close();
    });

    beforeEach(function () {
        mockEventBus.clearPublishedEvents();
    });

    afterEach(async function () {
        const listeners = await consumptionController.attributeListeners.getAttributeListeners();

        for (const listener of listeners) {
            await consumptionController.attributeListeners["attributeListeners"].delete(listener);
        }
    });

    test("should create an attribute listener", async function () {
        const listener = await consumptionController.attributeListeners.createAttributeListener({
            peer: dummyPeer,
            query: dummyQuery
        });

        expect(listener).toBeDefined();

        mockEventBus.expectPublishedEvents(AttributeListenerCreatedEvent);
    });

    test("should get an attribute listener", async function () {
        const listener = await consumptionController.attributeListeners.createAttributeListener({
            peer: dummyPeer,
            query: dummyQuery
        });

        const retrievedListener = await consumptionController.attributeListeners.getAttributeListener(listener.id);

        expect(retrievedListener).toBeDefined();
        expect(retrievedListener?.id.toString()).toStrictEqual(listener.id.toString());
    });

    test("should get all attribute listeners", async function () {
        const listener = await consumptionController.attributeListeners.createAttributeListener({
            peer: dummyPeer,
            query: dummyQuery
        });

        const listeners = await consumptionController.attributeListeners.getAttributeListeners();

        expect(listeners).toHaveLength(1);
        expect(listeners.map((l) => l.toJSON())).toContainEqual(expect.objectContaining({ id: listener.id.toString() }));
    });

    test("should delete peer attribute listeners", async function () {
        const listener = await consumptionController.attributeListeners.createAttributeListener({
            peer: dummyPeer,
            query: dummyQuery
        });

        await consumptionController.attributeListeners.deletePeerAttributeListeners(dummyPeer);
        const retrievedListener = await consumptionController.attributeListeners.getAttributeListener(listener.id);
        expect(retrievedListener).toBeUndefined();
    });
});
