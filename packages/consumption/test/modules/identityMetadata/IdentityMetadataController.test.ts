import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { JSONWrapper } from "@js-soft/ts-serval";
import { CoreAddress } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import { ConsumptionController } from "../../../src";
import { TestUtil } from "../../core/TestUtil";
import { MockEventBus } from "../MockEventBus";

const mockEventBus = new MockEventBus();

describe("IdentityMetadataController", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let consumptionController: ConsumptionController;
    let testAccount: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport(connection, mockEventBus);

        await transport.init();

        const account = (await TestUtil.provideAccounts(transport, 1))[0];
        ({ accountController: testAccount, consumptionController } = account);
    });

    afterAll(async function () {
        await testAccount.close();
        await connection.close();
    });

    afterEach(async function () {
        await consumptionController.identityMetadata["identityMetadata"]["parent"].delete({});
        const count = await consumptionController.identityMetadata["identityMetadata"].count();
        // eslint-disable-next-line jest/no-standalone-expect
        expect(count).toBe(0);
    });

    test("should upsert an identity metadata with scope identity", async function () {
        const identityMetadata = await consumptionController.identityMetadata.upsertIdentityMetadata({
            value: { key: "value" },
            reference: CoreAddress.from("id1")
        });

        expect(identityMetadata.reference).toBeInstanceOf(CoreAddress);
        expect(identityMetadata.reference.toString()).toBe("id1");

        expect(identityMetadata.value).toBeInstanceOf(JSONWrapper);
        expect(identityMetadata.value.toJSON()).toStrictEqual({ key: "value" });
    });

    test("should create an identity metadata with scope identity with a key", async function () {
        const identityMetadata = await consumptionController.identityMetadata.upsertIdentityMetadata({
            value: { key: "value" },
            reference: CoreAddress.from("id1"),
            key: "key"
        });

        expect(identityMetadata.reference).toBeInstanceOf(CoreAddress);
        expect(identityMetadata.reference.toString()).toBe("id1");

        expect(identityMetadata.value).toBeInstanceOf(JSONWrapper);
        expect(identityMetadata.value.toJSON()).toStrictEqual({ key: "value" });

        expect(identityMetadata.key).toBe("key");
    });

    test("should update an identity metadata", async function () {
        const query = { reference: CoreAddress.from("id1") };

        await consumptionController.identityMetadata.upsertIdentityMetadata({
            ...query,
            value: { key: "value" }
        });

        const updated = await consumptionController.identityMetadata.upsertIdentityMetadata({
            ...query,
            value: { key: "value2" }
        });
        expect(updated.value.toJSON()).toStrictEqual({ key: "value2" });

        const queried = await consumptionController.identityMetadata.getIdentityMetadata(CoreAddress.from("id1"));
        expect(queried).toBeDefined();
        expect(queried!.value.toJSON()).toStrictEqual({ key: "value2" });
    });

    test("should update an identity metadata with a key", async function () {
        const query = { reference: CoreAddress.from("id1"), key: "key" };

        await consumptionController.identityMetadata.upsertIdentityMetadata({
            ...query,
            value: { key: "value" }
        });

        const updated = await consumptionController.identityMetadata.upsertIdentityMetadata({
            ...query,
            value: { key: "value2" }
        });
        expect(updated.value.toJSON()).toStrictEqual({ key: "value2" });

        const queried = await consumptionController.identityMetadata.getIdentityMetadata(CoreAddress.from("id1"), "key");
        expect(queried).toBeDefined();
        expect(queried!.value.toJSON()).toStrictEqual({ key: "value2" });
    });

    test("should upsert an identity metadata", async function () {
        const query = { reference: CoreAddress.from("id1") };

        const upserted = await consumptionController.identityMetadata.upsertIdentityMetadata({
            ...query,
            value: { key: "value2" }
        });
        expect(upserted.value.toJSON()).toStrictEqual({ key: "value2" });

        const queried = await consumptionController.identityMetadata.getIdentityMetadata(CoreAddress.from("id1"));
        expect(queried).toBeDefined();
        expect(queried!.value.toJSON()).toStrictEqual({ key: "value2" });
    });

    test("should upsert an identity metadata with a key", async function () {
        const query = {
            reference: CoreAddress.from("id1"),
            key: "key"
        };

        const upserted = await consumptionController.identityMetadata.upsertIdentityMetadata({
            ...query,
            value: { key: "value2" }
        });
        expect(upserted.value.toJSON()).toStrictEqual({ key: "value2" });

        const queried = await consumptionController.identityMetadata.getIdentityMetadata(CoreAddress.from("id1"), "key");
        expect(queried).toBeDefined();
        expect(queried!.value.toJSON()).toStrictEqual({ key: "value2" });
    });

    test("should delete an identity metadata", async function () {
        const identityMetadata = await consumptionController.identityMetadata.upsertIdentityMetadata({
            reference: CoreAddress.from("id1"),
            value: { key: "value" }
        });

        expect(await consumptionController.identityMetadata["identityMetadata"].count()).toBe(1);

        await consumptionController.identityMetadata.deleteIdentityMetadata(identityMetadata);
        expect(await consumptionController.identityMetadata["identityMetadata"].count()).toBe(0);
    });

    test("should delete an identity metadata with a key", async function () {
        const identityMetadata = await consumptionController.identityMetadata.upsertIdentityMetadata({
            reference: CoreAddress.from("id1"),
            key: "key",
            value: { key: "value" }
        });

        expect(await consumptionController.identityMetadata["identityMetadata"].count()).toBe(1);

        await consumptionController.identityMetadata.deleteIdentityMetadata(identityMetadata);
        expect(await consumptionController.identityMetadata["identityMetadata"].count()).toBe(0);
    });

    test("should delete all identity metadata exchanged with a peer", async function () {
        await consumptionController.identityMetadata.upsertIdentityMetadata({ reference: CoreAddress.from("address1"), value: { key: "value" } });
        await consumptionController.identityMetadata.upsertIdentityMetadata({ reference: CoreAddress.from("address1"), value: { key: "value" }, key: "key" });
        await consumptionController.identityMetadata.upsertIdentityMetadata({ reference: CoreAddress.from("address2"), value: { key: "value" }, key: "key" });
        expect(await consumptionController.identityMetadata["identityMetadata"].count()).toBe(3);

        await consumptionController.identityMetadata.deleteIdentityMetadataExchangedWithPeer(CoreAddress.from("address1"));
        expect(await consumptionController.identityMetadata["identityMetadata"].count()).toBe(1);
    });
});
