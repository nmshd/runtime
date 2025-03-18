import { IdentityMetadata } from "@nmshd/consumption";
import { Random, RandomCharacterRange } from "@nmshd/core-types";
import { AddressString } from "src/useCases/common";
import { ConsumptionServices, TransportServices } from "../../src";
import { establishRelationship, RuntimeServiceProvider } from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();
let consumptionServices: ConsumptionServices;
let transportServices: TransportServices;
let peerTransportServices: TransportServices;

let ownAddress: AddressString;
let peerAddress: AddressString;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(2);
    consumptionServices = runtimeServices[0].consumption;
    transportServices = runtimeServices[0].transport;
    peerTransportServices = runtimeServices[1].transport;

    await establishRelationship(transportServices, peerTransportServices);

    ownAddress = (await transportServices.account.getIdentityInfo()).value.address;
    peerAddress = (await peerTransportServices.account.getIdentityInfo()).value.address;
}, 30000);

afterAll(async () => await runtimeServiceProvider.stop());

afterEach(async () => {
    const identityMetadataDocs: [] = await consumptionServices.identityMetadata["upsertIdentityMetadataUseCase"]["identityMetadataController"]["identityMetadata"].find({});
    const parsed = identityMetadataDocs.map((doc: any) => IdentityMetadata.from(doc));

    for (const identityMetadata of parsed) {
        await consumptionServices.identityMetadata.deleteIdentityMetadata({ reference: identityMetadata.reference.toString(), key: identityMetadata.key });
    }
});

describe("Upsert IdentityMetadata", () => {
    test("should upsert an IdentityMetadata with a string as value", async () => {
        const upsertRequest = { reference: peerAddress, value: "value" };
        const result = await consumptionServices.identityMetadata.upsertIdentityMetadata(upsertRequest);
        expect(result).toBeSuccessful();

        const identityMetadata = result.value;
        expect(identityMetadata.reference.toString()).toStrictEqual(upsertRequest.reference);
        expect(identityMetadata.key).toBeUndefined();
        expect(identityMetadata.value).toStrictEqual(upsertRequest.value);
    });

    test("should upsert an IdentityMetadata with a JSON object as value", async () => {
        const upsertRequest = { reference: peerAddress, value: { a: "json" } };
        const result = await consumptionServices.identityMetadata.upsertIdentityMetadata(upsertRequest);
        expect(result).toBeSuccessful();

        const identityMetadata = result.value;
        expect(identityMetadata.reference.toString()).toStrictEqual(upsertRequest.reference);
        expect(identityMetadata.key).toBeUndefined();
        expect(identityMetadata.value).toStrictEqual(upsertRequest.value);
    });

    test("should upsert an IdentityMetadata with a key", async () => {
        const upsertRequest = { reference: peerAddress, key: "key", value: "value" };
        const result = await consumptionServices.identityMetadata.upsertIdentityMetadata(upsertRequest);
        expect(result).toBeSuccessful();

        const identityMetadata = result.value;
        expect(identityMetadata.reference.toString()).toStrictEqual(upsertRequest.reference);
        expect(identityMetadata.key).toStrictEqual(upsertRequest.key);
        expect(identityMetadata.value).toStrictEqual(upsertRequest.value);
    });

    test("should upsert an IdentityMetadata for the own Identity", async () => {
        const upsertRequest = { reference: ownAddress, value: "value" };
        const result = await consumptionServices.identityMetadata.upsertIdentityMetadata(upsertRequest);
        expect(result).toBeSuccessful();

        const identityMetadata = result.value;
        expect(identityMetadata.reference.toString()).toStrictEqual(upsertRequest.reference);
        expect(identityMetadata.key).toBeUndefined();
        expect(identityMetadata.value).toStrictEqual(upsertRequest.value);
    });

    test("cannot upsert an IdentityMetadata if the referenced Identity is unfamiliar", async () => {
        const unknownIdentityReference = await generateReference();
        const result = await consumptionServices.identityMetadata.upsertIdentityMetadata({ reference: unknownIdentityReference, value: "value" });
        expect(result).toBeAnError(
            "The reference of the IdentityMetadata resolves neither to the address of a peer of a Relationship nor the address of the own Identity.",
            "error.runtime.identityMetadata.unfamiliarReferencedIdentity"
        );
    });
});

describe("Get IdentityMetadata", () => {
    test("should get an IdentityMetadata", async () => {
        await consumptionServices.identityMetadata.upsertIdentityMetadata({ reference: peerAddress, value: "value" });

        const result = await consumptionServices.identityMetadata.getIdentityMetadata({ reference: peerAddress });
        expect(result).toBeSuccessful();

        const identityMetadata = result.value;
        expect(identityMetadata.value).toBe("value");
    });

    test("cannot get an IdentityMetadata if it does not exist", async () => {
        const result = await consumptionServices.identityMetadata.getIdentityMetadata({ reference: peerAddress });
        expect(result).toBeAnError("There is no stored IdentityMetadata for the specified combination of reference and key.", "error.runtime.identityMetadata.notFound");
    });
});

describe("Delete IdentityMetadata", () => {
    test("should delete an IdentityMetadata", async () => {
        await consumptionServices.identityMetadata.upsertIdentityMetadata({ reference: peerAddress, value: "value" });

        const result = await consumptionServices.identityMetadata.deleteIdentityMetadata({ reference: peerAddress });
        expect(result).toBeSuccessful();

        const getResult = await consumptionServices.identityMetadata.getIdentityMetadata({ reference: peerAddress });
        expect(getResult).toBeAnError("There is no stored IdentityMetadata for the specified combination of reference and key.", "error.runtime.identityMetadata.notFound");
    });

    test("cannot delete an IdentityMetadata if it does not exist", async () => {
        const result = await consumptionServices.identityMetadata.deleteIdentityMetadata({ reference: peerAddress });
        expect(result).toBeAnError("There is no stored IdentityMetadata for the specified combination of reference and key.", "error.runtime.identityMetadata.notFound");
    });
});

async function generateReference(): Promise<string> {
    const identityPart = await Random.string(22, `${RandomCharacterRange.Digit}abcdef`);
    return `did:e:localhost:dids:${identityPart}`;
}
