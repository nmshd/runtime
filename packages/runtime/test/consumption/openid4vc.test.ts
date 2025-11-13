import axios, { AxiosInstance } from "axios";
import path from "path";
import { DockerComposeEnvironment, StartedDockerComposeEnvironment, Wait } from "testcontainers";
import { ConsumptionServices } from "../../src";
import { RuntimeServiceProvider } from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();
let consumptionServices: ConsumptionServices;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(1);
    consumptionServices = runtimeServices[0].consumption;
}, 120000);

afterAll(async () => {
    await runtimeServiceProvider.stop();
});

describe("custom openid4vc service", () => {
    let axiosInstance: AxiosInstance;
    let dockerComposeStack: StartedDockerComposeEnvironment | undefined;

    beforeAll(async () => {
        const runtimeServices = await runtimeServiceProvider.launch(1);
        consumptionServices = runtimeServices[0].consumption;

        let oid4vcServiceBaseUrl = process.env.OPENID4VC_SERVICE_BASEURL!;
        if (!oid4vcServiceBaseUrl) {
            dockerComposeStack = await startOid4VcComposeStack();
            const mappedPort = dockerComposeStack.getContainer("oid4vc-service-1").getMappedPort(9000);
            oid4vcServiceBaseUrl = `http://localhost:${mappedPort}`;
        }

        axiosInstance = axios.create({
            baseURL: oid4vcServiceBaseUrl,
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                "Content-Type": "application/json"
            }
        });
    }, 120000);

    afterAll(async () => {
        await runtimeServiceProvider.stop();
        if (dockerComposeStack) await dockerComposeStack.down();
    });

    let credentialOfferUrl: string;

    test("should process a given credential offer", async () => {
        const response = await axiosInstance.post("/issuance/credentialOffers", {
            credentialConfigurationIds: ["EmployeeIdCard-sdjwt"]
        });
        expect(response.status).toBe(200);
        const responseData = await response.data;

        credentialOfferUrl = responseData.result.credentialOffer;

        const result = await consumptionServices.openId4Vc.fetchCredentialOffer({
            credentialOfferUrl
        });

        expect(result).toBeSuccessful();

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
        expect(acceptanceResult).toBeSuccessful();
        expect(typeof acceptanceResult.value.id).toBe("string");
    }, 10000000);

    test("should be able to process a given credential presentation", async () => {
        // Ensure the first test has completed
        expect(credentialOfferUrl).toBeDefined();

        const response = await axiosInstance.post("/presentation/presentationRequests", {
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
                                "sd-jwt_alg_values": ["RS256", "PS256", "HS256", "ES256", "ES256K", "RS384", "PS384", "HS384", "ES384", "RS512", "PS512", "HS512", "ES512", "EdDSA"]
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
        });
        expect(response.status).toBe(200);
        const responseData = await response.data;

        const result = await consumptionServices.openId4Vc.fetchProofRequest({
            proofRequestUrl: responseData.result.presentationRequest
        });
        const jsonRepresentation = result.value.jsonRepresentation;

        const proofRequest = JSON.parse(jsonRepresentation);
        expect(proofRequest.presentationExchange.credentialsForRequest.areRequirementsSatisfied).toBe(true);

        const presentationResult = await consumptionServices.openId4Vc.acceptProofRequest({
            jsonEncodedRequest: jsonRepresentation
        });
        expect(presentationResult).toBeSuccessful();
        expect(presentationResult.value.status).toBe(200);
    }, 10000000);

    test("getting all verifiable credentials should not return an empy list", async () => {
        // Ensure the first test has completed
        expect(credentialOfferUrl).toBeDefined();

        const acceptanceResult = await consumptionServices.openId4Vc.getVerifiableCredentials(undefined);

        expect(acceptanceResult).toBeSuccessful();
        expect(acceptanceResult.value.length).toBeGreaterThan(0);
    }, 10000000);

    test("getting the earlier created verifiable credential by id should return exactly one credential", async () => {
        // Ensure the first test has completed
        expect(credentialOfferUrl).toBeDefined();

        const allCredentialsResult = await consumptionServices.openId4Vc.getVerifiableCredentials(undefined);
        expect(allCredentialsResult).toBeSuccessful();
        expect(allCredentialsResult.value.length).toBeGreaterThan(0);

        const firstCredentialId = allCredentialsResult.value[0].id;
        const singleCredentialResult = await consumptionServices.openId4Vc.getVerifiableCredentials([firstCredentialId]);
        expect(singleCredentialResult).toBeSuccessful();
        expect(singleCredentialResult.value).toHaveLength(1);
        expect(singleCredentialResult.value[0].id).toBe(firstCredentialId);
    }, 10000000);
});

describe("EUDIPLO", () => {
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
                    // eslint-disable-next-line @typescript-eslint/naming-convention
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
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    response_type: "uri",
                    issuanceId: eudiploIssuanceConfigurationId
                },
                {
                    headers: {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
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
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    response_type: "uri",
                    requestId: eudiploPresentationConfigurationId
                },
                {
                    headers: {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        Authorization: `Bearer ${accessToken}`
                    }
                }
            )
        ).data.uri;

        const loadResult = await consumptionServices.openId4Vc.fetchProofRequest({ proofRequestUrl });
        expect(loadResult).toBeSuccessful();

        const parsedResult = JSON.parse(loadResult.value.jsonRepresentation);
        expect(parsedResult.dcql.queryResult.can_be_satisfied).toBe(true);

        const credentialMatches = parsedResult.dcql.queryResult.credential_matches["EmployeeIdCard-vc-sd-jwt"];
        expect(credentialMatches.valid_credentials).toHaveLength(1);

        // TODO: send the presentation with a manually selected credential
    });
});

async function startOid4VcComposeStack() {
    let baseUrl = process.env.NMSHD_TEST_BASEURL!;
    let addressGenerationHostnameOverride: string | undefined;

    if (baseUrl.includes("localhost")) {
        addressGenerationHostnameOverride = "localhost";
        baseUrl = baseUrl.replace("localhost", "host.docker.internal");
    }

    const composeFolder = path.resolve(path.join(__dirname, "..", "..", "..", "..", ".dev"));
    const composeStack = await new DockerComposeEnvironment(composeFolder, "compose.openid4vc.yml")
        .withProjectName("runtime-oid4vc-tests")
        .withEnvironment({
            // eslint-disable-next-line @typescript-eslint/naming-convention
            NMSHD_TEST_BASEURL: baseUrl,

            // eslint-disable-next-line @typescript-eslint/naming-convention
            NMSHD_TEST_ADDRESSGENERATIONHOSTNAMEOVERRIDE: addressGenerationHostnameOverride
        } as Record<string, string>)
        .withStartupTimeout(60000)
        .withWaitStrategy("oid4vc-service", Wait.forHealthCheck())
        .up();

    return composeStack;
}
