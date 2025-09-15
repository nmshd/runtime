/* eslint-disable @typescript-eslint/naming-convention */
import { ConsumptionServices } from "../../src";
import { RuntimeServiceProvider } from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();
let consumptionServices: ConsumptionServices;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(1);
    consumptionServices = runtimeServices[0].consumption;
}, 30000);

afterAll(async () => await runtimeServiceProvider.stop());

describe("OpenID4VCI", () => {
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
        // the result will always be a success - it however has a status field in it's value - which is a JSON string
        // that contains the actual status of the flow
        const status = result.value.status;
        expect(status).toBe("success");
    }, 10000000);
});

describe("OpenID4VCP", () => {
    test("should be able tp process a given credential presentation", async () => {
        // this should fetch its own credential offer url
        const response = await fetch(`https://openid4vc-service.is.enmeshed.eu/presentation/presentationRequests`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                pex: {
                    id: "anId",
                    purpose: "To prove you work here",
                    input_descriptors: [
                        {
                            id: "EmployeeIdCard",
                            format: {
                                "vc+sd-jwt": {
                                    "sd-jwt_alg_values": [
                                        "RS256",
                                        "PS256",
                                        "HS256",
                                        "ES256",
                                        "ES256K",
                                        "RS384",
                                        "PS384",
                                        "HS384",
                                        "ES384",
                                        "RS512",
                                        "PS512",
                                        "HS512",
                                        "ES512",
                                        "EdDSA"
                                    ]
                                }
                            },
                            constraints: {
                                fields: [
                                    {
                                        path: ["$.vct"],
                                        filter: {
                                            type: "string",
                                            pattern: "EmployeeIdCard"
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                },
                version: "v1.draft21"
            })
        });
        const data = await response.json();
        const result = await consumptionServices.openId4Vc.fetchProofRequest({
            credentialOfferUrl: data.result.credentialOffer
        });
        // the result will always be a success - it however has a status field in it's value - which is a JSON string
        // that contains the actual status of the flow
        const jsonRepresentation = result.value.jsonRepresentation;
        expect(jsonRepresentation).not.toBe("success");
    }, 10000000);
});
