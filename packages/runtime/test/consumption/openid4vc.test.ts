import { EudiploClient } from "@eudiplo/sdk-core";
import { AcceptShareAuthorizationRequestRequestItemParametersJSON } from "@nmshd/consumption";
import { RequestJSON, ShareAuthorizationRequestRequestItemJSON, TokenContentVerifiablePresentationJSON, VerifiableCredentialJSON } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import * as client from "openid-client";
import path from "path";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { Agent as UndiciAgent, fetch as undiciFetch } from "undici";
import { LocalAttributeDTO } from "../../src";
import { establishRelationship, RuntimeServiceProvider, syncUntilHasMessageWithRequest, TestRuntimeServices } from "../lib";

const fetchInstance: typeof fetch = (async (input: any, init: any) => {
    const response = await undiciFetch(input, { ...init, dispatcher: new UndiciAgent({}) });
    return response;
}) as unknown as typeof fetch;

const eudiploClientId = "test-admin";
const eudiploClientSecret = "hgHrws1JR7sS24WR1IimsVdHAT0ddlgOB3dObaGSAEOo8JSFk3N";

const eudiploPresentationConfigurationId = "test";
const eudiploCredentialConfigurationId = "test";

let eudiploClient: EudiploClient;

const runtimeServiceProvider = new RuntimeServiceProvider(fetchInstance);
let runtimeServices1: TestRuntimeServices;
let runtimeServices2: TestRuntimeServices;

let eudiploContainer: StartedTestContainer | undefined;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(2, { enableDeciderModule: true, enableRequestModule: true });
    runtimeServices1 = runtimeServices[0];
    runtimeServices2 = runtimeServices[1];

    // build connection between runtimes via relationship and request
    await establishRelationship(runtimeServices1.transport, runtimeServices2.transport);

    const eudiploBaseUrl = "http://localhost:3000";
    eudiploContainer = await startEudiplo();

    eudiploClient = new EudiploClient({
        baseUrl: eudiploBaseUrl,
        clientId: eudiploClientId,
        clientSecret: eudiploClientSecret
    });
}, 120000);

afterAll(async () => {
    await runtimeServiceProvider.stop();

    if (eudiploContainer) await eudiploContainer.stop();
});

test("issuance", async () => {
    const credentialOfferUrl = (
        await eudiploClient.createIssuanceOffer({
            credentialConfigurationIds: [eudiploCredentialConfigurationId]
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

// external authentication buggy in the latest release (4.0.1)
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

test("issuance via request", async () => {
    const oldCredentials = (
        await runtimeServices2.consumption.attributes.getAttributes({
            query: {
                "content.value.@type": "VerifiableCredential"
            }
        })
    ).value;

    const credentialOfferUrl = await eudiploClient
        .createIssuanceOffer({
            responseType: "uri",
            credentialConfigurationIds: [eudiploCredentialConfigurationId],
            flow: "pre_authorized_code"
        })
        .then((res) => res.uri);

    const request = await runtimeServices1.consumption.outgoingRequests.create({
        peer: runtimeServices2.address,
        content: {
            title: "test",
            description: "test",
            items: [
                {
                    "@type": "ShareCredentialOfferRequestItem",
                    mustBeAccepted: true,
                    credentialOfferUrl: credentialOfferUrl
                }
            ]
        }
    });

    const sentMessage = await runtimeServices1.transport.messages.sendMessage({
        recipients: [runtimeServices2.address],
        content: request.value.content
    });

    const requestId = (sentMessage.value.content as RequestJSON).id!;
    await syncUntilHasMessageWithRequest(runtimeServices2.transport, requestId);
    await runtimeServices2.consumption.incomingRequests.accept({
        requestId,
        items: [{ accept: true }]
    });

    const currentCredentials = (
        await runtimeServices2.consumption.attributes.getAttributes({
            query: {
                "content.value.@type": "VerifiableCredential"
            }
        })
    ).value;
    expect(currentCredentials).toHaveLength(oldCredentials.length + 1);
});

describe("presentation", () => {
    let storedCredential: LocalAttributeDTO;

    beforeAll(async () => {
        storedCredential = await createAndStoreCredential(eudiploClient, eudiploCredentialConfigurationId);
    });

    test("standard presentation", async () => {
        const authorizationRequestUrl = (
            await eudiploClient.createPresentationRequest({
                responseType: "uri",
                configId: eudiploPresentationConfigurationId
            })
        ).uri;

        const loadResult = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl });
        const matchingCredentials = loadResult.value.matchingCredentials;

        const currentCredentials = (
            await runtimeServices1.consumption.attributes.getAttributes({
                query: {
                    "content.value.@type": "VerifiableCredential"
                }
            })
        ).value;
        expect(matchingCredentials).toHaveLength(currentCredentials.length);

        const queryResult = loadResult.value.authorizationRequest.dcql!.queryResult;
        expect(queryResult.can_be_satisfied).toBe(true);

        const presentationResult = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({
            authorizationRequest: loadResult.value.authorizationRequest,
            attributeId: matchingCredentials[0].id
        });
        expect(presentationResult).toBeSuccessful();
        expect(presentationResult.value.status).toBe(200);
    });

    test("presentation with request", async () => {
        const presentationRequest = await eudiploClient.createPresentationRequest({ responseType: "uri", configId: eudiploPresentationConfigurationId });

        const request = await runtimeServices1.consumption.outgoingRequests.create({
            peer: runtimeServices2.address,
            content: {
                title: "test",
                description: "test",
                items: [
                    {
                        "@type": "ShareAuthorizationRequestRequestItem",
                        mustBeAccepted: true,
                        authorizationRequestUrl: presentationRequest.uri
                    }
                ]
            }
        });

        await runtimeServices1.transport.messages.sendMessage({
            recipients: [runtimeServices2.address],
            content: request.value.content
        });

        const receivedMessage = await syncUntilHasMessageWithRequest(runtimeServices2.transport, request.value.id);
        const receivedRequestUrl = (receivedMessage.content.items[0] as ShareAuthorizationRequestRequestItemJSON).authorizationRequestUrl;

        const matchingAttribute = (
            await runtimeServices2.consumption.openId4Vc.resolveAuthorizationRequest({
                authorizationRequestUrl: receivedRequestUrl
            })
        ).value.matchingCredentials[0];
        await runtimeServices2.consumption.incomingRequests.accept({
            requestId: request.value.id,
            items: [{ accept: true, attributeId: matchingAttribute.id } as AcceptShareAuthorizationRequestRequestItemParametersJSON]
        });

        const sessionStatus = (await eudiploClient.getSession(presentationRequest.sessionId)).status;
        expect(sessionStatus).toBe("completed");
    });

    describe("presentation token", () => {
        test("create presentation token", async () => {
            const createPresentationTokenResult = await runtimeServices1.consumption.openId4Vc.createPresentationToken({
                attributeId: storedCredential.id,
                expiresAt: CoreDate.utc().add({ minutes: 1 }).toString(),
                ephemeral: true
            });

            expect(createPresentationTokenResult).toBeSuccessful();

            const presentationTokenContent = createPresentationTokenResult.value.content;
            expect(presentationTokenContent).toBeDefined();
            expect(presentationTokenContent["@type"]).toBe("TokenContentVerifiablePresentation");
            expect((presentationTokenContent as TokenContentVerifiablePresentationJSON).value).toBeDefined();
            expect((presentationTokenContent as TokenContentVerifiablePresentationJSON).displayInformation).toBeDefined();
            expect((presentationTokenContent as TokenContentVerifiablePresentationJSON).displayInformation![0].name).toBe("test");
        });

        test("verify presentation token", async () => {
            const presentationToken = await createPresentationToken(storedCredential);

            const verificationResult = await runtimeServices1.consumption.openId4Vc.verifyPresentationToken({
                token: presentationToken
            });

            expect(verificationResult).toBeSuccessful();
            expect(verificationResult.value.isValid).toBe(true);
        });

        test("fail token verification in case of invalid nonce", async () => {
            const presentationToken = await createPresentationToken(storedCredential);

            const verificationResult = await runtimeServices1.consumption.openId4Vc.verifyPresentationToken({
                token: { ...presentationToken, id: "TOKXXXXXXXXXXXXXXXXX" }
            });

            expect(verificationResult).toBeSuccessful();
            expect(verificationResult.value.isValid).toBe(false);
            expect(verificationResult.value.error?.message).toBe("Verify Error: Invalid Nonce");
        });

        test("fail token verification in case of invalid signature", async () => {
            const presentationToken = await createPresentationToken(storedCredential);

            const tokenContentWithTamperedSignature = tamperSignatureOfTokenContent(presentationToken.content as TokenContentVerifiablePresentationJSON);

            const verificationResult = await runtimeServices1.consumption.openId4Vc.verifyPresentationToken({
                token: { ...presentationToken, content: tokenContentWithTamperedSignature }
            });

            expect(verificationResult).toBeSuccessful();
            expect(verificationResult.value.isValid).toBe(false);
            expect(verificationResult.value.error?.message).toBe("Verify Error: Invalid JWT Signature");
        });
    });
});

async function createPresentationToken(storedCredential: LocalAttributeDTO) {
    const result = await runtimeServices1.consumption.openId4Vc.createPresentationToken({
        attributeId: storedCredential.id,
        expiresAt: CoreDate.utc().add({ minutes: 1 }).toString(),
        ephemeral: true
    });

    return result.value;
}

async function createAndStoreCredential(eudiploClient: EudiploClient, eudiploCredentialConfigurationId: string) {
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
    return storedCredential;
}

function tamperSignatureOfTokenContent(tokenContent: TokenContentVerifiablePresentationJSON): TokenContentVerifiablePresentationJSON {
    const splittedValue = tokenContent.value.split(".");

    const header = splittedValue[0];
    const payload = splittedValue[1];
    const disclosure = splittedValue[3];
    const keyBindingJWT = splittedValue[4];

    // the following is a signature of some old SD-JWT that we use here just to have a signature that is valid in structure but does not match the
    // header and payload of the token content, thus leading to a failed verification due to invalid signature
    const tamperedSignature = "V6RFMHpLyj2NOi4BphSygcbXxWvBeArY9zdkUGj-ERJO9S3CgGxst8lGyV0DJMT7N_-85kIDcukHDw2ia9KITQ~eyJ0eXAiOiJrYitqd3QiLCJhbGciOiJFUzI1NiJ9";

    const tamperedTokenContent = {
        ...tokenContent,
        value: `${header}.${payload}.${tamperedSignature}.${disclosure}.${keyBindingJWT}`
    };
    return tamperedTokenContent;
}

async function startEudiplo(): Promise<StartedTestContainer> {
    return await new GenericContainer("ghcr.io/openwallet-foundation-labs/eudiplo:4.1.0@sha256:14bc55723f8cdca0837b91541c80466e406e753c1febd07a26400fab1ca37e2d")
        .withEnvironment({
            PUBLIC_URL: "http://localhost:3000", // eslint-disable-line @typescript-eslint/naming-convention
            MASTER_SECRET: "OgwrDcgVQQ2yZwcFt7kPxQm3nUF+X3etF6MdLTstZAY=", // eslint-disable-line @typescript-eslint/naming-convention
            AUTH_CLIENT_ID: "root", // eslint-disable-line @typescript-eslint/naming-convention
            AUTH_CLIENT_SECRET: "test", // eslint-disable-line @typescript-eslint/naming-convention
            CONFIG_IMPORT: "true", // eslint-disable-line @typescript-eslint/naming-convention
            CONFIG_IMPORT_FORCE: "true", // eslint-disable-line @typescript-eslint/naming-convention
            CONFIG_FOLDER: "/config", // eslint-disable-line @typescript-eslint/naming-convention
            PORT: "3000" // eslint-disable-line @typescript-eslint/naming-convention
        } as Record<string, string>)
        .withExposedPorts({ container: 3000, host: 3000 })
        .withCopyDirectoriesToContainer([
            {
                source: path.resolve(path.join(__dirname, "../../../../.dev/eudiplo/config")),
                target: "/config"
            }
        ])
        .withStartupTimeout(60000)
        .withWaitStrategy(Wait.forHealthCheck())
        .start();
}
