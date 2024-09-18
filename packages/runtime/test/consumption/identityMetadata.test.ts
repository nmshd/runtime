import { IdentityMetadata } from "@nmshd/consumption";
import { Random, RandomCharacterRange } from "@nmshd/transport";
import { ConsumptionServices } from "../../src";
import { RuntimeServiceProvider } from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();
let consumptionServices: ConsumptionServices;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(1);
    consumptionServices = runtimeServices[0].consumption;
}, 30000);

afterAll(async () => await runtimeServiceProvider.stop());

afterEach(async () => {
    const identityMetadataDocs: [] = await consumptionServices.identityMetadata["upsertIdentityMetadataUseCase"]["identityMetadataController"]["identityMetadata"].find({});
    const parsed = identityMetadataDocs.map((doc: any) => IdentityMetadata.from(doc));

    for (const identityMetadata of parsed) {
        await consumptionServices.identityMetadata.deleteIdentityMetadata({ reference: identityMetadata.reference.toString(), key: identityMetadata.key });
    }
});

describe("IdentityMetadata", () => {
    test.each([
        {
            reference: "did:e:localhost:dids:1234567890abcdef123456",
            key: undefined,
            value: "value"
        },
        {
            reference: "did:e:localhost:dids:1234567890abcdef123456",
            key: undefined,
            value: { key: "value" }
        },
        {
            reference: "did:e:localhost:dids:1234567890abcdef123456",
            key: "key",
            value: "value"
        }
    ])("should upsert an IndentityMetadata with key '$key' and value '$value'", async (data) => {
        const result = await consumptionServices.identityMetadata.upsertIdentityMetadata(data);
        expect(result).toBeSuccessful();

        const identityMetadata = result.value;
        expect(identityMetadata.value).toStrictEqual(data.value);
    });

    test("should get an IdentityMetadata", async () => {
        const reference = await generateReference();
        await consumptionServices.identityMetadata.upsertIdentityMetadata({ reference: reference, value: "value" });

        const result = await consumptionServices.identityMetadata.getIdentityMetadata({ reference: reference });
        expect(result).toBeSuccessful();

        const identityMetadata = result.value;
        expect(identityMetadata.value).toBe("value");
    });

    test("should delete an IdentityMetadata", async () => {
        const reference = await generateReference();
        await consumptionServices.identityMetadata.upsertIdentityMetadata({ reference: reference, value: "value" });

        const result = await consumptionServices.identityMetadata.deleteIdentityMetadata({ reference: reference });
        expect(result).toBeSuccessful();

        const getResult = await consumptionServices.identityMetadata.getIdentityMetadata({ reference: reference });
        expect(getResult).toBeAnError("", "");
    });
});

async function generateReference(): Promise<string> {
    const identityPart = await Random.string(22, `${RandomCharacterRange.Digit}abcdef`);
    return `did:e:localhost:dids:${identityPart}`;
}
