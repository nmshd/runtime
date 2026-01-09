import { AcceptShareAuthorizationRequestRequestItemParametersJSON, OwnIdentityAttributeJSON } from "@nmshd/consumption";
import { VerifiableCredential, VerifiableCredentialJSON } from "@nmshd/content";
import axios, { AxiosInstance } from "axios";
import { jwtDecode } from "jwt-decode";
import * as client from "openid-client";
import path from "path";
import { DockerComposeEnvironment, GenericContainer, StartedDockerComposeEnvironment, StartedTestContainer, Wait } from "testcontainers";
import { Agent as UndiciAgent, fetch as undiciFetch } from "undici";
import { ShareCredentialOfferRequestItemProcessedByRecipientEvent } from "../../src";
import { ensureActiveRelationship, exchangeAndAcceptRequestByMessage, RuntimeServiceProvider, TestRuntimeServices } from "../lib";

const fetchInstance: typeof fetch = (async (input: any, init: any) => {
    const response = await undiciFetch(input, { ...init, dispatcher: new UndiciAgent({}) });
    return response;
}) as unknown as typeof fetch;

const runtimeServiceProvider = new RuntimeServiceProvider(fetchInstance);
let runtimeServices1: TestRuntimeServices;
let runtimeServices2: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(2, { enableDeciderModule: true, enableRequestModule: true });
    runtimeServices1 = runtimeServices[0];
    runtimeServices2 = runtimeServices[1];

    await ensureActiveRelationship(runtimeServices1.transport, runtimeServices2.transport);
}, 120000);

afterAll(async () => {
    await runtimeServiceProvider.stop();
});

describe("custom openid4vc service", () => {
    let axiosInstance: AxiosInstance;
    let dockerComposeStack: StartedDockerComposeEnvironment | undefined;

    beforeAll(async () => {
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
        if (dockerComposeStack) await dockerComposeStack.down();
    });

    let credentialOfferUrl: string;

    describe("sd-jwt", () => {
        test("should process a given sd-jwt credential offer", async () => {
            const response = await axiosInstance.post("/issuance/credentialOffers", {
                credentialConfigurationIds: ["EmployeeIdCard-sdjwt"]
            });
            expect(response.status).toBe(200);
            const responseData = await response.data;

            credentialOfferUrl = responseData.result.credentialOffer;

            const result = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({
                credentialOfferUrl
            });

            expect(result).toBeSuccessful();

            const credentialOffer = result.value.credentialOffer;
            const requestedCredentials = credentialOffer.credentialOfferPayload.credential_configuration_ids;

            const credentialResponseResult = await runtimeServices1.consumption.openId4Vc.requestCredentials({
                credentialOffer,
                credentialConfigurationIds: requestedCredentials
            });
            const storeResult = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses: credentialResponseResult.value.credentialResponses });
            expect(storeResult).toBeSuccessful();
            expect(typeof storeResult.value.id).toBe("string");

            const credential = storeResult.value.content.value as VerifiableCredentialJSON;
            expect(credential.displayInformation?.[0].logo).toBeDefined();
            expect(credential.displayInformation?.[0].name).toBe("Employee ID Card");
        });

        test("should be able to process a credential offer with pin authentication", async () => {
            const response = await axiosInstance.post("/issuance/credentialOffers", {
                credentialConfigurationIds: ["EmployeeIdCard-sdjwt"],
                authentication: "pin"
            });

            expect(response.status).toBe(200);
            const responseData = await response.data;

            credentialOfferUrl = responseData.result.credentialOffer;
            const pin = responseData.result.pin;
            expect(pin).toBeDefined();

            const result = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({
                credentialOfferUrl
            });

            expect(result).toBeSuccessful();

            const credentialOffer = result.value.credentialOffer;
            const requestedCredentials = credentialOffer.credentialOfferPayload.credential_configuration_ids;

            const requestResult = await runtimeServices1.consumption.openId4Vc.requestCredentials({
                credentialOffer,
                credentialConfigurationIds: requestedCredentials,
                pinCode: pin
            });

            const storeResult = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses: requestResult.value.credentialResponses });

            expect(storeResult).toBeSuccessful();
            expect(typeof storeResult.value.id).toBe("string");

            const credential = storeResult.value.content.value as unknown as VerifiableCredential;
            expect(credential.displayInformation?.[0].logo).toBeDefined();
            expect(credential.displayInformation?.[0].name).toBe("Employee ID Card");
        });

        test("should be able to process a credential offer with external authentication", async () => {
            const response = await axiosInstance.post("/issuance/credentialOffers", {
                credentialConfigurationIds: ["EmployeeIdCard-sdjwt"],

                authentication: "externalAuthentication"
            });

            expect(response.status).toBe(200);

            const responseData = await response.data;

            credentialOfferUrl = responseData.result.credentialOffer;

            const result = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({
                credentialOfferUrl
            });
            expect(result).toBeSuccessful();
            const credentialOffer = result.value.credentialOffer;

            const requestedCredentialIds = credentialOffer.credentialOfferPayload.credential_configuration_ids;

            const server = URL.parse("https://kc-openid4vc.is.enmeshed.eu/realms/enmeshed-openid4vci")!;
            const clientId = "wallet";
            const config: client.Configuration = await client.discovery(server, clientId);
            const grantReq = await client.genericGrantRequest(config, "password", {
                username: "test",
                password: "test",
                scope: "wallet-demo"
            });

            const credentialRequestResult = await runtimeServices1.consumption.openId4Vc.requestCredentials({
                credentialOffer,
                credentialConfigurationIds: requestedCredentialIds,
                accessToken: grantReq.access_token
            });
            const storeResult = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses: credentialRequestResult.value.credentialResponses });

            expect(storeResult).toBeSuccessful();
            expect(typeof storeResult.value.id).toBe("string");

            const credential = storeResult.value.content.value as unknown as VerifiableCredential;
            expect(credential.displayInformation?.[0].logo).toBeDefined();
            expect(credential.displayInformation?.[0].name).toBe("Employee ID Card");

            const encodedSdJwt = credential.value as string;
            const decoded = jwtDecode<{ pernr: string; lob: string }>(encodedSdJwt);

            // these values are set in the test authorization server for the test user
            expect(decoded.pernr).toBe("0019122023");
            expect(decoded.lob).toBe("Test BU");
        });

        test("should be able to process a given sd-jwt credential presentation with pex", async () => {
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
            });
            expect(response.status).toBe(200);
            const responseData = await response.data;

            const result = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: responseData.result.presentationRequest });
            const matchingCredentials = result.value.matchingCredentials;
            expect(matchingCredentials).toHaveLength(3);

            const request = result.value.authorizationRequest;
            expect(request.presentationExchange!.credentialsForRequest.areRequirementsSatisfied).toBe(true);

            const presentationResult = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({
                authorizationRequest: result.value.authorizationRequest,
                attributeId: matchingCredentials[0].id
            });
            expect(presentationResult).toBeSuccessful();
            expect(presentationResult.value.status).toBe(200);
        });

        test("should be able to process a given sd-jwt credential presentation with dcql", async () => {
            // Ensure the first test has completed
            expect(credentialOfferUrl).toBeDefined();

            const response = await axiosInstance.post("/presentation/presentationRequests", {
                dcql: {
                    credentials: [
                        {
                            id: "EmployeeIdCard-vc-sd-jwt",
                            format: "vc+sd-jwt",
                            meta: {
                                // eslint-disable-next-line @typescript-eslint/naming-convention
                                vct_values: ["EmployeeIdCard"]
                            }
                        }
                    ]
                },
                signWithDid: true
            });
            expect(response.status).toBe(200);
            const responseData = await response.data;

            const result = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: responseData.result.presentationRequest });
            const matchingCredentials = result.value.matchingCredentials;
            expect(matchingCredentials).toHaveLength(3);

            const request = result.value.authorizationRequest;
            expect(request.dcql!.queryResult.can_be_satisfied).toBe(true);

            const presentationResult = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({
                authorizationRequest: result.value.authorizationRequest,
                attributeId: matchingCredentials[0].id
            });
            expect(presentationResult).toBeSuccessful();
            expect(presentationResult.value.status).toBe(200);
        });

        test("getting all verifiable credentials should not return an empty list", async () => {
            // Ensure the first test has completed
            expect(credentialOfferUrl).toBeDefined();

            const acceptanceResult = await runtimeServices1.consumption.attributes.getOwnIdentityAttributes({
                query: {
                    "content.value.@type": "VerifiableCredential"
                }
            });

            expect(acceptanceResult).toBeSuccessful();
            expect(acceptanceResult.value.length).toBeGreaterThan(0);
        });
    });

    describe("mdoc", () => {
        test("should process a given mdoc credential offer", async () => {
            const response = await axiosInstance.post("/issuance/credentialOffers", {
                credentialConfigurationIds: ["EmployeeIdCard-mdoc"]
            });
            expect(response.status).toBe(200);
            const responseData = await response.data;

            credentialOfferUrl = responseData.result.credentialOffer;

            const result = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({
                credentialOfferUrl
            });

            expect(result).toBeSuccessful();

            const credentialOffer = result.value.credentialOffer;
            const requestedCredentials = credentialOffer.credentialOfferPayload.credential_configuration_ids;

            const credentialResponseResult = await runtimeServices1.consumption.openId4Vc.requestCredentials({
                credentialOffer,
                credentialConfigurationIds: requestedCredentials
            });
            const storeResult = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses: credentialResponseResult.value.credentialResponses });
            expect(storeResult).toBeSuccessful();
            expect(typeof storeResult.value.id).toBe("string");

            const credential = storeResult.value.content.value as VerifiableCredentialJSON;
            expect(credential.displayInformation?.[0].logo).toBeDefined();
            expect(credential.displayInformation?.[0].name).toBe("Employee ID Card");
        });

        test("should be able to process a given mdoc pex credential presentation", async () => {
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
                version: "v1.draft21",
                encryptResponse: true
            });
            expect(response.status).toBe(200);
            const responseData = await response.data;

            const result = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: responseData.result.presentationRequest });
            const matchingCredentials = result.value.matchingCredentials;
            expect(matchingCredentials).toHaveLength(1);

            const request = result.value.authorizationRequest;
            expect(request.presentationExchange!.credentialsForRequest.areRequirementsSatisfied).toBe(true);

            const presentationResult = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({
                authorizationRequest: result.value.authorizationRequest,
                attributeId: matchingCredentials[0].id
            });
            expect(presentationResult).toBeSuccessful();
            expect(presentationResult.value.status).toBe(200);
        });

        // TODO: un-skip this test once SD is implemented because all mdoc claims are SD - somehow the pex test doesn't fail
        // eslint-disable-next-line jest/no-disabled-tests
        test.skip("should be able to process a given mdoc dcql credential presentation", async () => {
            // Ensure the first test has completed
            expect(credentialOfferUrl).toBeDefined();

            const response = await axiosInstance.post("/presentation/presentationRequests", {
                dcql: {
                    credentials: [
                        {
                            id: "EmployeeIdCard-mdoc",
                            format: "mso_mdoc",
                            // eslint-disable-next-line @typescript-eslint/naming-convention
                            meta: { doctype_value: "EmployeeIdCard" },
                            claims: [{ path: ["employeeIdCard", "degree"] }]
                        }
                    ]
                }
            });
            expect(response.status).toBe(200);
            const responseData = await response.data;

            const result = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: responseData.result.presentationRequest });
            const matchingCredentials = result.value.matchingCredentials;
            expect(matchingCredentials).toHaveLength(1);

            const request = result.value.authorizationRequest;
            expect(request.dcql!.queryResult.can_be_satisfied).toBe(true);

            const presentationResult = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({
                authorizationRequest: result.value.authorizationRequest,
                attributeId: matchingCredentials[0].id
            });
            expect(presentationResult).toBeSuccessful();
            expect(presentationResult.value.status).toBe(200);
        });
    });

    test("transfer offer using requests", async () => {
        const response = await axiosInstance.post("/issuance/credentialOffers", {
            credentialConfigurationIds: ["EmployeeIdCard-sdjwt"]
        });
        expect(response.status).toBe(200);
        const responseData = await response.data;

        credentialOfferUrl = responseData.result.credentialOffer;

        await exchangeAndAcceptRequestByMessage(
            runtimeServices1,
            runtimeServices2,
            {
                content: { items: [{ "@type": "ShareCredentialOfferRequestItem", credentialOfferUrl, mustBeAccepted: true }] },
                peer: (await runtimeServices2.transport.account.getIdentityInfo()).value.address
            },
            [{ accept: true }]
        );

        await expect(runtimeServices1.eventBus).toHavePublished(
            ShareCredentialOfferRequestItemProcessedByRecipientEvent,
            (m) => m.data.accepted && m.data.credentialOfferUrl === credentialOfferUrl
        );

        const attributes = await runtimeServices2.consumption.attributes.getOwnIdentityAttributes({
            query: {
                "content.value.@type": "VerifiableCredential"
            }
        });

        expect(attributes).toBeSuccessful();
        expect(attributes.value.length).toBeGreaterThan(0);

        const createPresentationResponse = await axiosInstance.post("/presentation/presentationRequests", {
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
        expect(createPresentationResponse.status).toBe(200);
        const createPresentationResponseData = await createPresentationResponse.data;

        const result = await runtimeServices2.consumption.openId4Vc.resolveAuthorizationRequest({
            authorizationRequestUrl: createPresentationResponseData.result.presentationRequest
        });
        const matchingCredentials = result.value.matchingCredentials;
        expect(matchingCredentials).toHaveLength(1);

        const request = result.value.authorizationRequest;
        expect(request.presentationExchange!.credentialsForRequest.areRequirementsSatisfied).toBe(true);

        const presentationResult = await runtimeServices2.consumption.openId4Vc.acceptAuthorizationRequest({
            authorizationRequest: result.value.authorizationRequest,
            attributeId: matchingCredentials[0].id
        });
        expect(presentationResult).toBeSuccessful();
        expect(presentationResult.value.status).toBe(200);
    });

    test("request presentation using requests", async () => {
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
        const authorizationRequestUrl = response.data.result.presentationRequest as string;
        const authorizationRequestId = authorizationRequestUrl.split("%2F").at(-1)?.slice(0, 36);

        const matchingCredential = (await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl })).value.matchingCredentials[0];

        await exchangeAndAcceptRequestByMessage(
            runtimeServices1,
            runtimeServices2,
            {
                content: {
                    items: [
                        {
                            "@type": "ShareAuthorizationRequestRequestItem",
                            authorizationRequestUrl,
                            mustBeAccepted: true
                        }
                    ]
                },
                peer: (await runtimeServices2.transport.account.getIdentityInfo()).value.address
            },
            [{ accept: true, attribute: matchingCredential as OwnIdentityAttributeJSON } as AcceptShareAuthorizationRequestRequestItemParametersJSON]
        );

        const verificationStatus = (await axiosInstance.get(`/presentation/presentationRequests/${authorizationRequestId}/verificationSessionState`)).data.result;
        expect(verificationStatus).toBe("ResponseVerified");
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
    });

    afterAll(async () => {
        await eudiploContainer?.stop();
    });

    test("issuance", async () => {
        const credentialOfferUrl = (
            await axiosInstance.post("/issuer-management/offer", {
                response_type: "uri", // eslint-disable-line @typescript-eslint/naming-convention
                issuanceId: eudiploIssuanceConfigurationId
            })
        ).data.uri;

        const resolveCredentialOfferResult = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({ credentialOfferUrl });
        expect(resolveCredentialOfferResult).toBeSuccessful();

        const credentialResponsesResult = await runtimeServices1.consumption.openId4Vc.requestCredentials({
            credentialOffer: resolveCredentialOfferResult.value.credentialOffer,
            credentialConfigurationIds: [eudiploCredentialIdInConfiguration]
        });
        const storeCredentialsResponse = await runtimeServices1.consumption.openId4Vc.storeCredentials({
            credentialResponses: credentialResponsesResult.value.credentialResponses
        });
        expect(storeCredentialsResponse).toBeSuccessful();

        expect((storeCredentialsResponse.value.content.value as VerifiableCredentialJSON).displayInformation?.[0].name).toBe("Employee ID Card");
    });

    // TODO: un-skip this test once a workable EUDIPLO version is available - the current version 1.9 doesn't work with credo because the exchange key for presentation encryption doesn't have a kid, and the currently latest version 1.13 can't be easily configured with the UI because the issuer display can't be configured
    // eslint-disable-next-line jest/no-disabled-tests
    test.skip("presentation", async () => {
        const authorizationRequestUrl = (
            await axiosInstance.post(`/presentation-management/request`, {
                response_type: "uri", // eslint-disable-line @typescript-eslint/naming-convention
                requestId: eudiploPresentationConfigurationId
            })
        ).data.uri;

        const loadResult = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl });
        const matchingCredentials = loadResult.value.matchingCredentials;
        expect(matchingCredentials).toHaveLength(1);

        const queryResult = loadResult.value.authorizationRequest.dcql!.queryResult;
        expect(queryResult.can_be_satisfied).toBe(true);

        const presentationResult = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({
            authorizationRequest: loadResult.value.authorizationRequest,
            attributeId: matchingCredentials[0].id
        });
        expect(presentationResult).toBeSuccessful();
        expect(presentationResult.value.status).toBe(200);
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
