import { OpenId4VpResolvedAuthorizationRequest } from "@credo-ts/openid4vc";
import axios, { AxiosInstance } from "axios";
import path from "path";
import { DockerComposeEnvironment, StartedDockerComposeEnvironment, Wait } from "testcontainers";
import { Agent as UndiciAgent, fetch as undiciFetch } from "undici";
import { ConsumptionServices } from "../../src";
import { RuntimeServiceProvider } from "../lib";

const fetchInstance: typeof fetch = (async (input, init) => {
    const response = await undiciFetch(input as any, { ...(init as any), dispatcher: new UndiciAgent({}) });
    return response;
}) as typeof fetch;

const runtimeServiceProvider = new RuntimeServiceProvider(fetchInstance);
let consumptionServices: ConsumptionServices;
let axiosInstance: AxiosInstance;
let dockerComposeStack: StartedDockerComposeEnvironment | undefined;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(1, undefined);

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
            "Content-Type": "application/json" // eslint-disable-line @typescript-eslint/naming-convention
        }
    });
}, 120000);

afterAll(async () => {
    await runtimeServiceProvider.stop();
    if (dockerComposeStack) await dockerComposeStack.down();
});

describe("OpenID4VCI and OpenID4VCP", () => {
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
    });

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

        const result = await consumptionServices.openId4Vc.resolveAuthorizationRequest({ requestUrl: responseData.result.presentationRequest });
        expect(result.value.usedCredentials).toHaveLength(1);

        const request = result.value.authorizationRequest as OpenId4VpResolvedAuthorizationRequest;
        expect(request.presentationExchange!.credentialsForRequest.areRequirementsSatisfied).toBe(true);

        const presentationResult = await consumptionServices.openId4Vc.acceptAuthorizationRequest({ authorizationRequest: result.value.authorizationRequest });
        expect(presentationResult).toBeSuccessful();
        expect(presentationResult.value.status).toBe(200);
    });

    test("getting all verifiable credentials should not return an empty list", async () => {
        // Ensure the first test has completed
        expect(credentialOfferUrl).toBeDefined();

        const acceptanceResult = await consumptionServices.openId4Vc.getVerifiableCredentials();

        expect(acceptanceResult).toBeSuccessful();
        expect(acceptanceResult.value.length).toBeGreaterThan(0);
    });

    test("getting the earlier created verifiable credential by id should return exactly one credential", async () => {
        // Ensure the first test has completed
        expect(credentialOfferUrl).toBeDefined();

        const allCredentialsResult = await consumptionServices.openId4Vc.getVerifiableCredentials();
        expect(allCredentialsResult).toBeSuccessful();
        expect(allCredentialsResult.value.length).toBeGreaterThan(0);

        const firstCredentialId = allCredentialsResult.value[0].id;
        const singleCredentialResult = await consumptionServices.openId4Vc.getVerifiableCredentials([firstCredentialId]);
        expect(singleCredentialResult).toBeSuccessful();
        expect(singleCredentialResult.value).toHaveLength(1);
        expect(singleCredentialResult.value[0].id).toBe(firstCredentialId);
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
