/* eslint-disable @typescript-eslint/naming-convention */
import { GenericContainer } from "testcontainers";
import { ConsumptionServices } from "../../src";
import { RuntimeServiceProvider } from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();
let consumptionServices: ConsumptionServices;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(1);
    consumptionServices = runtimeServices[0].consumption;
}, 30000);

afterAll(async () => await runtimeServiceProvider.stop());

describe("OpenID4VCI and OpenID4VCP", () => {
    let credentialOfferUrl: string;

    test.only("should process a given credential offer", async () => {
        var container = await startOid4VcService({ port: 9000 });

        const response = await fetch(`http://localhost:9000/issuance/credentialOffers`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                credentialConfigurationIds: ["EmployeeIdCard-sdjwt"]
            })
        });
        const data = await response.json();
        credentialOfferUrl = data.result.credentialOffer;
        const result = await consumptionServices.openId4Vc.fetchCredentialOffer({
            credentialOfferUrl
        });

        // analogously to the app code all presented credentials are accepted
        const jsonRepresentation = result.value.jsonRepresentation;
        const credentialOfferDecoded = JSON.parse(jsonRepresentation);
        let requestedCredentials = [];
        // determine which credentials to pick from the offer for all supported types of offers

        if (credentialOfferDecoded["credentialOfferPayload"]["credentials"] !== undefined) {
            requestedCredentials = credentialOfferDecoded["credentialOfferPayload"]["credentials"];
        } else if (credentialOfferDecoded["credentialOfferPayload"]["credential_configuration_ids"] !== undefined) {
            requestedCredentials = credentialOfferDecoded["credentialOfferPayload"]["credential_configuration_ids"];
        }

        const acceptanceResult = await consumptionServices.openId4Vc.resolveFetchedCredentialOffer({
            data: jsonRepresentation,
            requestedCredentials: requestedCredentials
        });

        const status = acceptanceResult.isSuccess;
        expect(status).toBe(true);
        expect(typeof acceptanceResult.value.id).toBe("string");
    }, 10000000);

    test("should be able to process a given credential presentation", async () => {
        // Ensure the first test has completed and credentialOfferUrl is set
        expect(credentialOfferUrl).toBeDefined();

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
            proofRequestUrl: data.result.presentationRequest
        });
        const jsonRepresentation = result.value.jsonRepresentation;

        // parse json and determine if requirements Satisfied is true
        const proofRequest = JSON.parse(jsonRepresentation);
        expect(proofRequest.presentationExchange.credentialsForRequest.areRequirementsSatisfied).toBe(true);

        const presentationResult = await consumptionServices.openId4Vc.acceptProofRequest({
            jsonEncodedRequest: jsonRepresentation
        });
        expect(presentationResult.value.status).toBe(200);
    }, 10000000);

    test("getting all verifiable credentials should not return an empy list", async () => {
        // Ensure the first test has completed and credentialOfferUrl is set
        expect(credentialOfferUrl).toBeDefined();
        const acceptanceResult = await consumptionServices.openId4Vc.getVerifiableCredentials(undefined);
        expect(acceptanceResult.isError).toBe(false);
        expect(acceptanceResult.value.length).toBeGreaterThan(0);
    }, 10000000);

    test("getting the eralier created verifiable credential by id should return exactly one credential", async () => {
        // Ensure the first test has completed and credentialOfferUrl is set
        expect(credentialOfferUrl).toBeDefined();
        const allCredentialsResult = await consumptionServices.openId4Vc.getVerifiableCredentials(undefined);
        expect(allCredentialsResult.isError).toBe(false);
        expect(allCredentialsResult.value.length).toBeGreaterThan(0);
        const firstCredentialId = allCredentialsResult.value[0].id;
        const singleCredentialResult = await consumptionServices.openId4Vc.getVerifiableCredentials([firstCredentialId]);
        expect(singleCredentialResult.isError).toBe(false);
        expect(singleCredentialResult.value).toHaveLength(1);
        expect(singleCredentialResult.value[0].id).toBe(firstCredentialId);
    }, 10000000);
});

async function startOid4VcService(parameters: { port: number }) {
    return await new GenericContainer(`ghcr.io/js-soft/openid4vc-service:1.1.11`)
        .withExposedPorts({ container: 8080, host: parameters.port })
        .withCopyFilesToContainer([{ source: `${__dirname}/../../../.dev/oid4vc-config`, target: "/app/config.json" }])
        .start();
}
