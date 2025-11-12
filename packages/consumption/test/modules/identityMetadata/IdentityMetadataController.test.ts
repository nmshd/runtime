import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { JSONWrapper } from "@js-soft/ts-serval";
import { ConsumptionController } from "@nmshd/consumption";
import { CoreAddress } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import assert from "assert";
import { TestUtil } from "../../core/TestUtil.js";
import { MockEventBus } from "../MockEventBus.js";

const mockEventBus = new MockEventBus();

describe("IdentityMetadataController", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let consumptionController: ConsumptionController;
    let testAccount: AccountController;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport(mockEventBus);

        await transport.init();

        const account = (await TestUtil.provideAccounts(transport, connection, 1))[0];
        ({ accountController: testAccount, consumptionController } = account);
    });

    afterAll(async function () {
        await testAccount.close();
        await connection.close();
    });

    afterEach(async function () {
        await consumptionController.identityMetadata["identityMetadata"]["parent"].delete({});
        const count = await consumptionController.identityMetadata["identityMetadata"].count();
        assert(count === 0);
    });

    test("should create an identity metadata", async function () {
        const identityMetadata = await consumptionController.identityMetadata.upsertIdentityMetadata({
            value: { a: "json" },
            reference: CoreAddress.from("did:e:a-domain:dids:anidentity")
        });

        expect(identityMetadata.reference).toBeInstanceOf(CoreAddress);
        expect(identityMetadata.reference.toString()).toBe("did:e:a-domain:dids:anidentity");

        expect(identityMetadata.value).toBeInstanceOf(JSONWrapper);
        expect(identityMetadata.value.toJSON()).toStrictEqual({ a: "json" });
    });

    test("should create an identity metadata with a key", async function () {
        const identityMetadata = await consumptionController.identityMetadata.upsertIdentityMetadata({
            value: { a: "json" },
            reference: CoreAddress.from("did:e:a-domain:dids:anidentity"),
            key: "key"
        });

        expect(identityMetadata.reference).toBeInstanceOf(CoreAddress);
        expect(identityMetadata.reference.toString()).toBe("did:e:a-domain:dids:anidentity");

        expect(identityMetadata.value).toBeInstanceOf(JSONWrapper);
        expect(identityMetadata.value.toJSON()).toStrictEqual({ a: "json" });

        expect(identityMetadata.key).toBe("key");
    });

    test("should update an identity metadata", async function () {
        const query = { reference: CoreAddress.from("did:e:a-domain:dids:anidentity") };

        await consumptionController.identityMetadata.upsertIdentityMetadata({
            ...query,
            value: { a: "json" }
        });

        const updated = await consumptionController.identityMetadata.upsertIdentityMetadata({
            ...query,
            value: { another: "json" }
        });
        expect(updated.value.toJSON()).toStrictEqual({ another: "json" });

        const queried = await consumptionController.identityMetadata.getIdentityMetadata(CoreAddress.from("did:e:a-domain:dids:anidentity"));
        expect(queried).toBeDefined();
        expect(queried!.value.toJSON()).toStrictEqual({ another: "json" });
    });

    test("should update an identity metadata with a key", async function () {
        const query = { reference: CoreAddress.from("did:e:a-domain:dids:anidentity"), key: "key" };

        await consumptionController.identityMetadata.upsertIdentityMetadata({
            ...query,
            value: { a: "json" }
        });

        const updated = await consumptionController.identityMetadata.upsertIdentityMetadata({
            ...query,
            value: { another: "json" }
        });
        expect(updated.value.toJSON()).toStrictEqual({ another: "json" });

        const queried = await consumptionController.identityMetadata.getIdentityMetadata(CoreAddress.from("did:e:a-domain:dids:anidentity"), "key");
        expect(queried).toBeDefined();
        expect(queried!.value.toJSON()).toStrictEqual({ another: "json" });
    });

    test("should delete an identity metadata", async function () {
        const identityMetadata = await consumptionController.identityMetadata.upsertIdentityMetadata({
            reference: CoreAddress.from("did:e:a-domain:dids:anidentity"),
            value: { a: "json" }
        });

        expect(await consumptionController.identityMetadata["identityMetadata"].count()).toBe(1);

        await consumptionController.identityMetadata.deleteIdentityMetadata(identityMetadata);
        expect(await consumptionController.identityMetadata["identityMetadata"].count()).toBe(0);
    });

    test("should delete an identity metadata with a key", async function () {
        const identityMetadata = await consumptionController.identityMetadata.upsertIdentityMetadata({
            reference: CoreAddress.from("did:e:a-domain:dids:anidentity"),
            key: "key",
            value: { a: "json" }
        });

        expect(await consumptionController.identityMetadata["identityMetadata"].count()).toBe(1);

        await consumptionController.identityMetadata.deleteIdentityMetadata(identityMetadata);
        expect(await consumptionController.identityMetadata["identityMetadata"].count()).toBe(0);
    });

    test("should delete all identity metadata referenced with peer", async function () {
        await consumptionController.identityMetadata.upsertIdentityMetadata({ reference: CoreAddress.from("did:e:a-domain:dids:anidentity"), value: { a: "json" } });
        await consumptionController.identityMetadata.upsertIdentityMetadata({ reference: CoreAddress.from("did:e:a-domain:dids:anidentity"), value: { a: "json" }, key: "key" });
        await consumptionController.identityMetadata.upsertIdentityMetadata({
            reference: CoreAddress.from("did:e:a-domain:dids:anotheridentity"),
            value: { a: "json" },
            key: "key"
        });
        expect(await consumptionController.identityMetadata["identityMetadata"].count()).toBe(3);

        await consumptionController.identityMetadata.deleteIdentityMetadataReferencedWithPeer(CoreAddress.from("did:e:a-domain:dids:anidentity"));
        expect(await consumptionController.identityMetadata["identityMetadata"].count()).toBe(1);
    });
});
