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
        // this should fetch its own credential offer url
        const response = await fetch(`https://openid4vc-service.is.enmeshed.eu/issuance/credentialOffers`, {
            method: "POST",
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                credentialConfigurationIds: ["EmployeeIdCard-sdjwt"]
            })
        });
        const data = await response.json();
        const result = await consumptionServices.openId4Vc.resolveCredentialOffer({
            credentialOfferUrl: data.result.credentialOffer
        });
        // @ts-expect-error
        expect(result._isSuccess).toBe(true);
    }, 10000000);
});
