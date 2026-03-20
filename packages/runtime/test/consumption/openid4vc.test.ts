import { ClaimFormat, SdJwtVcRecord } from "@credo-ts/core";
import { EudiploClient } from "@eudiplo/sdk-core";
import { AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON, AcceptShareAuthorizationRequestRequestItemParametersJSON, decodeRecord } from "@nmshd/consumption";
import { RequestJSON, ShareAuthorizationRequestRequestItemJSON, TokenContentVerifiablePresentation, VerifiableCredentialJSON } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import axios, { AxiosInstance } from "axios";
import * as client from "openid-client";
import path from "path";
import { DockerComposeEnvironment, StartedDockerComposeEnvironment, Wait } from "testcontainers";
import { Agent as UndiciAgent, fetch as undiciFetch } from "undici";
import { IncomingRequestStatusChangedEvent } from "../../src";
import { RuntimeServiceProvider, syncUntilHasMessageWithRequest, syncUntilHasRelationships, TestRuntimeServices } from "../lib";

const fetchInstance: typeof fetch = (async (input: any, init: any) => {
    const response = await undiciFetch(input, { ...init, dispatcher: new UndiciAgent({}) });
    return response;
}) as unknown as typeof fetch;

const runtimeServiceProvider = new RuntimeServiceProvider(fetchInstance);
let runtimeServices1: TestRuntimeServices;

let serviceAxiosInstance: AxiosInstance;

let dockerComposeStack: StartedDockerComposeEnvironment | undefined;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(1, { enableDeciderModule: true, enableRequestModule: true });
    runtimeServices1 = runtimeServices[0];

    let oid4vcServiceBaseUrl = process.env.OPENID4VC_SERVICE_BASEURL!;
    if (!oid4vcServiceBaseUrl) {
        dockerComposeStack = await startOid4VcComposeStack();
        const mappedPort = dockerComposeStack.getContainer("oid4vc-service-1").getMappedPort(9000);
        oid4vcServiceBaseUrl = `http://localhost:${mappedPort}`;
    }
    serviceAxiosInstance = axios.create({
        baseURL: oid4vcServiceBaseUrl,
        headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            "Content-Type": "application/json"
        }
    });
    await createActiveRelationshipToService(runtimeServices1, serviceAxiosInstance);
}, 120000);

afterAll(async () => {
    await runtimeServiceProvider.stop();

    if (dockerComposeStack) await dockerComposeStack.down();
});

describe("EUDIPLO", () => {
    const clientId = "test-admin";
    const clientSecret = "57c9cd444bf402b2cc1f5a0d2dafd3955bd9042c0372db17a4ede2d5fbda88e5";

    const eudiploPresentationConfigurationId = "test";
    const eudiploCredentialConfigurationId = "test";

    let eudiploClient: EudiploClient;

    beforeAll(() => {
        const baseUrl = `http://localhost:3000`;

        eudiploClient = new EudiploClient({
            baseUrl,
            clientId,
            clientSecret
        });
    });

    test("issuance", async () => {
        const credentialOfferUrl = (
            await eudiploClient.createIssuanceOffer({
                responseType: "uri",
                credentialConfigurationIds: [eudiploCredentialConfigurationId],
                flow: "pre_authorized_code"
            })
        ).uri;

        const resolveCredentialOfferResult = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({ credentialOfferUrl });
        expect(resolveCredentialOfferResult).toBeSuccessful();

        const credentialResponsesResult = await runtimeServices1.consumption.openId4Vc.requestCredentials({
            credentialOffer: resolveCredentialOfferResult.value.credentialOffer,
            credentialConfigurationIds: [eudiploCredentialConfigurationId]
        });
        const storeCredentialsResponse = await runtimeServices1.consumption.openId4Vc.storeCredentials({
            credentialResponses: credentialResponsesResult.value.credentialResponses
        });
        expect(storeCredentialsResponse).toBeSuccessful();
        expect((storeCredentialsResponse.value.content.value as VerifiableCredentialJSON).displayInformation?.[0].logo).toBeDefined();
        expect((storeCredentialsResponse.value.content.value as VerifiableCredentialJSON).displayInformation?.[0].name).toBe("test");
    });

    test("issuance with pin authentication", async () => {
        const pin = "1234";

        const credentialOfferUrl = (
            await eudiploClient.createIssuanceOffer({
                responseType: "uri",
                credentialConfigurationIds: [eudiploCredentialConfigurationId],
                flow: "pre_authorized_code",
                txCode: pin
            })
        ).uri;

        const result = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({
            credentialOfferUrl
        });

        expect(result).toBeSuccessful();

        const credentialOffer = result.value.credentialOffer;
        const requestedCredentials = credentialOffer.credentialOfferPayload.credential_configuration_ids;

        const wrongPinRequestResult = await runtimeServices1.consumption.openId4Vc.requestCredentials({
            credentialOffer,
            credentialConfigurationIds: requestedCredentials,
            pinCode: `1${pin}`
        });
        expect(wrongPinRequestResult.isError).toBe(true);

        const requestResult = await runtimeServices1.consumption.openId4Vc.requestCredentials({
            credentialOffer,
            credentialConfigurationIds: requestedCredentials,
            pinCode: pin
        });
        expect(requestResult).toBeSuccessful();
    });

    // external authentication buggy in the latest release (1.16.0)
    // eslint-disable-next-line jest/no-disabled-tests
    test.skip("issuance with external authentication", async () => {
        const credentialOfferUrl = (
            await eudiploClient.createIssuanceOffer({
                responseType: "uri",
                credentialConfigurationIds: [eudiploCredentialConfigurationId],
                flow: "authorization_code"
            })
        ).uri;

        const resolveCredentialOfferResult = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({ credentialOfferUrl });
        expect(resolveCredentialOfferResult).toBeSuccessful();

        const server = URL.parse("https://kc-openid4vc.is.enmeshed.eu/realms/enmeshed-openid4vci")!;
        const clientId = "wallet";
        const config: client.Configuration = await client.discovery(server, clientId);
        const grantReq = await client.genericGrantRequest(config, "password", {
            username: "test",
            password: "test",
            scope: "wallet-demo"
        });

        const credentialResponsesResult = await runtimeServices1.consumption.openId4Vc.requestCredentials({
            credentialOffer: resolveCredentialOfferResult.value.credentialOffer,
            credentialConfigurationIds: [eudiploCredentialConfigurationId],
            accessToken: grantReq.access_token
        });
        expect(credentialResponsesResult).toBeSuccessful();
    });

    test("presentation", async () => {
        const authorizationRequestUrl = (
            await eudiploClient.createPresentationRequest({
                responseType: "uri",
                configId: eudiploPresentationConfigurationId
            })
        ).uri;

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

    test("issuance with request", async () => {
        const oldCredentials = (
            await runtimeServices1.consumption.attributes.getAttributes({
                query: {
                    "content.value.@type": "VerifiableCredential"
                }
            })
        ).value;

        const sentMessage = (
            await serviceAxiosInstance.post("/enmeshed-demo/credential", {
                recipient: runtimeServices1.address,
                credentialConfigurationId: eudiploCredentialConfigurationId
            })
        ).data.result;

        const requestId = (sentMessage.content as RequestJSON).id!;
        await syncUntilHasMessageWithRequest(runtimeServices1.transport, requestId);
        await runtimeServices1.consumption.incomingRequests.accept({
            requestId,
            items: [{ accept: true }]
        });

        const currentCredentials = (
            await runtimeServices1.consumption.attributes.getAttributes({
                query: {
                    "content.value.@type": "VerifiableCredential"
                }
            })
        ).value;
        expect(currentCredentials).toHaveLength(oldCredentials.length + 1);

        const oldCredentialIds = oldCredentials.map((c) => c.id);
        const createdCredential = currentCredentials.find((c) => !oldCredentialIds.includes(c.id));
        expect(createdCredential).toBeDefined();

        const credentialContent = createdCredential!.content.value as VerifiableCredentialJSON;
        const decodedCredential = decodeRecord(credentialContent.type, credentialContent.value) as SdJwtVcRecord;
        expect(decodedCredential.firstCredential.prettyClaims.givenName).toBe("aGivenName");
        expect(credentialContent.value.split("~")).toHaveLength(3); // given name is selectively disclosable, hence length 3
    });

    test("presentation with request", async () => {
        const sentMessage = (
            await serviceAxiosInstance.post("/enmeshed-demo/presentationRequests", {
                recipient: runtimeServices1.address,
                configId: eudiploCredentialConfigurationId
            })
        ).data.result;

        const requestId = (sentMessage.content as RequestJSON).id!;
        const receivedMessage = await syncUntilHasMessageWithRequest(runtimeServices1.transport, requestId);
        const authorizationRequestUrl = (receivedMessage.content.items[0] as ShareAuthorizationRequestRequestItemJSON).authorizationRequestUrl;

        const matchingAttribute = (
            await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({
                authorizationRequestUrl
            })
        ).value.matchingCredentials[0];
        await runtimeServices1.consumption.incomingRequests.accept({
            requestId,
            items: [{ accept: true, attributeId: matchingAttribute.id } as AcceptShareAuthorizationRequestRequestItemParametersJSON]
        });

        const sessionId = authorizationRequestUrl.split("%2F").at(-3)!;

        const sessionStatus = (await eudiploClient.getSession(sessionId)).status;
        expect(sessionStatus).toBe("completed"); // in case of failed presentation: Status remains "active"
    });

    test("create presentation token", async () => {
        const credentialOfferUrl = (
            await eudiploClient.createIssuanceOffer({
                responseType: "uri",
                credentialConfigurationIds: [eudiploCredentialConfigurationId],
                flow: "pre_authorized_code"
            })
        ).uri;

        const resolveCredentialOfferResult = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({ credentialOfferUrl });
        const credentialResponsesResult = await runtimeServices1.consumption.openId4Vc.requestCredentials({
            credentialOffer: resolveCredentialOfferResult.value.credentialOffer,
            credentialConfigurationIds: [eudiploCredentialConfigurationId]
        });
        const storedCredential = (
            await runtimeServices1.consumption.openId4Vc.storeCredentials({
                credentialResponses: credentialResponsesResult.value.credentialResponses
            })
        ).value;
        expect((storedCredential.content.value as VerifiableCredentialJSON).displayInformation?.[0].name).toBe("test");

        const presentationTokenResult = await runtimeServices1.consumption.openId4Vc.createPresentationToken({
            attributeId: storedCredential.id,
            expiresAt: CoreDate.utc().add({ minutes: 1 }).toString(),
            ephemeral: true
        });
        expect(presentationTokenResult).toBeSuccessful();

        const presentationTokenContent = presentationTokenResult.value.content;
        expect(presentationTokenContent).toBeDefined();
        expect(presentationTokenContent["@type"]).toBe("TokenContentVerifiablePresentation");
        expect((presentationTokenContent as TokenContentVerifiablePresentation).value).toBeDefined();
        expect((presentationTokenContent as TokenContentVerifiablePresentation).displayInformation).toBeDefined();
        expect((presentationTokenContent as TokenContentVerifiablePresentation).displayInformation![0].name).toBe("test");

        const verificationResult = await runtimeServices1.consumption.openId4Vc.verifyPresentationToken({
            tokenContent: presentationTokenContent,
            expectedNonce: presentationTokenResult.value.id
        });

        expect(verificationResult).toBeSuccessful();
        expect(verificationResult.value.isValid).toBe(true);
    });

    test("fail token verification in case of invalid signature", async () => {
        const verificationResult = await runtimeServices1.consumption.openId4Vc.verifyPresentationToken({
            tokenContent: {
                "@type": "TokenContentVerifiablePresentation",
                type: ClaimFormat.SdJwtDc,
                value: "eyJ0eXAiOiJkYytzZC1qd3QiLCJ4NWMiOlsiTUlJQmdEQ0NBU1dnQXdJQkFnSUJBVEFLQmdncWhrak9QUVFEQWpBY01Rc3dDUVlEVlFRR0V3SkVSVEVOTUFzR0ExVUVBeE1FZEdWemREQWVGdzB5TmpBeU1UY3hNelU1TVRaYUZ3MHlOekF5TVRjeE16VTVNVFphTUJ3eEN6QUpCZ05WQkFZVEFrUkZNUTB3Q3dZRFZRUURFd1IwWlhOME1Ga3dFd1lIS29aSXpqMENBUVlJS29aSXpqMERBUWNEUWdBRWRpaTNZRDd1bTNnRmF3MlJuL0FENmczU3J4V0dGQVFOR2p0NzR3VW5DSUNLSzBzNllHUk9GdnliTWhueWNOZkRnL24rZWdTeEllbXo5Q1QyT1hlTmY2TllNRll3RkFZRFZSMFJCQTB3QzRJSmJHOWpZV3hvYjNOME1BOEdBMVVkRXdFQi93UUZNQU1CQWY4d0RnWURWUjBQQVFIL0JBUURBZ0trTUIwR0ExVWREZ1FXQkJRVlB3YitISUNsOEFmZkVNSFRoTWZUblJNbGpqQUtCZ2dxaGtqT1BRUURBZ05KQURCR0FpRUE3RTNia2VNZFF2bmRnQ2thenh1SzhjemxhRklJNmtoNVMyM3ZNOGFwa0h3Q0lRQzh6VDNqbHNlTHVHZjVNREZpbCtBbUM0MzV2eVBNQ2tBV3pkK3VBeXZJUmc9PSJdLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE3NzM5MTgyNDksImV4cCI6MTc3MzkyMTg0OSwidmN0IjoidGVzdCIsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC90ZXN0IiwiY25mIjp7Imp3ayI6eyJrdHkiOiJFQyIsImNydiI6IlAtMjU2IiwieCI6Ik9URWttWHpiZXBFMThnVG8tMUxHcjE2bDVHNWdtbGtnSjZTM251N1ZSTWsiLCJ5IjoiejhHWkd3M1o3bVpHZ1oyZUE3LTMxVUdoZi1Sak5GVjc2Q2Rta1N4ZlAzQSIsImtpZCI6IjQ3MDFhNTQ2LTc5YmItNDJjMy05YTQ1LTQzNmIzYTU0MDMzYyJ9fSwiX3NkX2FsZyI6InNoYS0yNTYifQ.OYnl0hPesabuQ_XDuKFERwSeOFCtb9GHG0zaEuvAsFsH-srW9-A8npruZDpXlzhWsW85X-SNzNNsCBzJqBPfL~eyJ0eXAiOiJrYitqd3QiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE3NzM5MTgyNTMuMjYzLCJub25jZSI6IlRPS2pRSENOZjlvWFBCMGYzU05QIiwiYXVkIjoiZGVmYXVsdFByZXNlbnRhdGlvbkF1ZGllbmNlIiwic2RfaGFzaCI6ImJaS042NkhhblBZWkRDaF91RjhiUHRUbjBuekwxeXlURGNLZjRXYWN6dEkifQ.PcIF1cmsi71-qNP23A6nnu-SL6D_QLalUsZ9dJKzI7H8mLF9TdN2-J94VNVfoTfs6ejL1F1_6C3z2kKKTe3PRA"
            },
            expectedNonce: "TOKjQHCNf9oXPB0f3SNP"
        });

        expect(verificationResult).toBeSuccessful();
        expect(verificationResult.value.isValid).toBe(false);
    });
});

async function startOid4VcComposeStack() {
    let baseUrl = process.env.NMSHD_TEST_BASEURL!;
    let addressGenerationHostnameOverride: string | undefined;

    if (baseUrl.includes("localhost")) {
        addressGenerationHostnameOverride = "localhost";
        baseUrl = baseUrl.replace("localhost", "host.docker.internal");
    } else {
        addressGenerationHostnameOverride = process.env.NMSHD_TEST_ADDRESSGENERATIONHOSTNAMEOVERRIDE;
    }

    const composeFolder = path.resolve(path.join(__dirname, "..", "..", "..", "..", ".dev"));
    const composeStack = await new DockerComposeEnvironment(composeFolder, "compose.openid4vc.yml")
        .withProjectName("runtime-oid4vc-tests")
        .withEnvironment({
            // eslint-disable-next-line @typescript-eslint/naming-convention
            TEST_ENVIRONMENT: "container",
            // eslint-disable-next-line @typescript-eslint/naming-convention
            NMSHD_TEST_BASEURL: baseUrl,

            // eslint-disable-next-line @typescript-eslint/naming-convention
            NMSHD_TEST_ADDRESSGENERATIONHOSTNAMEOVERRIDE: addressGenerationHostnameOverride
        } as Record<string, string>)
        .withStartupTimeout(60000)
        .withWaitStrategy("oid4vc-service-1", Wait.forHealthCheck())
        .up();

    return composeStack;
}

async function createActiveRelationshipToService(runtime: TestRuntimeServices, serviceAxiosInstance: AxiosInstance) {
    const relationshipTemplateReference = (
        await serviceAxiosInstance.post("/enmeshed-demo/relationshipTemplates", {
            givenName: "aGivenName",
            familyName: "aFamilyName",
            city: "aCity",
            zipCode: "aZipCode",
            country: "DE",
            houseNo: "aHouseNo",
            street: "aStreet",
            recipient: "aRecipient",
            birthDay: 1,
            birthMonth: 1,
            birthYear: 2000
        })
    ).data.result;

    const loadTemplateResult = await runtime.transport.relationshipTemplates.loadPeerRelationshipTemplate({ reference: relationshipTemplateReference });
    expect(loadTemplateResult).toBeSuccessful();

    const requestId = (await runtime.eventBus.waitForEvent(IncomingRequestStatusChangedEvent)).data.request.id;

    const acceptRequestResult = await runtime.consumption.incomingRequests.accept({
        requestId,
        items: [
            { items: [{ accept: true }] },
            {
                items: [
                    { accept: true, attribute: { "@type": "IdentityAttribute", owner: "", value: { "@type": "GivenName", value: "aGivenName" } } },
                    { accept: true, attribute: { "@type": "IdentityAttribute", owner: "", value: { "@type": "Surname", value: "aFamilyName" } } },
                    {
                        accept: true,
                        attribute: {
                            "@type": "IdentityAttribute",
                            owner: "",
                            value: {
                                "@type": "StreetAddress",
                                city: "aCity",
                                country: "DE",
                                houseNo: "aHouseNo",
                                street: "aStreet",
                                zipCode: "aZipCode",
                                recipient: "aRecipient"
                            }
                        }
                    },
                    { accept: true, attribute: { "@type": "IdentityAttribute", owner: "", value: { "@type": "BirthDate", day: 1, month: 1, year: 2000 } } }
                ] as AcceptProposeAttributeRequestItemParametersWithNewAttributeJSON[]
            }
        ]
    });
    expect(acceptRequestResult).toBeSuccessful();

    await syncUntilHasRelationships(runtime.transport);
}
