import { ConsumptionServices } from "../../src";
import { RuntimeServiceProvider } from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();
let consumptionServices: ConsumptionServices;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(1);
    consumptionServices = runtimeServices[0].consumption;
}, 30000);

afterAll(async () => await runtimeServiceProvider.stop());

describe("OpenID4VC", () => {
    test("should process a given credential offer", async () => {
        const result = await consumptionServices.openId4Vc.resolveCredentialOffer({ credentialOfferUrl: "https://example.com/credential-offer" });
        expect(result).toBeDefined();
    }, 10000);
});
