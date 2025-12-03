import { VerifiableCredential } from "@nmshd/content";
import axios, { AxiosInstance } from "axios";
import path from "path";
import { DockerComposeEnvironment, GenericContainer, StartedDockerComposeEnvironment, StartedTestContainer, Wait } from "testcontainers";
import { Agent as UndiciAgent, fetch as undiciFetch } from "undici";
import { ConsumptionServices } from "../../src";
import { RuntimeServiceProvider } from "../lib";

const fetchInstance: typeof fetch = (async (input: any, init: any) => {
    const response = await undiciFetch(input, { ...init, dispatcher: new UndiciAgent({}) });
    return response;
}) as unknown as typeof fetch;

describe("custom openid4vc service", () => {
    const runtimeServiceProvider = new RuntimeServiceProvider(fetchInstance);
    let consumptionServices: ConsumptionServices;

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

    test("should process a given sd-jwt credential offer", async () => {
        const response = await axiosInstance.post("/issuance/credentialOffers", {
            credentialConfigurationIds: ["EmployeeIdCard-sdjwt"]
        });
        expect(response.status).toBe(200);
        const responseData = await response.data;

        credentialOfferUrl = responseData.result.credentialOffer;

        const result = await consumptionServices.openId4Vc.resolveCredentialOffer({
            credentialOfferUrl
        });

        expect(result).toBeSuccessful();

        // analogously to the app code all presented credentials are accepted
        const credentialOffer = result.value.credentialOffer;

        // determine which credentials to pick from the offer for all supported types of offers

        const requestedCredentials = credentialOffer.credentialOfferPayload.credential_configuration_ids;

        const acceptanceResult = await consumptionServices.openId4Vc.acceptCredentialOffer({
            credentialOffer,
            credentialConfigurationIds: requestedCredentials
        });
        expect(acceptanceResult).toBeSuccessful();
        expect(typeof acceptanceResult.value.id).toBe("string");

        const credential = acceptanceResult.value.content.value as unknown as VerifiableCredential;
        expect(credential.displayInformation?.[0].logo).toBeDefined();
        expect(credential.displayInformation?.[0].name).toBe("Employee ID Card");
    });

    test("should be able to process a given sd-jwt credential presentation", async () => {
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

        const result = await consumptionServices.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: responseData.result.presentationRequest });
        expect(result.value.usedCredentials).toHaveLength(1);

        const request = result.value.authorizationRequest;
        expect(request.presentationExchange!.credentialsForRequest.areRequirementsSatisfied).toBe(true);

        const presentationResult = await consumptionServices.openId4Vc.acceptAuthorizationRequest({ authorizationRequest: result.value.authorizationRequest });
        expect(presentationResult).toBeSuccessful();
        expect(presentationResult.value.status).toBe(200);
    });

    describe.only("mdoc", () => {
        test("should process a given mdoc credential offer", async () => {
            const response = await axiosInstance.post("/issuance/credentialOffers", {
                credentialConfigurationIds: ["EmployeeIdCard-mdoc"]
            });
            expect(response.status).toBe(200);
            const responseData = await response.data;

            credentialOfferUrl = responseData.result.credentialOffer;

            const result = await consumptionServices.openId4Vc.resolveCredentialOffer({
                credentialOfferUrl
            });

            expect(result).toBeSuccessful();

            // analogously to the app code all presented credentials are accepted
            const credentialOffer = result.value.credentialOffer;

            // determine which credentials to pick from the offer for all supported types of offers

            const requestedCredentials = credentialOffer.credentialOfferPayload.credential_configuration_ids;

            const acceptanceResult = await consumptionServices.openId4Vc.acceptCredentialOffer({
                credentialOffer,
                credentialConfigurationIds: requestedCredentials
            });
            expect(acceptanceResult).toBeSuccessful();
            expect(typeof acceptanceResult.value.id).toBe("string");

            const credential = acceptanceResult.value.content.value as unknown as VerifiableCredential;
            expect(credential.displayInformation?.[0].logo).toBeDefined();
            expect(credential.displayInformation?.[0].name).toBe("Employee ID Card");
        });

        test("should be able to process a given mdoc credential presentation", async () => {
            // Ensure the first test has completed
            expect(credentialOfferUrl).toBeDefined();

            const response = await axiosInstance.post("/presentation/presentationRequests", {
                pex: {
                    // see openid4vp-draft21.e2e.test.ts of credo for a more detailed example how to build a query
                    id: "anId",
                    purpose: "To prove you work here",

                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    input_descriptors: [
                        {
                            id: "EmployeeIdCard",
                            format: {
                                // eslint-disable-next-line @typescript-eslint/naming-convention
                                mso_mdoc: {
                                    alg: ["EdDSA", "ES256"]
                                }
                            },
                            constraints: {
                                fields: [
                                    {
                                        path: ["$['employeeIdCard']['degree']"],
                                        // eslint-disable-next-line @typescript-eslint/naming-convention
                                        intent_to_retain: false
                                    }
                                ],
                                // eslint-disable-next-line @typescript-eslint/naming-convention
                                limit_disclosure: "required"
                            }
                        }
                    ]
                },
                version: "v1.draft21"
            });
            expect(response.status).toBe(200);
            const responseData = await response.data;

            const result = await consumptionServices.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: responseData.result.presentationRequest });
            expect(result.value.usedCredentials).toHaveLength(1);

            const request = result.value.authorizationRequest;
            expect(request.presentationExchange!.credentialsForRequest.areRequirementsSatisfied).toBe(true);

            const presentationResult = await consumptionServices.openId4Vc.acceptAuthorizationRequest({ authorizationRequest: result.value.authorizationRequest });
            expect(presentationResult).toBeSuccessful();
            expect(presentationResult.value.status).toBe(200);
        });
    });

    test("getting all verifiable credentials should not return an empty list", async () => {
        // Ensure the first test has completed
        expect(credentialOfferUrl).toBeDefined();

        const acceptanceResult = await consumptionServices.attributes.getOwnIdentityAttributes({
            query: {
                "content.value.@type": "VerifiableCredential"
            }
        });

        expect(acceptanceResult).toBeSuccessful();
        expect(acceptanceResult.value.length).toBeGreaterThan(0);
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
});

describe("EUDIPLO", () => {
    const eudiploUser = "test-admin";
    const eudiploPassword = "test";
    const eudiploIssuanceConfigurationId = "Employee ID Card";
    const eudiploPresentationConfigurationId = "Employee ID Card";
    const eudiploCredentialIdInConfiguration = "EmployeeIdCard";
    const eudiploPort = 3000; // CAUTION: don't change this. The DCQL query has this port hardcoded in its configuration. The presentation test will fail if we change this.

    const runtimeServiceProvider = new RuntimeServiceProvider(fetchInstance);
    let consumptionServices: ConsumptionServices;

    let eudiploContainer: StartedTestContainer | undefined;
    let axiosInstance: AxiosInstance;

    beforeAll(async () => {
        eudiploContainer = await startEudiplo();

        const baseUrl = `http://localhost:${eudiploPort}`;

        const accessTokenResponse = await axios.post(
            `${baseUrl}/oauth2/token`,
            {
                grant_type: "client_credentials" // eslint-disable-line @typescript-eslint/naming-convention
            },
            {
                headers: {
                    "Content-Type": "application/json" // eslint-disable-line @typescript-eslint/naming-convention
                },
                auth: {
                    username: eudiploUser,
                    password: eudiploPassword
                }
            }
        );

        const accessToken = accessTokenResponse.data.access_token;

        axiosInstance = axios.create({
            baseURL: baseUrl,
            headers: {
                "Content-Type": "application/json", // eslint-disable-line @typescript-eslint/naming-convention
                Authorization: `Bearer ${accessToken}` // eslint-disable-line @typescript-eslint/naming-convention
            }
        });

        const runtimeServices = await runtimeServiceProvider.launch(1);
        consumptionServices = runtimeServices[0].consumption;
    });

    afterAll(async () => {
        await eudiploContainer?.stop();

        await runtimeServiceProvider.stop();
    });

    test("issuance", async () => {
        const credentialOfferUrl = (
            await axiosInstance.post("/issuer-management/offer", {
                response_type: "uri", // eslint-disable-line @typescript-eslint/naming-convention
                issuanceId: eudiploIssuanceConfigurationId
            })
        ).data.uri;

        const loadResult = await consumptionServices.openId4Vc.resolveCredentialOffer({ credentialOfferUrl });
        expect(loadResult).toBeSuccessful();

        const resolveResult = await consumptionServices.openId4Vc.acceptCredentialOffer({
            credentialOffer: loadResult.value.credentialOffer,
            credentialConfigurationIds: [eudiploCredentialIdInConfiguration]
        });
        expect(resolveResult).toBeSuccessful();

        expect((resolveResult.value.content.value as unknown as VerifiableCredential).displayInformation?.[0].name).toBe("Employee ID Card");
    });

    test("presentation", async () => {
        const authorizationRequestUrl = (
            await axiosInstance.post(`/presentation-management/request`, {
                response_type: "uri", // eslint-disable-line @typescript-eslint/naming-convention
                requestId: eudiploPresentationConfigurationId
            })
        ).data.uri;

        const loadResult = await consumptionServices.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl });
        expect(loadResult).toBeSuccessful();

        const queryResult = loadResult.value.authorizationRequest.dcql!.queryResult;
        expect(queryResult.can_be_satisfied).toBe(true);

        const credentialMatches = queryResult.credential_matches["EmployeeIdCard-vc-sd-jwt"];
        expect(credentialMatches.valid_credentials).toHaveLength(1);

        // TODO: send the presentation with a manually selected credential
    });

    function startEudiplo() {
        const eudiploContainer = new GenericContainer("ghcr.io/openwallet-foundation-labs/eudiplo:1.9")
            .withCopyDirectoriesToContainer([
                {
                    source: path.resolve(path.join(__dirname, "..", "..", "..", "..", ".dev", "eudiplo-assets")),
                    target: "/app/config"
                }
            ])
            .withEnvironment({
                JWT_SECRET: "OgwrDcgVQQ2yZwcFt7kPxQm3nUF+X3etF6MdLTstZAY=", // eslint-disable-line @typescript-eslint/naming-convention
                AUTH_CLIENT_ID: "root", // eslint-disable-line @typescript-eslint/naming-convention
                AUTH_CLIENT_SECRET: "test", // eslint-disable-line @typescript-eslint/naming-convention
                PUBLIC_URL: `http://localhost:${eudiploPort}`, // eslint-disable-line @typescript-eslint/naming-convention
                PORT: eudiploPort.toString() // eslint-disable-line @typescript-eslint/naming-convention
            })
            .withExposedPorts({ container: eudiploPort, host: eudiploPort })
            .start();

        return eudiploContainer;
    }
});
