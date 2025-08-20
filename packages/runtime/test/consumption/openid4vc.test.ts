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
        const result = await consumptionServices.openId4Vc.resolveCredentialOffer({
            credentialOfferUrl:
                "openid-credential-offer://?credential_offer_uri=https%3A%2F%2Fopenid4vc-service.is.enmeshed.eu%2Foid4vci%2Fissuer123%2Foffers%2F989f2291-1957-4c71-ac5c-88db744916d7"
        });
        // @ts-expect-error
        expect(result._isSuccess).toBe(true);
    }, 10000);
});
