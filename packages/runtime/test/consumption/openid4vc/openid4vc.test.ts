import { DockerComposeEnvironment, StartedDockerComposeEnvironment } from "testcontainers";
import { ConsumptionServices } from "../../../src";
import { RuntimeServiceProvider } from "../../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();
let consumptionServices: ConsumptionServices;
let oid4vcServiceComposeStack: StartedDockerComposeEnvironment;
let oid4vcServiceBaseUrl: string;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(1);
    consumptionServices = runtimeServices[0].consumption;

    oid4vcServiceComposeStack = await startOid4VcComposeStack();

    const oid4vcServicePort = oid4vcServiceComposeStack.getContainer("oid4vc-service-1").getMappedPort(8080);
    oid4vcServiceBaseUrl = `http://localhost:${oid4vcServicePort}`;
}, 30000);

afterAll(async () => {
    await runtimeServiceProvider.stop();
    await oid4vcServiceComposeStack.stop();
});

describe("OpenID4VCI and OpenID4VCP", () => {
    let credentialOfferUrl: string;

    test("should process a given credential offer", async () => {
        const response = await fetch(`${oid4vcServiceBaseUrl}/issuance/credentialOffers`, {
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

        const response = await fetch(`${oid4vcServiceBaseUrl}/presentation/presentationRequests`, {
            method: "POST",
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                pex: {
                    id: "anId",
                    purpose: "To prove you work here",
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    input_descriptors: [
                        {
                            id: "EmployeeIdCard",
                            format: {
                                // eslint-disable-next-line @typescript-eslint/naming-convention
                                "vc+sd-jwt": {
                                    // eslint-disable-next-line @typescript-eslint/naming-convention
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
});

describe.only("EUDIPLO", () => {
    const eudiploBaseUrl = "https://openid4vc-eudiplo-server.is.enmeshed.eu";
    const eudiploUser = "test-admin";
    const eudiploPassword = "a9622245324e3ef38db9264f434e2289f361e07edd8012d4a7815a11b9c79a97";
    const eudiploIssuanceConfigurationId = "Employee ID Card";
    const eudiploPresentationConfigurationId = "Employee ID Card";
    const eudiploCredentialIdInConfiguration = "EmployeeIdCard";

    let accessToken: string;
    beforeAll(async () => {
        accessToken = (
            await axios.post(
                `${eudiploBaseUrl}/oauth2/token`,
                {
                    grant_type: "client_credentials"
                },
                {
                    auth: {
                        username: eudiploUser,
                        password: eudiploPassword
                    }
                }
            )
        ).data.access_token;
    });

    test("issuance", async () => {
        const credentialOfferUrl = (
            await axios.post(
                `${eudiploBaseUrl}/issuer-management/offer`,
                {
                    response_type: "uri",
                    issuanceId: eudiploIssuanceConfigurationId
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }
            )
        ).data.uri;

        const loadResult = await consumptionServices.openId4Vc.fetchCredentialOffer({ credentialOfferUrl });
        expect(loadResult).toBeSuccessful();

        const resolveResult = await consumptionServices.openId4Vc.resolveFetchedCredentialOffer({
            data: loadResult.value.jsonRepresentation,
            requestedCredentials: [eudiploCredentialIdInConfiguration]
        });
        expect(resolveResult).toBeSuccessful();
    });

    test("presentation", async () => {
        const proofRequestUrl = (
            await axios.post(
                `${eudiploBaseUrl}/presentation-management/request`,
                {
                    response_type: "uri",
                    requestId: eudiploPresentationConfigurationId
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }
            )
        ).data.uri;

        const loadResult = await consumptionServices.openId4Vc.fetchProofRequest({ proofRequestUrl });
        expect(loadResult).toBeSuccessful();
    });
});

async function startOid4VcComposeStack() {
    const composeStack = await new DockerComposeEnvironment(__dirname, "compose.yml").up();

    return composeStack;
}
