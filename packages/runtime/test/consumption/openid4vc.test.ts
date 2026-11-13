/* eslint-disable @typescript-eslint/naming-convention -- Standard OpenID4VC and DCQL field names. */
import { EudiploClient } from "@eudiplo/sdk-core";
import { AcceptShareAuthorizationRequestRequestItemParametersJSON, OpenId4VciCredentialResponseJSON } from "@nmshd/consumption";
import { compactDecrypt, exportJWK, generateKeyPair } from "jose";
import { deflateSync } from "node:zlib";
import { RequestItemJSONDerivations, TokenContentVerifiablePresentationJSON, VerifiableCredentialJSON } from "@nmshd/content";
import { CoreBuffer } from "@nmshd/crypto";
import { CoreDate } from "@nmshd/core-types";
import { TokenContentDeviceSharedSecret } from "@nmshd/transport";
import { createHash, createPrivateKey, createPublicKey, ECDH, generateKeyPairSync, sign, verify, webcrypto, X509Certificate } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { StartedTestContainer } from "testcontainers";
import { startEudiplo } from "../../../../.dev/eudiplo/startEudiplo";
import { LocalAttributeDTO } from "../../src";
import { establishRelationship, RuntimeServiceProvider, syncUntilHasMessageWithRequest, syncUntilHasMessageWithResponse, TestRuntimeServices } from "../lib";

const eudiploBaseUrl = "http://localhost:3000";

const issuerResponses = new Map<string, Response>();
const outboundRequests = new Map<string, RequestInit | undefined>();
const inboundResponses = new Map<string, Response>();
const issuerHandlers = new Map<string, (init: RequestInit | undefined) => Response | Promise<Response>>();
const fetchInstance: typeof fetch = async (input, init) => {
    outboundRequests.set(input.toString(), init);
    const response = await (issuerHandlers.get(input.toString())?.(init) ?? issuerResponses.get(input.toString())?.clone() ?? fetch(input, init));
    inboundResponses.set(input.toString(), response.clone());
    return response;
};

const eudiploClientId = "test-admin";
const eudiploClientSecret = "hgHrws1JR7sS24WR1IimsVdHAT0ddlgOB3dObaGSAEOo8JSFk3N";

const eudiploPresentationConfigurationId = "test";
const eudiploCredentialConfigurationId = "test";

let eudiploClient: EudiploClient;

const runtimeServiceProvider = new RuntimeServiceProvider(fetchInstance);
let runtimeServices1: TestRuntimeServices;
let runtimeServices2: TestRuntimeServices;
let emptyRuntimeServices: TestRuntimeServices;

let eudiploContainer: StartedTestContainer | undefined;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(3, { enableDeciderModule: true, enableRequestModule: true });
    runtimeServices1 = runtimeServices[0];
    runtimeServices2 = runtimeServices[1];
    emptyRuntimeServices = runtimeServices[2];

    await establishRelationship(runtimeServices1.transport, runtimeServices2.transport);

    eudiploContainer = await startEudiplo();

    eudiploClient = new EudiploClient({
        baseUrl: eudiploBaseUrl,
        clientId: eudiploClientId,
        clientSecret: eudiploClientSecret
    });
}, 120000);

afterAll(async () => {
    await runtimeServiceProvider.stop();

    await eudiploContainer?.stop();
});

afterEach(() => {
    vi.restoreAllMocks();
    issuerResponses.clear();
    outboundRequests.clear();
    inboundResponses.clear();
    issuerHandlers.clear();
});

test("request an SD-JWT credential using a pre-authorized code", async () => {
    // Arrange
    const credentialOfferUrl = (
        await eudiploClient.createIssuanceOffer({
            credentialConfigurationIds: [eudiploCredentialConfigurationId],
            responseType: "uri",
            flow: "pre_authorized_code"
        })
    ).uri;
    const resolveCredentialOfferResult = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({ credentialOfferUrl });
    const issuerCertificateConfig = JSON.parse(await readFile(resolve(process.cwd(), "../../.dev/eudiplo/config/test/certs/certificate.json"), "utf8")) as {
        crt: string[];
    };
    const issuerPublicKey = new X509Certificate(issuerCertificateConfig.crt[0]).publicKey;

    // Act
    const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({
        credentialOffer: resolveCredentialOfferResult.value.credentialOffer,
        credentialConfigurationIds: [eudiploCredentialConfigurationId]
    });

    // Assert
    expect(result).toBeSuccessful();
    expect(result.value.credentialResponses).toHaveLength(1);
    const credential = result.value.credentialResponses[0];
    expect(credential.claimFormat).toBe("dc+sd-jwt");

    const [issuerJwt, disclosure, keyBindingJwt] = credential.encoded.split("~");
    const [header, payload, signature] = issuerJwt.split(".");
    expect(JSON.parse(Buffer.from(header, "base64url").toString())).toMatchObject({ alg: "ES256", typ: "dc+sd-jwt" });
    expect(verify("sha256", Buffer.from(`${header}.${payload}`), { key: issuerPublicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(signature, "base64url"))).toBe(true);
    expect(keyBindingJwt).toBe("");

    const disclosureDigest = createHash("sha256").update(disclosure).digest("base64url");
    expect(JSON.parse(Buffer.from(payload, "base64url").toString())).toMatchObject({
        iss: `${eudiploBaseUrl}/issuers/test`,
        vct: "https://example.com/credentials/test",
        _sd_alg: "sha-256",
        _sd: [disclosureDigest],
        cnf: { jwk: expect.objectContaining({ kty: "EC", crv: "P-256", x: expect.any(String), y: expect.any(String) }) }
    });
    expect(JSON.parse(Buffer.from(disclosure, "base64url").toString())).toEqual([expect.any(String), "test", "test"]);
});

test("request a credential using the correct transaction code", async () => {
    // Arrange
    const pin = "1234";
    const credentialOfferUrl = (
        await eudiploClient.createIssuanceOffer({
            responseType: "uri",
            credentialConfigurationIds: [eudiploCredentialConfigurationId],
            flow: "pre_authorized_code",
            txCode: pin
        })
    ).uri;

    const resolveCredentialOfferResult = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({ credentialOfferUrl });

    // Act
    const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({
        credentialOffer: resolveCredentialOfferResult.value.credentialOffer,
        credentialConfigurationIds: [eudiploCredentialConfigurationId],
        pinCode: pin
    });

    // Assert
    expect(result).toBeSuccessful();
    expect(result.value.credentialResponses).toHaveLength(1);
});

describe("credential offers", () => {
    test("resolve a credential offer by reference", async () => {
        // Arrange
        const offer = await eudiploClient.createIssuanceOffer({ credentialConfigurationIds: ["test"], flow: "pre_authorized_code" });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({ credentialOfferUrl: offer.uri });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.credentialOffer.credentialOfferPayload).toMatchObject({
            credential_issuer: `${eudiploBaseUrl}/issuers/test`,
            credential_configuration_ids: ["test"],
            grants: { "urn:ietf:params:oauth:grant-type:pre-authorized_code": { "pre-authorized_code": expect.any(String) } }
        });
        expect(result.value.credentialOffer.metadata.credentialIssuer.credential_configurations_supported.test.format).toBe("dc+sd-jwt");
    });

    test("resolve a credential offer by value", async () => {
        // Arrange
        const offer = await prepareCredentialOffer();
        const credentialOfferUrl = `openid-credential-offer://?credential_offer=${encodeURIComponent(JSON.stringify(offer.credentialOfferPayload))}`;

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({ credentialOfferUrl });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.credentialOffer.credentialOfferPayload).toEqual(offer.credentialOfferPayload);
    });

    test("resolve transaction code requirements", async () => {
        // Arrange
        const offer = await eudiploClient.createIssuanceOffer({ credentialConfigurationIds: ["test"], flow: "pre_authorized_code", txCode: "1234" });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({ credentialOfferUrl: offer.uri });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.credentialOffer.credentialOfferPayload.grants?.["urn:ietf:params:oauth:grant-type:pre-authorized_code"]?.tx_code).toMatchObject({
            input_mode: "numeric",
            length: 4
        });
    });

    test("resolve an authorization code offer", async () => {
        // Arrange
        const offer = await eudiploClient.createIssuanceOffer({ credentialConfigurationIds: ["test"], flow: "authorization_code", authorizationServer: "test-built-in" });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({ credentialOfferUrl: offer.uri });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.credentialOffer.credentialOfferPayload.grants?.authorization_code).toMatchObject({ issuer_state: expect.any(String) });
    });

    test.each([
        { name: "missing issuer", payload: { credential_configuration_ids: ["test"] }, error: /credential_issuer/ },
        { name: "missing configuration identifiers", payload: { credential_issuer: `${eudiploBaseUrl}/issuers/test` }, error: /credential_configuration_ids/ },
        { name: "empty configuration list", payload: { credential_issuer: `${eudiploBaseUrl}/issuers/test`, credential_configuration_ids: [] }, error: /At least one offered/ },
        {
            name: "duplicate configuration identifiers",
            payload: { credential_issuer: `${eudiploBaseUrl}/issuers/test`, credential_configuration_ids: ["test", "test"] },
            error: /must be unique/
        },
        { name: "unknown configuration", payload: { credential_issuer: `${eudiploBaseUrl}/issuers/test`, credential_configuration_ids: ["unknown"] }, error: /Unknown offered/ }
    ])("reject an offer with $name", async ({ payload, error }) => {
        // Arrange
        const credentialOfferUrl = `openid-credential-offer://?credential_offer=${encodeURIComponent(JSON.stringify(payload))}`;

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({ credentialOfferUrl });

        // Assert
        expect(result).toBeAnError(error, /.+/);
    });

    test("reject conflicting credential offer URI parameters", async () => {
        // Arrange
        const offer = await eudiploClient.createIssuanceOffer({ credentialConfigurationIds: ["test"], flow: "pre_authorized_code" });
        const url = new URL(offer.uri);
        url.searchParams.set("credential_offer", JSON.stringify({ credential_issuer: `${eudiploBaseUrl}/issuers/test`, credential_configuration_ids: ["test"] }));

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({ credentialOfferUrl: url.toString() });

        // Assert
        expect(result).toBeAnError(/both|mutually|one of/i, /.+/);
    });

    test("report issuer discovery failure", async () => {
        // Arrange
        const payload = { credential_issuer: `${eudiploBaseUrl}/unknown-issuer`, credential_configuration_ids: ["test"] };
        const credentialOfferUrl = `openid-credential-offer://?credential_offer=${encodeURIComponent(JSON.stringify(payload))}`;

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({ credentialOfferUrl });

        // Assert
        expect(result).toBeAnError(/metadata|404|issuer/i, /.+/);
    });

    test("reject a malformed credential offer", async () => {
        // Arrange
        const credentialOfferUrl = "openid-credential-offer://?credential_offer=not-json";

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({ credentialOfferUrl });

        // Assert
        expect(result.isError).toBe(true);
    });
});

describe("verifier authentication", () => {
    test("reject a correctly signed request with an incorrect x509_hash", async () => {
        // Arrange
        const request = await eudiploClient.createPresentationRequest({ configId: "test" });
        const jwt = await fetchAuthorizationRequestJwt(request.uri);
        const clientId = `x509_hash:${createHash("sha256").update("another certificate").digest("base64url")}`;
        const requestObject = await replaceJwtClaims(jwt, { client_id: clientId }, "access-key");
        const authorizationRequestUrl = `openid4vp://?client_id=${encodeURIComponent(clientId)}&request=${requestObject}`;

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl });

        // Assert
        expect(result).toBeAnError(/hash of the leaf x5c certificate/i, /.+/);
    });
});

describe("credential issuance", () => {
    test("reject an incorrect transaction code", async () => {
        // Arrange
        const offer = await eudiploClient.createIssuanceOffer({ credentialConfigurationIds: ["test"], flow: "pre_authorized_code", txCode: "1234" });
        const resolved = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({ credentialOfferUrl: offer.uri });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({
            credentialOffer: resolved.value.credentialOffer,
            credentialConfigurationIds: ["test"],
            pinCode: "5678"
        });

        // Assert
        expect(result).toBeAnError(/invalid_grant/, /^error\.runtime\.openid4vc\.oauth\.invalid_grant$/);
    });

    test("reject a missing transaction code required by the offer", async () => {
        // Arrange
        const offer = await eudiploClient.createIssuanceOffer({ credentialConfigurationIds: ["test"], flow: "pre_authorized_code", txCode: "1234" });
        const resolved = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({ credentialOfferUrl: offer.uri });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer: resolved.value.credentialOffer, credentialConfigurationIds: ["test"] });

        // Assert
        expect(result).toBeAnError(/txCode.*not provided/, /^error\.runtime\.unknown$/);
    });

    test("propagate invalid_request when the authorization server requires a transaction code", async () => {
        // Arrange
        const offer = await eudiploClient.createIssuanceOffer({ credentialConfigurationIds: ["test"], flow: "pre_authorized_code", txCode: "1234" });
        const resolved = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({ credentialOfferUrl: offer.uri });
        const credentialOffer = resolved.value.credentialOffer;
        // Simulate an offer that does not announce the server's transaction code requirement.
        delete credentialOffer.credentialOfferPayload.grants!["urn:ietf:params:oauth:grant-type:pre-authorized_code"]!.tx_code;

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["test"] });

        // Assert
        expect(result).toBeAnError(/invalid_request/, /^error\.runtime\.openid4vc\.oauth\.invalid_request$/);
    });

    test("propagate the authorization server rejection of a reused pre-authorized code", async () => {
        // Arrange
        const credentialOffer = await prepareCredentialOffer();
        const firstIssuance = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["test"] });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["test"] });

        // Assert
        expect(firstIssuance).toBeSuccessful();
        expect(firstIssuance.value.credentialResponses).toHaveLength(1);
        expect(result).toBeAnError(/invalid_grant/, /^error\.runtime\.openid4vc\.oauth\.invalid_grant$/);
    });

    test("reject an unknown credential configuration", async () => {
        // Arrange
        const credentialOffer = await prepareCredentialOffer();

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["unknown"] });

        // Assert
        expect(result).toBeAnError(/Unknown credential configuration: unknown/, /.+/);
    });

    test("reject a configuration that was not offered", async () => {
        // Arrange
        const credentialOffer = await prepareCredentialOffer();

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["selective"] });

        // Assert
        expect(result).toBeAnError(/Unknown credential configuration: selective/, /.+/);
    });

    test("reject an empty configuration selection", async () => {
        // Arrange
        const credentialOffer = await prepareCredentialOffer();

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: [] });

        // Assert
        expect(result).toBeAnError(/At least one credential configuration/, /.+/);
    });

    test("request a credential using a supplied access token", async () => {
        // Arrange
        const credentialOffer = await prepareCredentialOffer();
        const tokenResponse = await fetch(credentialOffer.metadata.authorizationServers[0].token_endpoint, {
            method: "POST",
            body: new URLSearchParams({
                grant_type: "urn:ietf:params:oauth:grant-type:pre-authorized_code",
                "pre-authorized_code": credentialOffer.credentialOfferPayload.grants!["urn:ietf:params:oauth:grant-type:pre-authorized_code"]!["pre-authorized_code"]
            })
        });
        const token = (await tokenResponse.json()) as { access_token: string };

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["test"], accessToken: token.access_token });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.credentialResponses).toHaveLength(1);
    });

    test("request a credential using an access token obtained outside the runtime via authorization code", async () => {
        // Arrange
        const { credentialOffer, accessToken } = await prepareAuthorizationCodeAccess();

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["test"], accessToken });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.credentialResponses).toHaveLength(1);
    });

    test("reject an invalid access token", async () => {
        // Arrange
        const credentialOffer = await prepareCredentialOffer();

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["test"], accessToken: "invalid" });

        // Assert
        expect(result).toBeAnError(/token|unauthorized/i, /.+/);
    });

    test("request a credential from a JSON-serialized offer", async () => {
        // Arrange
        const credentialOffer = await prepareCredentialOffer();
        const serializedOffer = JSON.parse(JSON.stringify(credentialOffer)) as typeof credentialOffer;

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer: serializedOffer, credentialConfigurationIds: ["test"] });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.credentialResponses).toHaveLength(1);
    });

    test("reload issuer metadata instead of trusting caller-provided endpoints", async () => {
        // Arrange
        const credentialOffer = await prepareCredentialOffer();
        credentialOffer.metadata.credentialIssuer.credential_endpoint = `${eudiploBaseUrl}/untrusted-endpoint`;

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["test"] });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.credentialResponses).toHaveLength(1);
    });

    test("send a Final 1.0 credential request with proofs.jwt", async () => {
        // Arrange
        const credentialOffer = await prepareCredentialOffer();
        const fetchSpy = vi.spyOn(globalThis, "fetch");

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["test"] });

        // Assert
        expect(result).toBeSuccessful();
        const request = fetchSpy.mock.calls.find(([url]) => url.toString() === credentialOffer.metadata.credentialIssuer.credential_endpoint)!;
        const body = JSON.parse(request[1]!.body as string) as Record<string, unknown>;
        expect(body).toMatchObject({ proofs: { jwt: [expect.any(String)] } });
        expect(body).not.toHaveProperty("proof");
    });

    test.each([
        ["typ", "openid4vci-proof+jwt"],
        ["alg", "ES256"]
    ])("set the credential proof header %s to %s", async (property, expected) => {
        // Arrange
        const credentialOffer = await prepareCredentialOffer();

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["test"] });

        // Assert
        expect(result).toBeSuccessful();
        const proof = credentialProof(credentialOffer.metadata.credentialIssuer.credential_endpoint);
        expect(JSON.parse(Buffer.from(proof.split(".")[0], "base64url").toString())).toHaveProperty(property, expected);
    });

    test("address the credential proof to the credential issuer", async () => {
        // Arrange
        const credentialOffer = await prepareCredentialOffer();

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["test"] });

        // Assert
        expect(result).toBeSuccessful();
        expect(decodeJwtPayload(credentialProof(credentialOffer.metadata.credentialIssuer.credential_endpoint)).aud).toBe(credentialOffer.credentialOfferPayload.credential_issuer);
    });

    test("set the credential proof issuance time to the current time", async () => {
        // Arrange
        const credentialOffer = await prepareCredentialOffer();
        const before = Math.floor(Date.now() / 1000);

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["test"] });

        // Assert
        expect(result).toBeSuccessful();
        const issuedAt = decodeJwtPayload(credentialProof(credentialOffer.metadata.credentialIssuer.credential_endpoint)).iat;
        expect(issuedAt).toBeGreaterThanOrEqual(before);
        expect(issuedAt).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
    });

    test("use the issuer's nonce in the credential proof", async () => {
        // Arrange
        const credentialOffer = await prepareCredentialOffer();

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["test"] });

        // Assert
        expect(result).toBeSuccessful();
        const nonceResponse = (await inboundResponses.get(credentialOffer.metadata.credentialIssuer.nonce_endpoint!)!.json()) as { c_nonce: string };
        expect(nonceResponse.c_nonce).toEqual(expect.any(String));
        expect(decodeJwtPayload(credentialProof(credentialOffer.metadata.credentialIssuer.credential_endpoint)).nonce).toBe(nonceResponse.c_nonce);
    });

    test("sign the credential proof with the advertised holder key", async () => {
        // Arrange
        const credentialOffer = await prepareCredentialOffer();

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["test"] });

        // Assert
        expect(result).toBeSuccessful();
        const [header, payload, signature] = credentialProof(credentialOffer.metadata.credentialIssuer.credential_endpoint).split(".");
        const jwk = (JSON.parse(Buffer.from(header, "base64url").toString()) as { jwk: webcrypto.JsonWebKey }).jwk;
        expect(
            verify(
                "sha256",
                Buffer.from(`${header}.${payload}`),
                { key: createPublicKey({ key: jwk, format: "jwk" }), dsaEncoding: "ieee-p1363" },
                Buffer.from(signature, "base64url")
            )
        ).toBe(true);
    });

    test("request multiple offered credential configurations", async () => {
        // Arrange
        const offer = await eudiploClient.createIssuanceOffer({ credentialConfigurationIds: ["test", "selective"], flow: "pre_authorized_code" });
        const resolved = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({ credentialOfferUrl: offer.uri });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({
            credentialOffer: resolved.value.credentialOffer,
            credentialConfigurationIds: ["test", "selective"]
        });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.credentialResponses).toHaveLength(2);
        expect(decodeJwtPayload(result.value.credentialResponses[0].encoded.split("~")[0]).vct).toBe("https://example.com/credentials/test");
        expect(decodeJwtPayload(result.value.credentialResponses[1].encoded.split("~")[0]).vct).toBe("https://example.com/credentials/selective");
    });

    test("request only the selected configuration from a multi-configuration offer", async () => {
        // Arrange
        const offer = await eudiploClient.createIssuanceOffer({ credentialConfigurationIds: ["test", "selective"], flow: "pre_authorized_code" });
        const resolved = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({ credentialOfferUrl: offer.uri });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({
            credentialOffer: resolved.value.credentialOffer,
            credentialConfigurationIds: ["selective"]
        });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.credentialResponses).toHaveLength(1);
        expect(decodeJwtPayload(result.value.credentialResponses[0].encoded.split("~")[0]).vct).toBe("https://example.com/credentials/selective");
    });

    test("reject duplicate configuration selections", async () => {
        // Arrange
        const credentialOffer = await prepareCredentialOffer();

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["test", "test"] });

        // Assert
        expect(result).toBeAnError(/must be unique/, /.+/);
    });

    test.each(["invalid_proof", "invalid_nonce", "invalid_credential_request"])("propagate the issuer's %s error through the facade", async (error) => {
        // Arrange
        const credentialOffer = await prepareCredentialOffer();
        issuerResponses.set(
            credentialOffer.metadata.credentialIssuer.credential_endpoint,
            new Response(JSON.stringify({ error, error_description: "Issuer rejected the request" }), { status: 400, headers: { "content-type": "application/json" } })
        );

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["test"] });

        // Assert
        expect(result).toBeAnError(/Issuer rejected the request/, `^error\\.runtime\\.openid4vc\\.oauth\\.${error}$`);
    });

    test.each([
        { name: "deferred issuance", response: { transaction_id: "deferred", interval: 5 }, error: /deferred issuance is not supported/ },
        { name: "no credentials", response: { credentials: [] }, error: /Issuer did not return credentials/ },
        {
            name: "multiple credentials for one holder proof",
            response: { credentials: [{ credential: "first" }, { credential: "second" }] },
            error: /multiple credentials for one holder key/
        },
        { name: "an unsupported credential encoding", response: { credentials: [{ credential: { unsupported: true } }] }, error: /Unsupported credential encoding/ }
    ])("reject an issuer response containing $name through the facade", async ({ response, error }) => {
        // Arrange
        const credentialOffer = await prepareCredentialOffer();
        issuerResponses.set(
            credentialOffer.metadata.credentialIssuer.credential_endpoint,
            new Response(JSON.stringify(response), { headers: { "content-type": "application/json" } })
        );

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["test"] });

        // Assert
        expect(result).toBeAnError(error, /.+/);
    });

    test("reject an issued credential bound to another holder key", async () => {
        // Arrange
        const [otherCredential] = await issueCredential(runtimeServices1);
        const credentialOffer = await prepareCredentialOffer();
        issuerResponses.set(
            credentialOffer.metadata.credentialIssuer.credential_endpoint,
            new Response(JSON.stringify({ credentials: [{ credential: otherCredential.encoded }] }), { headers: { "content-type": "application/json" } })
        );

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["test"] });

        // Assert
        expect(result).toBeAnError(/does not match the requested holder key/, /.+/);
    });

    test.each([
        { algorithm: "ES256", binding: "jwk", keyFromProof: (header: ProofHeader) => header.jwk!, digest: "sha256" },
        { algorithm: "EdDSA", binding: "jwk", keyFromProof: (header: ProofHeader) => header.jwk!, digest: null },
        {
            algorithm: "ES256",
            binding: "did:jwk",
            keyFromProof: (header: ProofHeader) => JSON.parse(Buffer.from(header.kid!.split("#")[0].slice(8), "base64url").toString()) as webcrypto.JsonWebKey,
            digest: "sha256"
        },
        { algorithm: "ES256", binding: "did:key", keyFromProof: p256DidProofKey, digest: "sha256" },
        {
            algorithm: "EdDSA",
            binding: "did:key",
            keyFromProof: (header: ProofHeader) => ({
                kty: "OKP",
                crv: "Ed25519",
                x: Buffer.from(CoreBuffer.fromBase58(header.kid!.split("#")[0].slice(9)).buffer.slice(2)).toString("base64url")
            }),
            digest: null
        }
    ])("request a JWT VC using $algorithm and $binding through the facade from a test issuer", async ({ algorithm, binding, keyFromProof, digest }) => {
        // Arrange
        const credentialOffer = await prepareJwtVcIssuer(algorithm, binding, keyFromProof);

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["test"] });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.credentialResponses).toHaveLength(1);
        const credential = result.value.credentialResponses[0];
        expect(credential.claimFormat).toBe("jwt_vc_json");
        const proof = credentialProof(credentialOffer.metadata.credentialIssuer.credential_endpoint);
        const [header, payload, signature] = proof.split(".");
        const proofHeader = JSON.parse(Buffer.from(header, "base64url").toString()) as ProofHeader;
        expect(proofHeader.alg).toBe(algorithm);
        const holderKey = keyFromProof(proofHeader);
        expect(
            verify(
                digest,
                Buffer.from(`${header}.${payload}`),
                { key: createPublicKey({ key: holderKey, format: "jwk" }), dsaEncoding: "ieee-p1363" },
                Buffer.from(signature, "base64url")
            )
        ).toBe(true);
        expect(decodeJwtPayload(credential.encoded)).toMatchObject({ cnf: { jwk: holderKey }, vc: { type: ["VerifiableCredential", "TestCredential"] } });
    });

    test("request an mdoc credential", async () => {
        // Arrange
        const credentialOffer = await prepareCredentialOffer("mdoc");

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["mdoc"] });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.credentialResponses).toHaveLength(1);
        expect(result.value.credentialResponses[0].claimFormat).toBe("mso_mdoc");
    });
});

describe("credential storage", () => {
    let credentialResponse: OpenId4VciCredentialResponseJSON;

    beforeAll(async () => {
        credentialResponse = (await issueCredential(runtimeServices1))[0];
    });

    test("store an issued credential as an own identity attribute", async () => {
        // Arrange
        const credentialResponses = [credentialResponse];

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.content).toMatchObject({
            "@type": "IdentityAttribute",
            owner: runtimeServices1.address,
            value: { "@type": "VerifiableCredential", type: "dc+sd-jwt", value: credentialResponse.encoded }
        });
    });

    test("preserve credential display information", async () => {
        // Arrange
        const credentialResponses = [credentialResponse];

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses });

        // Assert
        expect(result).toBeSuccessful();
        expect((result.value.content.value as VerifiableCredentialJSON).displayInformation).toEqual(credentialResponse.displayInformation);
    });

    test("cache the credential logo", async () => {
        // Arrange
        const credentialResponses = [credentialResponse];

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses });

        // Assert
        expect(result).toBeSuccessful();
        expect((result.value.content.value as VerifiableCredentialJSON).displayInformationCachedImages).toEqual([
            expect.objectContaining({ locale: "en-US", logo: expect.any(String) })
        ]);
    });

    test("retrieve a stored credential", async () => {
        // Arrange
        const stored = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses: [credentialResponse] });

        // Act
        const result = await runtimeServices1.consumption.attributes.getAttribute({ id: stored.value.id });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.content.value).toMatchObject({ type: "dc+sd-jwt", value: credentialResponse.encoded, displayInformation: credentialResponse.displayInformation });
    });

    test("reject an empty credential batch", async () => {
        // Arrange
        const credentialResponses: OpenId4VciCredentialResponseJSON[] = [];

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses });

        // Assert
        expect(result).toBeAnError(/At least one credential/, /.+/);
    });

    test("reject a modified issuer signature", async () => {
        // Arrange
        const credentialResponses = [{ ...credentialResponse, encoded: tamperIssuerSignature(credentialResponse.encoded) }];

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses });

        // Assert
        expect(result).toBeAnError(/signature/i, /.+/);
    });

    test("reject a modified disclosure", async () => {
        // Arrange
        const [issuerJwt] = credentialResponse.encoded.split("~");
        const disclosure = Buffer.from(JSON.stringify(["salt", "test", "tampered"])).toString("base64url");
        const credentialResponses = [{ ...credentialResponse, encoded: `${issuerJwt}~${disclosure}~` }];

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses });

        // Assert
        expect(result).toBeAnError(/disclosure|digest/i, /.+/);
    });

    test("reject an expired credential with a valid issuer signature", async () => {
        // Arrange
        const encoded = await replaceIssuerClaims(credentialResponse.encoded, { exp: Math.floor(Date.now() / 1000) - 60 });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses: [{ ...credentialResponse, encoded }] });

        // Assert
        expect(result).toBeAnError(/expired/i, /.+/);
    });

    test("reject a credential that is not yet valid", async () => {
        // Arrange
        const encoded = await replaceIssuerClaims(credentialResponse.encoded, { nbf: Math.floor(Date.now() / 1000) + 3600 });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses: [{ ...credentialResponse, encoded }] });

        // Assert
        expect(result).toBeAnError(/not yet valid|not active/i, /.+/);
    });

    test("reject a credential belonging to another holder", async () => {
        // Arrange
        const credentialResponses = [credentialResponse];

        // Act
        const result = await runtimeServices2.consumption.openId4Vc.storeCredentials({ credentialResponses });

        // Assert
        expect(result).toBeAnError(/key/i, /.+/);
    });

    test("reject a malformed credential encoding", async () => {
        // Arrange
        const credentialResponses = [{ ...credentialResponse, encoded: "not-a-credential" }];

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses });

        // Assert
        expect(result.isError).toBe(true);
    });

    test("reject a credential without holder binding", async () => {
        // Arrange
        const encoded = await replaceIssuerClaims(credentialResponse.encoded, { cnf: {} });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses: [{ ...credentialResponse, encoded }] });

        // Assert
        expect(result).toBeAnError(/no supported holder binding/, /.+/);
    });

    test("accept a credential within the configured expiration tolerance", async () => {
        // Arrange
        const encoded = await replaceIssuerClaims(credentialResponse.encoded, { exp: Math.floor(Date.now() / 1000) - 5 });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses: [{ ...credentialResponse, encoded }] });

        // Assert
        expect(result).toBeSuccessful();
        expect((result.value.content.value as VerifiableCredentialJSON).value).toBe(encoded);
    });

    test("reject an mdoc with a modified issuer signature", async () => {
        // Arrange
        const [response] = await issueCredential(runtimeServices1, "mdoc");
        const bytes = Buffer.from(response.encoded, "base64url");
        bytes[bytes.length - 1] ^= 1;
        const credentialResponses = [{ ...response, encoded: bytes.toString("base64url") }];

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses });

        // Assert
        expect(result).toBeAnError(/signature/i, /.+/);
    });

    test("store every credential in a valid multi-credential batch", async () => {
        // Arrange
        const first = (await issueCredential(runtimeServices1, "test"))[0];
        const second = (await issueCredential(runtimeServices1, "selective"))[0];

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses: [first, second] });

        // Assert
        const attributes = await runtimeServices1.consumption.attributes.getAttributes({ query: { "content.value.@type": "VerifiableCredential" } });
        expect(result).toBeSuccessful();
        expect(attributes.value).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ content: expect.objectContaining({ value: expect.objectContaining({ value: first.encoded }) }) }),
                expect.objectContaining({ content: expect.objectContaining({ value: expect.objectContaining({ value: second.encoded }) }) })
            ])
        );
    });

    test("create no attributes when a credential batch contains an invalid credential", async () => {
        // Arrange
        const [valid] = await issueCredential(runtimeServices1);
        const invalid = { ...valid, encoded: tamperIssuerSignature(valid.encoded) };
        const original = await runtimeServices1.consumption.attributes.getAttributes({ query: { "content.value.@type": "VerifiableCredential" } });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses: [valid, invalid] });

        // Assert
        expect(result).toBeAnError(/signature/i, /.+/);
        const stored = await runtimeServices1.consumption.attributes.getAttributes({ query: { "content.value.@type": "VerifiableCredential" } });
        expect(stored.value.map((attribute) => attribute.id)).toEqual(original.value.map((attribute) => attribute.id));
    });

    test("store a JWT VC through the runtime schema and attribute mapper", async () => {
        // Arrange
        const credentialResponse = await prepareJwtVcCredential();

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses: [credentialResponse] });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.content).toMatchObject({
            owner: runtimeServices1.address,
            value: { "@type": "VerifiableCredential", type: "jwt_vc_json", value: credentialResponse.encoded }
        });
    });

    test("retrieve a JWT VC through the runtime facade", async () => {
        // Arrange
        const response = await prepareJwtVcCredential();
        const stored = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses: [response] });

        // Act
        const result = await runtimeServices1.consumption.attributes.getAttribute({ id: stored.value.id });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.content.value).toMatchObject({ type: "jwt_vc_json", value: response.encoded });
    });

    test("store an mdoc credential", async () => {
        // Arrange
        const credentialResponses = await issueCredential(runtimeServices1, "mdoc");

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.content.value).toMatchObject({ type: "mso_mdoc", value: credentialResponses[0].encoded });
    });
});

describe("presentation", () => {
    let storedCredential: LocalAttributeDTO;
    let selectiveCredential: LocalAttributeDTO;
    let mdocCredential: LocalAttributeDTO;
    let peerCredential: LocalAttributeDTO;

    beforeAll(async () => {
        storedCredential = await createAndStoreCredential(runtimeServices1);
        selectiveCredential = await createAndStoreCredential(runtimeServices1, "selective");
        mdocCredential = await createAndStoreCredential(runtimeServices1, "mdoc");
        peerCredential = await createAndStoreCredential(runtimeServices2);
    });

    test("resolve a signed authorization request", async () => {
        // Arrange
        const request = await eudiploClient.createPresentationRequest({ configId: "test" });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: request.uri });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.authorizationRequest.authorizationRequestPayload).toMatchObject({
            response_type: "vp_token",
            response_mode: "direct_post.jwt",
            nonce: expect.any(String),
            dcql_query: { credentials: [{ id: "test", format: "dc+sd-jwt", meta: { vct_values: ["https://example.com/credentials/test"] } }] }
        });
    });

    test("find credentials matching the requested credential type", async () => {
        // Arrange
        const request = await eudiploClient.createPresentationRequest({ configId: "test" });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: request.uri });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.matchingCredentials).toContainEqual(expect.objectContaining({ id: storedCredential.id }));
        expect(result.value.matchingCredentials).not.toContainEqual(expect.objectContaining({ id: selectiveCredential.id }));
        expect(result.value.matchingCredentials).not.toContainEqual(expect.objectContaining({ id: mdocCredential.id }));
    });

    test("find an mdoc credential matching the requested document type", async () => {
        // Arrange
        const request = await eudiploClient.createPresentationRequest({ configId: "mdoc" });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: request.uri });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.matchingCredentials).toContainEqual(expect.objectContaining({ id: mdocCredential.id }));
        expect(result.value.matchingCredentials).not.toContainEqual(expect.objectContaining({ id: storedCredential.id }));
    });

    test("return no matches when the wallet has no credentials", async () => {
        // Arrange
        const request = await eudiploClient.createPresentationRequest({ configId: "test" });

        // Act
        const result = await emptyRuntimeServices.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: request.uri });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.matchingCredentials).toEqual([]);
    });

    test("return no matches for an unavailable credential type", async () => {
        // Arrange
        const request = await eudiploClient.createPresentationRequest({ configId: "unavailable" });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: request.uri });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.matchingCredentials).toEqual([]);
    });

    test("resolve a signed authorization request passed by value", async () => {
        // Arrange
        const request = await eudiploClient.createPresentationRequest({ configId: "test" });
        const jwt = await fetchAuthorizationRequestJwt(request.uri);
        const authorizationRequestUrl = `openid4vp://?client_id=${encodeURIComponent(decodeJwtPayload(jwt).client_id as string)}&request=${jwt}`;

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.authorizationRequest.authorizationRequestPayload.nonce).toBe(decodeJwtPayload(jwt).nonce);
    });

    test("return no matches when the requested issuer authority cannot be established", async () => {
        // Arrange
        const request = await eudiploClient.createPresentationRequest({ configId: "test" });
        const jwt = await fetchAuthorizationRequestJwt(request.uri);
        const payload = decodeJwtPayload(jwt);
        const dcql = {
            credentials: [
                {
                    id: "test",
                    format: "dc+sd-jwt",
                    meta: { vct_values: ["https://example.com/credentials/test"] },
                    trusted_authorities: [{ type: "aki", values: [Buffer.from("unknown-authority").toString("base64url")] }]
                }
            ]
        };
        const signedRequest = await replaceJwtClaims(jwt, { dcql_query: dcql }, "access-key");
        const authorizationRequestUrl = `openid4vp://?client_id=${encodeURIComponent(payload.client_id as string)}&request=${signedRequest}`;

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.matchingCredentials).toEqual([]);
    });

    test.each([
        {
            name: "multiple credential queries",
            changes: {
                dcql_query: {
                    credentials: [
                        { id: "first", format: "dc+sd-jwt", meta: { vct_values: ["https://example.com/credentials/test"] } },
                        { id: "second", format: "dc+sd-jwt", meta: { vct_values: ["https://example.com/credentials/test"] } }
                    ]
                }
            },
            error: /Exactly one credential query/
        },
        {
            name: "multiple credential instances",
            changes: { dcql_query: { credentials: [{ id: "test", format: "dc+sd-jwt", meta: { vct_values: ["https://example.com/credentials/test"] }, multiple: true }] } },
            error: /Exactly one credential query/
        },
        { name: "a missing response mode", changes: { response_mode: undefined }, error: /response.mode|responseMode|response mode/ },
        {
            name: "transaction data",
            changes: { transaction_data: [Buffer.from(JSON.stringify({ type: "test", credential_ids: ["test"] })).toString("base64url")] },
            error: /Transaction data is not supported/
        },
        {
            name: "Presentation Exchange",
            changes: { response_mode: "direct_post", client_metadata: undefined, dcql_query: undefined, presentation_definition: { id: "unsupported", input_descriptors: [] } },
            error: /Presentation Exchange|DCQL|dcql/
        }
    ])("reject a signed incoming request containing $name during resolution", async ({ changes, error }) => {
        // Arrange
        const authorizationRequestUrl = await signedAuthorizationRequest(changes);

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl });

        // Assert
        expect(result).toBeAnError(error, /.+/);
    });

    test("reject a modified authorization request signature", async () => {
        // Arrange
        const request = await eudiploClient.createPresentationRequest({ configId: "test" });
        const jwt = await fetchAuthorizationRequestJwt(request.uri);
        const payload = decodeJwtPayload(jwt);
        const authorizationRequestUrl = `openid4vp://?client_id=${encodeURIComponent(payload.client_id as string)}&request=${tamperSignature(jwt)}`;

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl });

        // Assert
        expect(result).toBeAnError(/signature/i, /.+/);
    });

    test("reject an expired authorization request", async () => {
        // Arrange
        const request = await eudiploClient.createPresentationRequest({ configId: "test" });
        const jwt = await fetchAuthorizationRequestJwt(request.uri);
        const expiredJwt = await replaceJwtClaims(jwt, { exp: Math.floor(Date.now() / 1000) - 60 }, "access-key");
        const authorizationRequestUrl = `openid4vp://?client_id=${encodeURIComponent(decodeJwtPayload(jwt).client_id as string)}&request=${expiredJwt}`;

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl });

        // Assert
        const [header, payload, signature] = expiredJwt.split(".");
        const certificateChain = (JSON.parse(Buffer.from(header, "base64url").toString()) as { x5c: string[] }).x5c;
        const publicKey = new X509Certificate(Buffer.from(certificateChain[0], "base64")).publicKey;
        expect(verify("sha256", Buffer.from(`${header}.${payload}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(signature, "base64url"))).toBe(true);
        expect(result).toBeAnError(/invalid_request_object/, /.+/);
    });

    test("present an SD-JWT with holder binding and an encrypted response", async () => {
        // Arrange
        const request = await eudiploClient.createPresentationRequest({ configId: "test" });
        const resolved = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: request.uri });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({
            authorizationRequest: resolved.value.authorizationRequest,
            attributeId: storedCredential.id
        });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.status).toBe(200);
        const session = await eudiploClient.getSession(request.sessionId);
        expect(session.status).toBe("completed");
        expect(session.credentials).toEqual([{ id: "test", values: [expect.objectContaining({ vct: "https://example.com/credentials/test" })] }]);
    });

    test("omit selectively disclosable claims when the query requests no claims", async () => {
        // Arrange
        const request = await eudiploClient.createPresentationRequest({ configId: "test" });
        const resolved = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: request.uri });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({
            authorizationRequest: resolved.value.authorizationRequest,
            attributeId: storedCredential.id
        });

        // Assert
        expect(result).toBeSuccessful();
        const session = await eudiploClient.getSession(request.sessionId);
        expect(session.status).toBe("completed");
        expect(session.credentials).toEqual([{ id: "test", values: [expect.objectContaining({ vct: "https://example.com/credentials/test" })] }]);
        expect(session.credentials![0].values).toEqual([expect.not.objectContaining({ test: expect.anything() })]);
    });

    test("disclose only the requested SD-JWT claim", async () => {
        // Arrange
        const request = await eudiploClient.createPresentationRequest({ configId: "selective" });
        const resolved = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: request.uri });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({
            authorizationRequest: resolved.value.authorizationRequest,
            attributeId: selectiveCredential.id
        });

        // Assert
        expect(result).toBeSuccessful();
        const session = await eudiploClient.getSession(request.sessionId);
        expect(session.status).toBe("completed");
        expect(session.credentials).toEqual([{ id: "name", values: [expect.objectContaining({ given_name: "Alice" })] }]);
        expect(session.credentials![0].values).toEqual([expect.not.objectContaining({ family_name: expect.anything() })]);
    });

    test("present a satisfiable alternative from DCQL claim_sets and credential_sets", async () => {
        // Arrange
        const request = await eudiploClient.createPresentationRequest({ configId: "claim-sets" });
        const resolved = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: request.uri });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({
            authorizationRequest: resolved.value.authorizationRequest,
            attributeId: selectiveCredential.id
        });

        // Assert
        expect(result).toBeSuccessful();
        const session = await eudiploClient.getSession(request.sessionId);
        expect(session.status).toBe("completed");
        expect(session.credentials).toEqual([{ id: "name", values: [expect.objectContaining({ family_name: "Example" })] }]);
        expect(session.credentials![0].values).toEqual([expect.not.objectContaining({ given_name: expect.anything() })]);
    });

    test("satisfy an array index query when the issuer discloses the array as a whole", async () => {
        // Arrange
        const attribute = await createAndStoreCredential(runtimeServices1, "array");
        const request = await eudiploClient.createPresentationRequest({ configId: "array" });
        const resolved = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: request.uri });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({
            authorizationRequest: resolved.value.authorizationRequest,
            attributeId: attribute.id
        });

        // Assert
        expect(result).toBeSuccessful();
        const session = await eudiploClient.getSession(request.sessionId);
        expect(session.status).toBe("completed");
        expect(session.credentials).toEqual([{ id: "names", values: [expect.objectContaining({ names: [{ given_name: "Alice" }, { given_name: "Bob" }] })] }]);
    });

    test("disclose only the selected independently disclosable array element", async () => {
        // Arrange
        const credential = await prepareArrayCredential();
        const stored = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses: [credential] });
        const authorizationRequestUrl = await signedAuthorizationRequest({
            response_mode: "direct_post",
            dcql_query: {
                credentials: [{ id: "names", format: "dc+sd-jwt", meta: { vct_values: ["https://example.com/credentials/test"] }, claims: [{ path: ["names", 0, "given_name"] }] }]
            }
        });
        const resolved = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl });
        const responseUri = resolved.value.authorizationRequest.authorizationRequestPayload.response_uri!;
        issuerResponses.set(responseUri, new Response("accepted"));

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({
            authorizationRequest: resolved.value.authorizationRequest,
            attributeId: stored.value.id
        });

        // Assert
        expect(result).toBeSuccessful();
        const body = new URLSearchParams(outboundRequests.get(responseUri)!.body as string);
        const presentation = (JSON.parse(body.get("vp_token")!) as { names: string[] }).names[0];
        const disclosures = presentation
            .split("~")
            .slice(1, -1)
            .map((disclosure) => JSON.parse(Buffer.from(disclosure, "base64url").toString()) as unknown);
        expect(disclosures).toEqual([[expect.any(String), { given_name: "Alice" }]]);
    });

    test("reject conflicting outer and signed client identifiers", async () => {
        // Arrange
        const request = await eudiploClient.createPresentationRequest({ configId: "test" });
        const url = new URL(request.uri);
        url.searchParams.set("client_id", "x509_hash:wrong-client");

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: url.toString() });

        // Assert
        expect(result).toBeAnError(/client.?id|client identifier/i, /.+/);
    });

    test("present a JWT VC through the runtime facade to a test verifier", async () => {
        // Arrange
        const credential = await prepareJwtVcCredential();
        const stored = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses: [credential] });
        const request = await prepareAuthorizationRequest();
        request.authorizationRequestPayload.response_mode = "direct_post";
        request.authorizationRequestPayload.client_metadata = { vp_formats_supported: { jwt_vc_json: { alg_values: ["ES256"] } } };
        request.authorizationRequestPayload.dcql_query = {
            credentials: [
                { id: "vc", format: "jwt_vc_json", meta: { type_values: [["VerifiableCredential", "TestCredential"]] }, claims: [{ path: ["credentialSubject", "name"] }] }
            ]
        };
        const responseUri = request.authorizationRequestPayload.response_uri!;
        // EUDIPLO cannot verify jwt_vc_json. Verify the submitted JWT independently below.
        issuerResponses.set(responseUri, new Response(JSON.stringify({ accepted: true })));
        const publicKey = createPublicKey({ key: (decodeJwtPayload(credential.encoded).cnf as { jwk: webcrypto.JsonWebKey }).jwk, format: "jwk" });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest: request, attributeId: stored.value.id });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.status).toBe(200);
        const body = new URLSearchParams(outboundRequests.get(responseUri)!.body as string);
        const presentation = (JSON.parse(body.get("vp_token")!) as { vc: string[] }).vc[0];
        const [header, payload, signature] = presentation.split(".");
        expect(verify("sha256", Buffer.from(`${header}.${payload}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(signature, "base64url"))).toBe(true);
        expect(decodeJwtPayload(presentation)).toMatchObject({
            aud: request.authorizationRequestPayload.client_id,
            nonce: request.authorizationRequestPayload.nonce,
            vp: { verifiableCredential: [credential.encoded] }
        });
    });

    test("present an mdoc with device authentication", async () => {
        // Arrange
        const request = await eudiploClient.createPresentationRequest({ configId: "mdoc" });
        const resolved = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: request.uri });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({
            authorizationRequest: resolved.value.authorizationRequest,
            attributeId: mdocCredential.id
        });

        // Assert
        expect(result).toBeSuccessful();
        const session = await eudiploClient.getSession(request.sessionId);
        expect(session.status).toBe("completed");
        expect(session.credentials).toEqual([{ id: "licence", values: [{ given_name: "Alice" }] }]);
    });

    test("present a credential using a JSON-serialized authorization request", async () => {
        // Arrange
        const request = await eudiploClient.createPresentationRequest({ configId: "test" });
        const resolved = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: request.uri });
        const authorizationRequest = JSON.parse(JSON.stringify(resolved.value.authorizationRequest)) as typeof resolved.value.authorizationRequest;

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeSuccessful();
        expect((await eudiploClient.getSession(request.sessionId)).status).toBe("completed");
    });

    test("reject a credential that does not match the query", async () => {
        // Arrange
        const authorizationRequest = await prepareAuthorizationRequest("test");

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: selectiveCredential.id });

        // Assert
        expect(result).toBeAnError(/does not match the query/, /.+/);
    });

    test("reject an unknown credential attribute", async () => {
        // Arrange
        const authorizationRequest = await prepareAuthorizationRequest("test");

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: "ATTXXXXXXXXXXXXXXXXX" });

        // Assert
        expect(result).toBeAnError(/not found/i, /recordNotFound/);
    });

    test("reject a credential attribute belonging to another identity", async () => {
        // Arrange
        const authorizationRequest = await prepareAuthorizationRequest("test");

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: peerCredential.id });

        // Assert
        expect(result).toBeAnError(/not found/i, /recordNotFound/);
    });

    test("reject multiple credential queries as a current runtime limitation", async () => {
        // Arrange
        const authorizationRequest = await prepareAuthorizationRequest("test");
        authorizationRequest.authorizationRequestPayload.dcql_query!.credentials.push({
            id: "second",
            format: "dc+sd-jwt",
            meta: { vct_values: ["https://example.com/credentials/test"] }
        });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeAnError(/Exactly one credential query/, /.+/);
    });

    test("reject multiple credential instances as a current runtime limitation", async () => {
        // Arrange
        const authorizationRequest = await prepareAuthorizationRequest("test");
        authorizationRequest.authorizationRequestPayload.dcql_query!.credentials[0].multiple = true;

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeAnError(/Exactly one credential query/, /.+/);
    });

    test("reject a credential that does not match the requested claim value", async () => {
        // Arrange
        const authorizationRequest = await prepareAuthorizationRequest("selective");
        authorizationRequest.authorizationRequestPayload.dcql_query!.credentials = [
            { id: "name", format: "dc+sd-jwt", meta: { vct_values: ["https://example.com/credentials/selective"] }, claims: [{ path: ["given_name"], values: ["Bob"] }] }
        ];

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: selectiveCredential.id });

        // Assert
        expect(result).toBeAnError(/does not match the query/, /.+/);
    });

    test("reject a query for a claim absent from the credential", async () => {
        // Arrange
        const authorizationRequest = await prepareAuthorizationRequest("test");
        authorizationRequest.authorizationRequestPayload.dcql_query!.credentials = [
            { id: "test", format: "dc+sd-jwt", meta: { vct_values: ["https://example.com/credentials/test"] }, claims: [{ path: ["missing"] }] }
        ];

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeAnError(/does not match the query/, /.+/);
    });

    test("reject unsupported presentation credential formats", async () => {
        // Arrange
        const authorizationRequest = await prepareAuthorizationRequest("test");
        authorizationRequest.authorizationRequestPayload.dcql_query!.credentials = [{ id: "test", format: "ldp_vc", meta: { type_values: [["VerifiableCredential"]] } }];

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeAnError(/Unsupported presentation credential format/, /.+/);
    });

    test("reject a request without a supported response mode", async () => {
        // Arrange
        const authorizationRequest = await prepareAuthorizationRequest("test");
        delete authorizationRequest.authorizationRequestPayload.response_mode;

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeAnError(/Unsupported presentation response mode/, /.+/);
    });

    test("reject Presentation Exchange requests", async () => {
        // Arrange
        const authorizationRequest = await prepareAuthorizationRequest("test");
        authorizationRequest.authorizationRequestPayload.presentation_definition = { id: "unsupported", input_descriptors: [] };

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeAnError(/Presentation Exchange is not supported/, /.+/);
    });

    test("reject unsupported transaction data", async () => {
        // Arrange
        const authorizationRequest = await prepareAuthorizationRequest("test");
        authorizationRequest.authorizationRequestPayload.transaction_data = [Buffer.from(JSON.stringify({ type: "test" })).toString("base64url")];

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeAnError(/Transaction data is not supported/, /.+/);
    });

    test.each([
        { configId: "test", format: "dc+sd-jwt", parameter: "sd-jwt_alg_values", algorithms: ["Ed25519"] },
        { configId: "test", format: "dc+sd-jwt", parameter: "kb-jwt_alg_values", algorithms: ["Ed25519"] },
        { configId: "mdoc", format: "mso_mdoc", parameter: "issuerauth_alg_values", algorithms: [-19] },
        { configId: "mdoc", format: "mso_mdoc", parameter: "deviceauth_alg_values", algorithms: [-19] }
    ])("reject a $format presentation excluded by the verifier's $parameter", async ({ configId, format, parameter, algorithms }) => {
        // Arrange
        const attribute = await createAndStoreCredential(runtimeServices1, configId);
        const authorizationRequestUrl = await signedAuthorizationRequest(
            {
                response_mode: "direct_post",
                client_metadata: { vp_formats_supported: { [format]: { [parameter]: algorithms } } }
            },
            configId
        );
        const resolved = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl });
        const responseUri = resolved.value.authorizationRequest.authorizationRequestPayload.response_uri!;
        outboundRequests.delete(responseUri);

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({
            authorizationRequest: resolved.value.authorizationRequest,
            attributeId: attribute.id
        });

        // Assert
        expect(result).toBeAnError(new RegExp(`Verifier.*${parameter}`), /^error\.runtime\.unknown$/);
        expect(outboundRequests.has(responseUri)).toBe(false);
    });

    test.each([
        { configId: "test", format: "dc+sd-jwt", parameter: "sd-jwt_alg_values", algorithms: ["Ed25519"] },
        { configId: "test", format: "dc+sd-jwt", parameter: "kb-jwt_alg_values", algorithms: ["Ed25519"] },
        { configId: "mdoc", format: "mso_mdoc", parameter: "issuerauth_alg_values", algorithms: [-19] },
        { configId: "mdoc", format: "mso_mdoc", parameter: "deviceauth_alg_values", algorithms: [-19] }
    ])("exclude credentials incompatible with $format $parameter from matching", async ({ configId, format, parameter, algorithms }) => {
        // Arrange
        const attribute = await createAndStoreCredential(runtimeServices1, configId);
        const authorizationRequestUrl = await signedAuthorizationRequest(
            {
                response_mode: "direct_post",
                client_metadata: { vp_formats_supported: { [format]: { [parameter]: algorithms } } }
            },
            configId
        );

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.matchingCredentials.map((credential) => credential.id)).not.toContain(attribute.id);
    });

    test("reject a JWT VC excluded by the verifier's alg_values", async () => {
        // Arrange
        const credential = await prepareJwtVcCredential();
        const stored = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses: [credential] });
        const authorizationRequestUrl = await signedAuthorizationRequest({
            response_mode: "direct_post",
            client_metadata: { vp_formats_supported: { jwt_vc_json: { alg_values: ["EdDSA"] } } },
            dcql_query: { credentials: [{ id: "vc", format: "jwt_vc_json", meta: { type_values: [["VerifiableCredential", "TestCredential"]] } }] }
        });
        const resolved = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl });
        const responseUri = resolved.value.authorizationRequest.authorizationRequestPayload.response_uri!;
        outboundRequests.delete(responseUri);

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({
            authorizationRequest: resolved.value.authorizationRequest,
            attributeId: stored.value.id
        });

        // Assert
        expect(result).toBeAnError(/Verifier.*alg_values/, /^error\.runtime\.unknown$/);
        expect(outboundRequests.has(responseUri)).toBe(false);
    });

    test("present an SD-JWT when both verifier signature constraints permit ES256", async () => {
        // Arrange
        const { authorizationRequest, sessionId } = await prepareAuthorizationRequestWithFormats({
            "dc+sd-jwt": { "sd-jwt_alg_values": ["ES256"], "kb-jwt_alg_values": ["ES256"] }
        });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.status).toBe(200);
        expect((await eudiploClient.getSession(sessionId)).status).toBe("completed");
    });

    test("reject a presentation whose format is absent from vp_formats_supported", async () => {
        // Arrange
        const authorizationRequestUrl = await signedAuthorizationRequest({
            response_mode: "direct_post",
            client_metadata: { vp_formats_supported: { jwt_vc_json: { alg_values: ["ES256"] } } }
        });
        const resolved = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl });
        const responseUri = resolved.value.authorizationRequest.authorizationRequestPayload.response_uri!;
        outboundRequests.delete(responseUri);

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({
            authorizationRequest: resolved.value.authorizationRequest,
            attributeId: storedCredential.id
        });

        // Assert
        expect(result).toBeAnError(/Verifier does not support credential format 'dc\+sd-jwt'/, /^error\.runtime\.unknown$/);
        expect(outboundRequests.has(responseUri)).toBe(false);
    });

    test.each([-7, -9])("present an mdoc when both signature constraints permit COSE algorithm %s", async (algorithm) => {
        // Arrange
        const { authorizationRequest, sessionId } = await prepareAuthorizationRequestWithFormats(
            { mso_mdoc: { issuerauth_alg_values: [algorithm], deviceauth_alg_values: [algorithm] } },
            "mdoc"
        );

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: mdocCredential.id });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.status).toBe(200);
        expect((await eudiploClient.getSession(sessionId)).status).toBe("completed");
    });

    test.each(["ECDH-ES", "ECDH-ES+A256KW", "RSA-OAEP-256"])("encrypt a Final response using %s through the facade", async (algorithm) => {
        // Arrange
        const { authorizationRequest, privateKey, responseUri } = await prepareEncryptedPresentation(algorithm);

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeSuccessful();
        const encrypted = new URLSearchParams(outboundRequests.get(responseUri)!.body as string).get("response")!;
        const decrypted = await compactDecrypt(encrypted, privateKey);
        expect(decrypted.protectedHeader).toMatchObject({ alg: algorithm, enc: "A256GCM", kid: "encryption-key" });
        expect(JSON.parse(new TextDecoder().decode(decrypted.plaintext))).toMatchObject({ vp_token: { test: [expect.any(String)] } });
    });

    test("preserve state in an encrypted authorization response", async () => {
        // Arrange
        const { authorizationRequest, privateKey, responseUri } = await prepareEncryptedPresentation();
        authorizationRequest.authorizationRequestPayload.state = "verifier-state";

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeSuccessful();
        const encrypted = new URLSearchParams(outboundRequests.get(responseUri)!.body as string).get("response")!;
        const decrypted = await compactDecrypt(encrypted, privateKey);
        expect(JSON.parse(new TextDecoder().decode(decrypted.plaintext))).toHaveProperty("state", "verifier-state");
    });

    test("preserve state in a direct_post authorization response", async () => {
        // Arrange
        const authorizationRequestUrl = await signedAuthorizationRequest({ response_mode: "direct_post", state: "verifier-state" });
        const resolved = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl });
        const authorizationRequest = resolved.value.authorizationRequest;
        const responseUri = authorizationRequest.authorizationRequestPayload.response_uri!;
        issuerResponses.set(responseUri, new Response("accepted"));

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeSuccessful();
        expect(new URLSearchParams(outboundRequests.get(responseUri)!.body as string).get("state")).toBe("verifier-state");
    });

    test("default to A128GCM when the verifier supplies no enc preference", async () => {
        // Arrange
        const { authorizationRequest, privateKey, responseUri } = await prepareEncryptedPresentation();
        delete authorizationRequest.authorizationRequestPayload.client_metadata!.encrypted_response_enc_values_supported;

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeSuccessful();
        const encrypted = new URLSearchParams(outboundRequests.get(responseUri)!.body as string).get("response")!;
        expect((await compactDecrypt(encrypted, privateKey)).protectedHeader.enc).toBe("A128GCM");
    });

    test("resolve the encryption key from jwks_uri through the facade", async () => {
        // Arrange
        const { authorizationRequest, privateKey, responseUri } = await prepareEncryptedPresentation();
        const jwksUri = `${eudiploBaseUrl}/test-verifier-jwks`;
        issuerResponses.set(
            jwksUri,
            new Response(JSON.stringify(authorizationRequest.authorizationRequestPayload.client_metadata!.jwks), { headers: { "content-type": "application/jwk-set+json" } })
        );
        delete authorizationRequest.authorizationRequestPayload.client_metadata!.jwks;
        authorizationRequest.authorizationRequestPayload.client_metadata!.jwks_uri = jwksUri;

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeSuccessful();
        const encrypted = new URLSearchParams(outboundRequests.get(responseUri)!.body as string).get("response")!;
        expect((await compactDecrypt(encrypted, privateKey)).protectedHeader.kid).toBe("encryption-key");
        expect(outboundRequests.has(jwksUri)).toBe(true);
    });

    test("select an encryption key when the verifier also offers a signing key", async () => {
        // Arrange
        const { authorizationRequest, privateKey, responseUri } = await prepareEncryptedPresentation();
        const jwks = authorizationRequest.authorizationRequestPayload.client_metadata!.jwks!;
        jwks.keys.unshift({ ...jwks.keys[0], use: "sig", kid: "signing-key" });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeSuccessful();
        const encrypted = new URLSearchParams(outboundRequests.get(responseUri)!.body as string).get("response")!;
        expect((await compactDecrypt(encrypted, privateKey)).protectedHeader.kid).toBe("encryption-key");
    });

    test.each([
        { name: "no keys", keys: [] },
        { name: "a signing-only key", keys: [{ use: "sig" }] },
        { name: "a verification-only key", keys: [{ key_ops: ["verify"] }] }
    ])("reject response encryption with $name through the facade", async ({ keys }) => {
        // Arrange
        const { authorizationRequest, responseUri } = await prepareEncryptedPresentation();
        const key = authorizationRequest.authorizationRequestPayload.client_metadata!.jwks!.keys[0];
        authorizationRequest.authorizationRequestPayload.client_metadata!.jwks!.keys = keys.map((properties) => ({ ...key, ...properties }));
        outboundRequests.delete(responseUri);

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeAnError(/encryption.*key|encryption JWK/i, /.+/);
        expect(outboundRequests.has(responseUri)).toBe(false);
    });

    test("ignore legacy signing metadata in a Final encrypted response through the facade", async () => {
        // Arrange
        const { authorizationRequest, privateKey, responseUri } = await prepareEncryptedPresentation();
        authorizationRequest.authorizationRequestPayload.client_metadata!.authorization_signed_response_alg = "RS256";

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeSuccessful();
        const encrypted = new URLSearchParams(outboundRequests.get(responseUri)!.body as string).get("response")!;
        const decrypted = await compactDecrypt(encrypted, privateKey);
        expect(JSON.parse(new TextDecoder().decode(decrypted.plaintext))).toHaveProperty("vp_token.test", [expect.any(String)]);
    });

    test("sign a legacy draft JARM response through the facade", async () => {
        // Arrange
        const { authorizationRequest, privateKey, responseUri } = await prepareEncryptedPresentation("ECDH-ES", {
            vp_formats: { "dc+sd-jwt": { alg_values_supported: ["ES256"] } },
            authorization_signed_response_alg: "ES256"
        });
        const holderKey = createPublicKey({
            key: (decodeJwtPayload((storedCredential.content.value as VerifiableCredentialJSON).value as string).cnf as { jwk: webcrypto.JsonWebKey }).jwk,
            format: "jwk"
        });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeSuccessful();
        const encrypted = new URLSearchParams(outboundRequests.get(responseUri)!.body as string).get("response")!;
        const decrypted = await compactDecrypt(encrypted, privateKey);
        const [header, payload, signature] = new TextDecoder().decode(decrypted.plaintext).split(".");
        expect(verify("sha256", Buffer.from(`${header}.${payload}`), { key: holderKey, dsaEncoding: "ieee-p1363" }, Buffer.from(signature, "base64url"))).toBe(true);
        expect(JSON.parse(Buffer.from(payload, "base64url").toString())).toHaveProperty("vp_token.test", [expect.any(String)]);
    });

    test.each([
        { name: "JSON object", body: JSON.stringify({ accepted: true }), message: JSON.stringify({ accepted: true }) },
        { name: "JSON string", body: JSON.stringify("accepted"), message: JSON.stringify("accepted") },
        { name: "plain text", body: "accepted", message: JSON.stringify("accepted") },
        { name: "empty response", body: null, message: "{}" }
    ])("map a verifier $name response to message", async ({ body, message }) => {
        // Arrange
        const authorizationRequest = await prepareAuthorizationRequest();
        issuerResponses.set(authorizationRequest.authorizationRequestPayload.response_uri!, new Response(body));

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value).toEqual({ status: 200, message });
    });

    test("return the verifier rejection of a presentation with an unknown nonce", async () => {
        // Arrange
        const authorizationRequest = await prepareAuthorizationRequest("test");
        authorizationRequest.authorizationRequestPayload.nonce = "wrong-nonce";

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.status).toBe(400);
    });

    test("return the verifier rejection of replaying a completed presentation", async () => {
        // Arrange
        const authorizationRequest = await prepareAuthorizationRequest("test");
        const firstPresentation = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });
        const firstStatus = firstPresentation.value.status;

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.status).toBe(400);
        expect(firstStatus).toBe(200);
        expect(result.value.message).toMatch(/already been used/);
    });

    describe("presentation tokens", () => {
        test("create a token with a valid holder signature and credential hash", async () => {
            // Arrange
            const expiresAt = CoreDate.utc().add({ minutes: 1 }).toString();
            const credential = storedCredential.content.value as VerifiableCredentialJSON;
            const holderJwk = (decodeJwtPayload((credential.value as string).split("~")[0]).cnf as { jwk: webcrypto.JsonWebKey }).jwk;
            const holderPublicKey = createPublicKey({ key: holderJwk, format: "jwk" });

            // Act
            const result = await runtimeServices1.consumption.openId4Vc.createPresentationToken({ attributeId: storedCredential.id, expiresAt, ephemeral: true });

            // Assert
            expect(result).toBeSuccessful();
            const content = result.value.content as TokenContentVerifiablePresentationJSON;
            const [issuerJwt, disclosure, keyBindingJwt] = (content.value as string).split("~");
            const [header, payload, signature] = keyBindingJwt.split(".");
            expect(JSON.parse(Buffer.from(header, "base64url").toString())).toMatchObject({ alg: "ES256", typ: "kb+jwt" });
            expect(verify("sha256", Buffer.from(`${header}.${payload}`), { key: holderPublicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(signature, "base64url"))).toBe(true);
            expect(decodeJwtPayload(keyBindingJwt)).toMatchObject({
                aud: "defaultPresentationAudience",
                nonce: result.value.id,
                sd_hash: createHash("sha256").update(`${issuerJwt}~${disclosure}~`).digest("base64url")
            });
        });

        test("preserve display information on a presentation token", async () => {
            // Arrange
            const expiresAt = CoreDate.utc().add({ minutes: 1 }).toString();

            // Act
            const result = await runtimeServices1.consumption.openId4Vc.createPresentationToken({ attributeId: storedCredential.id, expiresAt, ephemeral: true });

            // Assert
            expect(result).toBeSuccessful();
            expect((result.value.content as TokenContentVerifiablePresentationJSON).displayInformation).toEqual(
                (storedCredential.content.value as VerifiableCredentialJSON).displayInformation
            );
        });

        test("reject token creation for a missing credential", async () => {
            // Arrange
            const expiresAt = CoreDate.utc().add({ minutes: 1 }).toString();

            // Act
            const result = await runtimeServices1.consumption.openId4Vc.createPresentationToken({ attributeId: "ATTXXXXXXXXXXXXXXXXX", expiresAt, ephemeral: true });

            // Assert
            expect(result).toBeAnError(/not found/i, /recordNotFound/);
        });

        test("reject token creation for an mdoc credential", async () => {
            // Arrange
            const expiresAt = CoreDate.utc().add({ minutes: 1 }).toString();

            // Act
            const result = await runtimeServices1.consumption.openId4Vc.createPresentationToken({ attributeId: mdocCredential.id, expiresAt, ephemeral: true });

            // Assert
            expect(result).toBeAnError(/Only SD-JWT credentials/, /.+/);
        });

        test("verify a presentation token", async () => {
            // Arrange
            const token = await createPresentationToken(storedCredential);

            // Act
            const result = await runtimeServices1.consumption.openId4Vc.verifyPresentationToken({ token });

            // Assert
            expect(result).toBeSuccessful();
            expect(result.value).toMatchObject({ isValid: true, error: undefined });
        });

        test("verify a presentation token on another identity", async () => {
            // Arrange
            const token = await createPresentationToken(storedCredential);

            // Act
            const result = await runtimeServices2.consumption.openId4Vc.verifyPresentationToken({ token });

            // Assert
            expect(result).toBeSuccessful();
            expect(result.value.isValid).toBe(true);
        });

        test("reject a token bound to another nonce", async () => {
            // Arrange
            const token = { ...(await createPresentationToken(storedCredential)), id: "TOKXXXXXXXXXXXXXXXXX" };

            // Act
            const result = await runtimeServices1.consumption.openId4Vc.verifyPresentationToken({ token });

            // Assert
            expect(result).toBeSuccessful();
            expect(result.value).toMatchObject({ isValid: false, error: { name: "PresentationVerificationError", message: "Verify Error: Invalid Nonce" } });
        });

        test("reject a token with a modified issuer signature", async () => {
            // Arrange
            const original = await createPresentationToken(storedCredential);
            const token = { ...original, content: { ...original.content, value: tamperIssuerSignature(original.content.value as string) } };

            // Act
            const result = await runtimeServices1.consumption.openId4Vc.verifyPresentationToken({ token });

            // Assert
            expect(result).toBeSuccessful();
            expect(result.value).toMatchObject({ isValid: false, error: { message: "Verify Error: Invalid JWT Signature" } });
        });

        test("reject a token with a modified holder signature", async () => {
            // Arrange
            const original = await createPresentationToken(storedCredential);
            const [issuerJwt, disclosure, keyBindingJwt] = (original.content.value as string).split("~");
            const token = { ...original, content: { ...original.content, value: `${issuerJwt}~${disclosure}~${tamperSignature(keyBindingJwt)}` } };

            // Act
            const result = await runtimeServices1.consumption.openId4Vc.verifyPresentationToken({ token });

            // Assert
            expect(result).toBeSuccessful();
            expect(result.value).toMatchObject({ isValid: false, error: { message: "Verify Error: Invalid JWT Signature" } });
        });

        test("reject a token without a key binding JWT", async () => {
            // Arrange
            const original = await createPresentationToken(storedCredential);
            const [issuerJwt, disclosure] = (original.content.value as string).split("~");
            const token = { ...original, content: { ...original.content, value: `${issuerJwt}~${disclosure}~` } };

            // Act
            const result = await runtimeServices1.consumption.openId4Vc.verifyPresentationToken({ token });

            // Assert
            expect(result).toBeSuccessful();
            expect(result.value).toMatchObject({ isValid: false, error: { message: "Verify Error: Missing Key Binding JWT" } });
        });

        test("reject a token with a modified disclosure", async () => {
            // Arrange
            const original = await createPresentationToken(storedCredential);
            const [issuerJwt, , keyBindingJwt] = (original.content.value as string).split("~");
            const disclosure = Buffer.from(JSON.stringify(["salt", "test", "tampered"])).toString("base64url");
            const token = { ...original, content: { ...original.content, value: `${issuerJwt}~${disclosure}~${keyBindingJwt}` } };

            // Act
            const result = await runtimeServices1.consumption.openId4Vc.verifyPresentationToken({ token });

            // Assert
            expect(result).toBeSuccessful();
            expect(result.value.isValid).toBe(false);
            expect(result.value.error?.message).toMatch(/disclosure|digest/i);
        });

        test("reject a token whose disclosures no longer match the signed SD hash", async () => {
            // Arrange
            const original = await createPresentationToken(storedCredential);
            const [issuerJwt, , keyBindingJwt] = (original.content.value as string).split("~");
            const token = { ...original, content: { ...original.content, value: `${issuerJwt}~${keyBindingJwt}` } };

            // Act
            const result = await runtimeServices1.consumption.openId4Vc.verifyPresentationToken({ token });

            // Assert
            expect(result).toBeSuccessful();
            expect(result.value).toMatchObject({ isValid: false, error: { message: "Verify Error: Invalid SD Hash" } });
        });

        test("reject a token bound to another audience", async () => {
            // Arrange
            const original = await createPresentationToken(storedCredential);
            const value = await replaceKeyBindingClaims(original.content.value as string, { aud: "another-verifier" });
            const token = { ...original, content: { ...original.content, value } };

            // Act
            const result = await runtimeServices1.consumption.openId4Vc.verifyPresentationToken({ token });

            // Assert
            expect(result).toBeSuccessful();
            expect(result.value).toMatchObject({ isValid: false, error: { message: "Verify Error: Invalid Audience" } });
        });

        test("reject an expired key binding JWT", async () => {
            // Arrange
            const original = await createPresentationToken(storedCredential);
            const value = await replaceKeyBindingClaims(original.content.value as string, { exp: Math.floor(Date.now() / 1000) - 60 });
            const token = { ...original, content: { ...original.content, value } };

            // Act
            const result = await runtimeServices1.consumption.openId4Vc.verifyPresentationToken({ token });

            // Assert
            expect(result).toBeSuccessful();
            expect(result.value).toMatchObject({ isValid: false, error: { message: "Verify Error: Expired JWT" } });
        });

        test("reject a key binding JWT that is not yet valid", async () => {
            // Arrange
            const original = await createPresentationToken(storedCredential);
            const value = await replaceKeyBindingClaims(original.content.value as string, { nbf: Math.floor(Date.now() / 1000) + 3600 });
            const token = { ...original, content: { ...original.content, value } };

            // Act
            const result = await runtimeServices1.consumption.openId4Vc.verifyPresentationToken({ token });

            // Assert
            expect(result).toBeSuccessful();
            expect(result.value).toMatchObject({ isValid: false, error: { message: "Verify Error: JWT Not Yet Valid" } });
        });

        test("reject a token containing an expired credential", async () => {
            // Arrange
            const original = await createPresentationToken(storedCredential);
            const value = await replaceIssuerClaims(original.content.value as string, { exp: Math.floor(Date.now() / 1000) - 60 });
            const token = { ...original, content: { ...original.content, value } };

            // Act
            const result = await runtimeServices1.consumption.openId4Vc.verifyPresentationToken({ token });

            // Assert
            expect(result).toBeSuccessful();
            expect(result.value).toMatchObject({ isValid: false, error: { message: "Verify Error: Expired JWT" } });
        });
    });
});

describe("credential status through the facade", () => {
    const statusUri = `${eudiploBaseUrl}/test-status-list`;

    test.each([
        { name: "a revoked credential", response: async () => new Response(await prepareStatusListJwt(1)), error: /status|revoked/i },
        {
            name: "an invalid status list signature",
            response: async () => new Response(tamperSignature(await prepareStatusListJwt(0))),
            error: /Status List JWT verification failed/i
        },
        { name: "an unavailable status list", response: () => Promise.resolve(new Response("unavailable", { status: 503 })), error: /Unable to fetch status list: HTTP 503/ },
        {
            name: "an expired status list",
            response: async () => new Response(await prepareStatusListJwt(0, { exp: Math.floor(Date.now() / 1000) - 60 })),
            error: /Status List JWT verification failed|expired/i
        }
    ])("report $name when verifying a presentation token", async ({ response, error }) => {
        // Arrange
        issuerResponses.set(statusUri, new Response(await prepareStatusListJwt(0)));
        const credential = await prepareSdJwtCredential({ status: { status_list: { uri: statusUri, idx: 0 } } });
        const stored = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses: [credential] });
        const token = await createPresentationToken(stored.value);
        issuerResponses.set(statusUri, await response());

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.verifyPresentationToken({ token });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value).toMatchObject({ isValid: false, error: { message: expect.stringMatching(error) } });
    });

    test("exclude a credential revoked after storage from matching credentials", async () => {
        // Arrange
        issuerResponses.set(statusUri, new Response(await prepareStatusListJwt(0)));
        const credential = await prepareSdJwtCredential({ status: { status_list: { uri: statusUri, idx: 0 } } });
        const stored = await runtimeServices1.consumption.openId4Vc.storeCredentials({ credentialResponses: [credential] });
        const presentation = await eudiploClient.createPresentationRequest({ configId: "test" });
        issuerResponses.set(statusUri, new Response(await prepareStatusListJwt(1)));

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: presentation.uri });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.matchingCredentials.map((attribute) => attribute.id)).not.toContain(stored.value.id);
    });
});

describe("credential synchronization", () => {
    test.each(["test", "mdoc"])("present a %s credential after real device onboarding and datawallet synchronization", async (configurationId) => {
        // Arrange
        const [owner] = await runtimeServiceProvider.launch(1, { enableDatawallet: true });
        const attribute = await createAndStoreCredential(owner, configurationId);
        await owner.transport.account.syncDatawallet();
        const emptyToken = await owner.anonymous.tokens.createEmptyToken();
        const onboarding = await owner.transport.devices.fillDeviceOnboardingTokenWithNewDevice({ reference: emptyToken.value.reference.truncated });
        const deviceSharedSecret = TokenContentDeviceSharedSecret.from(onboarding.value.content).sharedSecret;
        const [otherDevice] = await runtimeServiceProvider.launch(1, { enableDatawallet: true, deviceSharedSecret });
        await otherDevice.transport.account.syncDatawallet();
        const request = await eudiploClient.createPresentationRequest({ configId: configurationId });
        const resolved = await otherDevice.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: request.uri });

        // Act
        const result = await otherDevice.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest: resolved.value.authorizationRequest, attributeId: attribute.id });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.status).toBe(200);
        expect((await eudiploClient.getSession(request.sessionId)).status).toBe("completed");
    });
});

describe("additional device synchronization", () => {
    test("present a JWT VC after real device onboarding and datawallet synchronization", async () => {
        // Arrange
        const [owner] = await runtimeServiceProvider.launch(1, { enableDatawallet: true });
        const credential = await prepareJwtVcCredential(owner);
        const stored = await owner.consumption.openId4Vc.storeCredentials({ credentialResponses: [credential] });
        await owner.transport.account.syncDatawallet();
        const emptyToken = await owner.anonymous.tokens.createEmptyToken();
        const onboarding = await owner.transport.devices.fillDeviceOnboardingTokenWithNewDevice({ reference: emptyToken.value.reference.truncated });
        const deviceSharedSecret = TokenContentDeviceSharedSecret.from(onboarding.value.content).sharedSecret;
        const [otherDevice] = await runtimeServiceProvider.launch(1, { enableDatawallet: true, deviceSharedSecret });
        await otherDevice.transport.account.syncDatawallet();
        const authorizationRequestUrl = await signedAuthorizationRequest({
            response_mode: "direct_post",
            client_metadata: { vp_formats_supported: { jwt_vc_json: { alg_values: ["ES256"] } } },
            dcql_query: { credentials: [{ id: "vc", format: "jwt_vc_json", meta: { type_values: [["VerifiableCredential", "TestCredential"]] } }] }
        });
        const resolved = await otherDevice.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl });
        const responseUri = resolved.value.authorizationRequest.authorizationRequestPayload.response_uri!;
        issuerResponses.set(responseUri, new Response("accepted"));
        const publicKey = createPublicKey({ key: (decodeJwtPayload(credential.encoded).cnf as { jwk: webcrypto.JsonWebKey }).jwk, format: "jwk" });

        // Act
        const result = await otherDevice.consumption.openId4Vc.acceptAuthorizationRequest({
            authorizationRequest: resolved.value.authorizationRequest,
            attributeId: stored.value.id
        });

        // Assert
        expect(result).toBeSuccessful();
        const body = new URLSearchParams(outboundRequests.get(responseUri)!.body as string);
        const presentation = (JSON.parse(body.get("vp_token")!) as { vc: string[] }).vc[0];
        const [header, payload, signature] = presentation.split(".");
        expect(verify("sha256", Buffer.from(`${header}.${payload}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(signature, "base64url"))).toBe(true);
        expect(decodeJwtPayload(presentation)).toMatchObject({
            aud: resolved.value.authorizationRequest.authorizationRequestPayload.client_id,
            nonce: resolved.value.authorizationRequest.authorizationRequestPayload.nonce,
            vp: { verifiableCredential: [credential.encoded] }
        });
    });

    test("reuse the synchronized credential cache on an onboarded device", async () => {
        // Arrange
        const [owner] = await runtimeServiceProvider.launch(1, { enableDatawallet: true, enableRequestModule: true, enableDeciderModule: true });
        await establishRelationship(runtimeServices1.transport, owner.transport);
        const offer = await eudiploClient.createIssuanceOffer({ credentialConfigurationIds: ["test"], flow: "pre_authorized_code" });
        const metadata = (await (await fetch(`${eudiploBaseUrl}/.well-known/openid-credential-issuer/issuers/test`)).json()) as { credential_endpoint: string };
        const credentialEndpoint = metadata.credential_endpoint;
        const requestId = await prepareIncomingRequest(
            { "@type": "ShareCredentialOfferRequestItem", mustBeAccepted: true, credentialOfferUrl: offer.uri },
            runtimeServices1,
            owner
        );
        await owner.consumption.incomingRequests.canAccept({ requestId, items: [{ accept: true }] });
        await owner.transport.account.syncDatawallet();
        const emptyToken = await owner.anonymous.tokens.createEmptyToken();
        const onboarding = await owner.transport.devices.fillDeviceOnboardingTokenWithNewDevice({ reference: emptyToken.value.reference.truncated });
        const deviceSharedSecret = TokenContentDeviceSharedSecret.from(onboarding.value.content).sharedSecret;
        const [otherDevice] = await runtimeServiceProvider.launch(1, { enableDatawallet: true, enableRequestModule: true, enableDeciderModule: true, deviceSharedSecret });
        await otherDevice.transport.account.syncDatawallet();
        const cached = (await inboundResponses.get(credentialEndpoint)!.clone().json()) as { credentials: { credential: string }[] };
        outboundRequests.delete(credentialEndpoint);

        // Act
        const result = await otherDevice.consumption.incomingRequests.accept({ requestId, items: [{ accept: true }] });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.response?.content.items).toEqual([{ "@type": "AcceptResponseItem", result: "Accepted" }]);
        expect(outboundRequests.has(credentialEndpoint)).toBe(false);
        const attributes = await otherDevice.consumption.attributes.getAttributes({ query: { "content.value.@type": "VerifiableCredential" } });
        expect(attributes.value).toContainEqual(
            expect.objectContaining({ content: expect.objectContaining({ value: expect.objectContaining({ value: cached.credentials[0].credential }) }) })
        );
    });
});

describe("request integration", () => {
    let peerCredential: LocalAttributeDTO;
    let nonMatchingCredential: LocalAttributeDTO;

    beforeAll(async () => {
        peerCredential = await createAndStoreCredential(runtimeServices2);
        nonMatchingCredential = await createAndStoreCredential(runtimeServices2, "selective");
    });

    test("accept a credential offer received from a peer", async () => {
        // Arrange
        const offer = await eudiploClient.createIssuanceOffer({ credentialConfigurationIds: ["test"], flow: "pre_authorized_code" });
        const requestId = await prepareIncomingRequest({ "@type": "ShareCredentialOfferRequestItem", mustBeAccepted: true, credentialOfferUrl: offer.uri });

        // Act
        const result = await runtimeServices2.consumption.incomingRequests.accept({ requestId, items: [{ accept: true }] });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.response?.content.items).toEqual([{ "@type": "AcceptResponseItem", result: "Accepted" }]);
    });

    test("store the credential received through an accepted peer offer", async () => {
        // Arrange
        const originalCredentials = await runtimeServices2.consumption.attributes.getAttributes({ query: { "content.value.@type": "VerifiableCredential" } });
        const offer = await eudiploClient.createIssuanceOffer({ credentialConfigurationIds: ["test"], flow: "pre_authorized_code" });
        const requestId = await prepareIncomingRequest({ "@type": "ShareCredentialOfferRequestItem", mustBeAccepted: true, credentialOfferUrl: offer.uri });

        // Act
        const result = await runtimeServices2.consumption.incomingRequests.accept({ requestId, items: [{ accept: true }] });

        // Assert
        const storedCredentials = await runtimeServices2.consumption.attributes.getAttributes({ query: { "content.value.@type": "VerifiableCredential" } });
        expect(result).toBeSuccessful();
        expect(storedCredentials).toBeSuccessful();
        expect(storedCredentials.value).toHaveLength(originalCredentials.value.length + 1);
    });

    test("reject a peer credential offer without storing a credential", async () => {
        // Arrange
        const original = await runtimeServices2.consumption.attributes.getAttributes({ query: { "content.value.@type": "VerifiableCredential" } });
        const offer = await eudiploClient.createIssuanceOffer({ credentialConfigurationIds: ["test"], flow: "pre_authorized_code" });
        const requestId = await prepareIncomingRequest({ "@type": "ShareCredentialOfferRequestItem", mustBeAccepted: true, credentialOfferUrl: offer.uri });

        // Act
        const result = await runtimeServices2.consumption.incomingRequests.reject({ requestId, items: [{ accept: false }] });

        // Assert
        const stored = await runtimeServices2.consumption.attributes.getAttributes({ query: { "content.value.@type": "VerifiableCredential" } });
        expect(result).toBeSuccessful();
        expect(result.value.response?.content.items).toEqual([{ "@type": "RejectResponseItem", result: "Rejected" }]);
        expect(stored.value).toHaveLength(original.value.length);
    });

    test("reuse the credential cached during request acceptance validation", async () => {
        // Arrange
        const offer = await eudiploClient.createIssuanceOffer({ credentialConfigurationIds: ["test"], flow: "pre_authorized_code" });
        const requestId = await prepareIncomingRequest({ "@type": "ShareCredentialOfferRequestItem", mustBeAccepted: true, credentialOfferUrl: offer.uri });
        await runtimeServices2.consumption.incomingRequests.canAccept({ requestId, items: [{ accept: true }] });

        // Act
        const result = await runtimeServices2.consumption.incomingRequests.accept({ requestId, items: [{ accept: true }] });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.response?.content.items).toEqual([{ "@type": "AcceptResponseItem", result: "Accepted" }]);
    });

    test("reject acceptance parameters selecting a non-matching credential", async () => {
        // Arrange
        const presentation = await eudiploClient.createPresentationRequest({ configId: "test" });
        const requestId = await prepareIncomingRequest({ "@type": "ShareAuthorizationRequestRequestItem", mustBeAccepted: true, authorizationRequestUrl: presentation.uri });

        // Act
        const result = await runtimeServices2.consumption.incomingRequests.canAccept({
            requestId,
            items: [{ accept: true, attributeId: nonMatchingCredential.id } as AcceptShareAuthorizationRequestRequestItemParametersJSON]
        });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value).toMatchObject({ isSuccess: false, items: [expect.objectContaining({ isSuccess: false, message: expect.stringMatching(/doesn't match the query/) })] });
    });

    test("reject acceptance parameters selecting an unknown credential", async () => {
        // Arrange
        const presentation = await eudiploClient.createPresentationRequest({ configId: "test" });
        const requestId = await prepareIncomingRequest({ "@type": "ShareAuthorizationRequestRequestItem", mustBeAccepted: true, authorizationRequestUrl: presentation.uri });

        // Act
        const result = await runtimeServices2.consumption.incomingRequests.canAccept({
            requestId,
            items: [{ accept: true, attributeId: "ATTXXXXXXXXXXXXXXXXX" } as AcceptShareAuthorizationRequestRequestItemParametersJSON]
        });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value).toMatchObject({ isSuccess: false, items: [expect.objectContaining({ isSuccess: false, code: expect.stringMatching(/recordNotFound/) })] });
    });

    test("report a verifier rejection while accepting a peer request", async () => {
        // Arrange
        const presentation = await eudiploClient.createPresentationRequest({ configId: "test" });
        const resolved = await runtimeServices2.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: presentation.uri });
        const requestId = await prepareIncomingRequest({ "@type": "ShareAuthorizationRequestRequestItem", mustBeAccepted: true, authorizationRequestUrl: presentation.uri });
        issuerResponses.set(
            resolved.value.authorizationRequest.authorizationRequestPayload.response_uri!,
            new Response(JSON.stringify({ error: "invalid_request" }), { status: 400 })
        );

        // Act
        const result = await runtimeServices2.consumption.incomingRequests.accept({
            requestId,
            items: [{ accept: true, attributeId: peerCredential.id } as AcceptShareAuthorizationRequestRequestItemParametersJSON]
        });

        // Assert
        expect(result).toBeAnError(/presentation was not successful/i, /^error\.runtime\.unknown$/);
    });

    test("report an authorization request resolution failure during peer acceptance validation", async () => {
        // Arrange
        const presentation = await eudiploClient.createPresentationRequest({ configId: "test" });
        const requestId = await prepareIncomingRequest({ "@type": "ShareAuthorizationRequestRequestItem", mustBeAccepted: true, authorizationRequestUrl: presentation.uri });
        const requestUri = new URL(presentation.uri).searchParams.get("request_uri")!;
        issuerResponses.set(requestUri, new Response("unavailable", { status: 503 }));

        // Act
        const result = await runtimeServices2.consumption.incomingRequests.canAccept({
            requestId,
            items: [{ accept: true, attributeId: peerCredential.id } as AcceptShareAuthorizationRequestRequestItemParametersJSON]
        });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value).toMatchObject({
            isSuccess: false,
            items: [
                expect.objectContaining({
                    isSuccess: false,
                    code: "error.consumption.requests.invalidRequestItem",
                    message: expect.stringContaining("The authorization request url can't be resolved.")
                })
            ]
        });
    });

    test("report a credential offer resolution failure during peer acceptance validation", async () => {
        // Arrange
        const offer = await eudiploClient.createIssuanceOffer({ credentialConfigurationIds: ["test"], flow: "pre_authorized_code" });
        const requestId = await prepareIncomingRequest({ "@type": "ShareCredentialOfferRequestItem", mustBeAccepted: true, credentialOfferUrl: offer.uri });
        issuerResponses.set(new URL(offer.uri).searchParams.get("credential_offer_uri")!, new Response("unavailable", { status: 503 }));

        // Act
        const result = await runtimeServices2.consumption.incomingRequests.canAccept({ requestId, items: [{ accept: true }] });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value).toMatchObject({
            isSuccess: false,
            items: [expect.objectContaining({ isSuccess: false, message: expect.stringMatching(/could not be processed.*503/s) })]
        });
    });

    test("reject a peer presentation request without submitting a presentation", async () => {
        // Arrange
        const presentation = await eudiploClient.createPresentationRequest({ configId: "test" });
        const resolved = await runtimeServices2.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: presentation.uri });
        const responseUri = resolved.value.authorizationRequest.authorizationRequestPayload.response_uri!;
        const requestId = await prepareIncomingRequest({ "@type": "ShareAuthorizationRequestRequestItem", mustBeAccepted: true, authorizationRequestUrl: presentation.uri });
        outboundRequests.delete(responseUri);

        // Act
        const result = await runtimeServices2.consumption.incomingRequests.reject({ requestId, items: [{ accept: false }] });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.response?.content.items).toEqual([{ "@type": "RejectResponseItem", result: "Rejected" }]);
        expect(outboundRequests.has(responseUri)).toBe(false);
    });

    test("publish the credential-offer rejection event to the peer", async () => {
        // Arrange
        const offer = await eudiploClient.createIssuanceOffer({ credentialConfigurationIds: ["test"], flow: "pre_authorized_code" });
        const requestId = await prepareIncomingRequest({ "@type": "ShareCredentialOfferRequestItem", mustBeAccepted: true, credentialOfferUrl: offer.uri });

        // Act
        const result = await runtimeServices2.consumption.incomingRequests.reject({ requestId, items: [{ accept: false }] });

        // Assert
        await syncUntilHasMessageWithResponse(runtimeServices1.transport, requestId);
        await runtimeServices1.eventBus.waitForRunningEventHandlers();
        expect(result).toBeSuccessful();
        expect(runtimeServices1.eventBus.publishedEvents).toContainEqual(
            expect.objectContaining({
                namespace: "consumption.shareCredentialOfferRequestItemProcessedByRecipient",
                data: expect.objectContaining({ credentialOfferUrl: offer.uri, accepted: false })
            })
        );
    });

    test("publish the credential-offer acceptance event to the peer", async () => {
        // Arrange
        const offer = await eudiploClient.createIssuanceOffer({ credentialConfigurationIds: ["test"], flow: "pre_authorized_code" });
        const requestId = await prepareIncomingRequest({ "@type": "ShareCredentialOfferRequestItem", mustBeAccepted: true, credentialOfferUrl: offer.uri });

        // Act
        const result = await runtimeServices2.consumption.incomingRequests.accept({ requestId, items: [{ accept: true }] });

        // Assert
        await syncUntilHasMessageWithResponse(runtimeServices1.transport, requestId);
        await runtimeServices1.eventBus.waitForRunningEventHandlers();
        expect(result).toBeSuccessful();
        expect(runtimeServices1.eventBus.publishedEvents).toContainEqual(
            expect.objectContaining({
                namespace: "consumption.shareCredentialOfferRequestItemProcessedByRecipient",
                data: expect.objectContaining({ credentialOfferUrl: offer.uri, accepted: true })
            })
        );
    });

    test("present a credential in response to a peer request", async () => {
        // Arrange
        const presentation = await eudiploClient.createPresentationRequest({ configId: "test" });
        const requestId = await prepareIncomingRequest({ "@type": "ShareAuthorizationRequestRequestItem", mustBeAccepted: true, authorizationRequestUrl: presentation.uri });

        // Act
        const result = await runtimeServices2.consumption.incomingRequests.accept({
            requestId,
            items: [{ accept: true, attributeId: peerCredential.id } as AcceptShareAuthorizationRequestRequestItemParametersJSON]
        });

        // Assert
        expect(result).toBeSuccessful();
        expect((await eudiploClient.getSession(presentation.sessionId)).status).toBe("completed");
    });
});

async function prepareCredentialOffer(configurationId = eudiploCredentialConfigurationId) {
    const offer = await eudiploClient.createIssuanceOffer({ responseType: "uri", credentialConfigurationIds: [configurationId], flow: "pre_authorized_code" });
    const resolved = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({ credentialOfferUrl: offer.uri });
    return resolved.value.credentialOffer;
}

async function prepareAuthorizationCodeAccess() {
    const offer = await eudiploClient.createIssuanceOffer({ credentialConfigurationIds: ["test"], flow: "authorization_code", authorizationServer: "test-built-in" });
    const resolved = await runtimeServices1.consumption.openId4Vc.resolveCredentialOffer({ credentialOfferUrl: offer.uri });
    const credentialOffer = resolved.value.credentialOffer;
    const authorizationServer = credentialOffer.metadata.authorizationServers[0];
    const codeVerifier = "eudiplo-runtime-test-code-verifier-0123456789";
    const redirectUri = `${eudiploBaseUrl}/callback`;
    const parResponse = await fetch(authorizationServer.pushed_authorization_request_endpoint as string, {
        method: "POST",
        body: new URLSearchParams({
            client_id: "wallet",
            response_type: "code",
            redirect_uri: redirectUri,
            issuer_state: credentialOffer.credentialOfferPayload.grants!.authorization_code!.issuer_state!,
            code_challenge: createHash("sha256").update(codeVerifier).digest("base64url"),
            code_challenge_method: "S256",
            authorization_details: JSON.stringify([{ type: "openid_credential", credential_configuration_id: "test" }])
        })
    });
    const par = (await parResponse.json()) as { request_uri: string };
    const authorizationResponse = await fetch(`${authorizationServer.authorization_endpoint}?${new URLSearchParams({ client_id: "wallet", request_uri: par.request_uri })}`, {
        redirect: "manual"
    });
    const code = new URL(authorizationResponse.headers.get("location")!).searchParams.get("code")!;
    const tokenResponse = await fetch(authorizationServer.token_endpoint, {
        method: "POST",
        body: new URLSearchParams({ grant_type: "authorization_code", client_id: "wallet", code, redirect_uri: redirectUri, code_verifier: codeVerifier })
    });
    const token = (await tokenResponse.json()) as { access_token: string };
    return { credentialOffer, accessToken: token.access_token };
}

async function issueCredential(services: TestRuntimeServices, configurationId = eudiploCredentialConfigurationId) {
    const credentialOffer = await prepareCredentialOffer(configurationId);
    const result = await services.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: [configurationId] });
    return result.value.credentialResponses;
}

async function createAndStoreCredential(services: TestRuntimeServices, configurationId = eudiploCredentialConfigurationId) {
    const credentialResponses = await issueCredential(services, configurationId);
    const result = await services.consumption.openId4Vc.storeCredentials({ credentialResponses });
    return result.value;
}

async function prepareAuthorizationRequest(configId = eudiploPresentationConfigurationId) {
    const request = await eudiploClient.createPresentationRequest({ configId });
    const result = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl: request.uri });
    return result.value.authorizationRequest;
}

async function fetchAuthorizationRequestJwt(authorizationRequestUrl: string) {
    const requestUri = new URL(authorizationRequestUrl).searchParams.get("request_uri")!;
    return await (await fetch(requestUri)).text();
}

async function createPresentationToken(storedCredential: LocalAttributeDTO) {
    const result = await runtimeServices1.consumption.openId4Vc.createPresentationToken({
        attributeId: storedCredential.id,
        expiresAt: CoreDate.utc().add({ minutes: 1 }).toString(),
        ephemeral: true
    });
    return { ...result.value, content: result.value.content as TokenContentVerifiablePresentationJSON };
}

async function prepareIncomingRequest(item: RequestItemJSONDerivations, sender = runtimeServices1, recipient = runtimeServices2) {
    const request = await sender.consumption.outgoingRequests.create({ peer: recipient.address, content: { items: [item] } });
    await sender.transport.messages.sendMessage({ recipients: [recipient.address], content: request.value.content });
    await syncUntilHasMessageWithRequest(recipient.transport, request.value.id);
    return request.value.id;
}

function decodeJwtPayload(jwt: string): Record<string, unknown> {
    return JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()) as Record<string, unknown>;
}

function tamperSignature(jwt: string) {
    const [header, payload, signature] = jwt.split(".");
    const bytes = Buffer.from(signature, "base64url");
    bytes[0] ^= 1;
    return `${header}.${payload}.${bytes.toString("base64url")}`;
}

function tamperIssuerSignature(encoded: string) {
    const parts = encoded.split("~");
    parts[0] = tamperSignature(parts[0]);
    return parts.join("~");
}

async function replaceJwtClaims(jwt: string, claims: Record<string, unknown>, keyFile: string) {
    const keyConfig = JSON.parse(await readFile(resolve(process.cwd(), `../../.dev/eudiplo/config/test/key-chains/${keyFile}.json`), "utf8")) as {
        spec: { keySource: { jwk: webcrypto.JsonWebKey } };
    };
    const key = createPrivateKey({ key: keyConfig.spec.keySource.jwk, format: "jwk" });
    const header = jwt.split(".")[0];
    const payload = Buffer.from(JSON.stringify({ ...decodeJwtPayload(jwt), ...claims })).toString("base64url");
    const signature = sign("sha256", Buffer.from(`${header}.${payload}`), { key, dsaEncoding: "ieee-p1363" });
    return `${header}.${payload}.${signature.toString("base64url")}`;
}

async function replaceIssuerClaims(encoded: string, claims: Record<string, unknown>) {
    const parts = encoded.split("~");
    parts[0] = await replaceJwtClaims(parts[0], claims, "attestation-key");
    return parts.join("~");
}

async function replaceKeyBindingClaims(encoded: string, claims: Record<string, unknown>) {
    const [issuerJwt, disclosure, keyBindingJwt] = encoded.split("~");
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const changedIssuerJwt = await replaceJwtClaims(issuerJwt, { cnf: { jwk: publicKey.export({ format: "jwk" }) } }, "attestation-key");
    const credential = `${changedIssuerJwt}~${disclosure}~`;
    const header = keyBindingJwt.split(".")[0];
    const payload = Buffer.from(
        JSON.stringify({
            ...decodeJwtPayload(keyBindingJwt),
            sd_hash: createHash("sha256").update(credential).digest("base64url"),
            ...claims
        })
    ).toString("base64url");
    const signature = sign("sha256", Buffer.from(`${header}.${payload}`), { key: privateKey, dsaEncoding: "ieee-p1363" });
    return `${credential}${header}.${payload}.${signature.toString("base64url")}`;
}

async function prepareJwtVcCredential(services = runtimeServices1): Promise<OpenId4VciCredentialResponseJSON> {
    const [issued] = await issueCredential(services);
    const original = decodeJwtPayload(issued.encoded.split("~")[0]);
    const holderJwk = (original.cnf as { jwk: webcrypto.JsonWebKey }).jwk;
    const holderDid = `did:jwk:${Buffer.from(JSON.stringify(holderJwk)).toString("base64url")}`;
    const keyConfig = JSON.parse(await readFile(resolve(process.cwd(), "../../.dev/eudiplo/config/test/key-chains/attestation-key.json"), "utf8")) as {
        spec: { keySource: { jwk: webcrypto.JsonWebKey } };
    };
    const key = createPrivateKey({ key: keyConfig.spec.keySource.jwk, format: "jwk" });
    const originalHeader = JSON.parse(Buffer.from(issued.encoded.split(".")[0], "base64url").toString()) as Record<string, unknown>;
    const header = Buffer.from(JSON.stringify({ ...originalHeader, typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(
        JSON.stringify({
            iss: original.iss,
            sub: holderDid,
            cnf: original.cnf,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
            vc: { "@context": ["https://www.w3.org/2018/credentials/v1"], type: ["VerifiableCredential", "TestCredential"], credentialSubject: { id: holderDid, name: "Alice" } }
        })
    ).toString("base64url");
    const signature = sign("sha256", Buffer.from(`${header}.${payload}`), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
    return { claimFormat: "jwt_vc_json", encoded: `${header}.${payload}.${signature}` };
}

function credentialProof(endpoint: string): string {
    return (JSON.parse(outboundRequests.get(endpoint)!.body as string) as { proofs: { jwt: string[] } }).proofs.jwt[0];
}

async function signedAuthorizationRequest(changes: Record<string, unknown>, configId = "test") {
    const request = await eudiploClient.createPresentationRequest({ configId });
    const jwt = await fetchAuthorizationRequestJwt(request.uri);
    const signedRequest = await replaceJwtClaims(jwt, changes, "access-key");
    return `openid4vp://?client_id=${encodeURIComponent(decodeJwtPayload(jwt).client_id as string)}&request=${signedRequest}`;
}

async function prepareSdJwtCredential(claims: Record<string, unknown>): Promise<OpenId4VciCredentialResponseJSON> {
    const [issued] = await issueCredential(runtimeServices1);
    return { ...issued, encoded: await replaceIssuerClaims(issued.encoded, claims) };
}

async function prepareArrayCredential(): Promise<OpenId4VciCredentialResponseJSON> {
    const [issued] = await issueCredential(runtimeServices1);
    const alice = Buffer.from(JSON.stringify([crypto.randomUUID(), { given_name: "Alice" }])).toString("base64url");
    const bob = Buffer.from(JSON.stringify([crypto.randomUUID(), { given_name: "Bob" }])).toString("base64url");
    const issuerJwt = await replaceJwtClaims(
        issued.encoded.split("~")[0],
        {
            _sd: undefined,
            names: [{ "...": createHash("sha256").update(alice).digest("base64url") }, { "...": createHash("sha256").update(bob).digest("base64url") }]
        },
        "attestation-key"
    );
    return { ...issued, encoded: `${issuerJwt}~${alice}~${bob}~` };
}

async function fixturePrivateKey(keyFile: string) {
    const config = JSON.parse(await readFile(resolve(process.cwd(), `../../.dev/eudiplo/config/test/key-chains/${keyFile}.json`), "utf8")) as {
        spec: { keySource: { jwk: webcrypto.JsonWebKey } };
    };
    return createPrivateKey({ key: config.spec.keySource.jwk, format: "jwk" });
}

async function prepareStatusListJwt(status: number, claims: Record<string, unknown> = {}) {
    const [issued] = await issueCredential(runtimeServices1);
    const originalHeader = JSON.parse(Buffer.from(issued.encoded.split(".")[0], "base64url").toString()) as Record<string, unknown>;
    const header = Buffer.from(JSON.stringify({ ...originalHeader, typ: "statuslist+jwt" })).toString("base64url");
    const payload = Buffer.from(
        JSON.stringify({
            iss: `${eudiploBaseUrl}/issuers/test`,
            sub: `${eudiploBaseUrl}/test-status-list`,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
            status_list: { bits: 1, lst: deflateSync(Uint8Array.of(status)).toString("base64url") },
            ...claims
        })
    ).toString("base64url");
    const signature = sign("sha256", Buffer.from(`${header}.${payload}`), { key: await fixturePrivateKey("attestation-key"), dsaEncoding: "ieee-p1363" }).toString("base64url");
    return `${header}.${payload}.${signature}`;
}

async function prepareEncryptedPresentation(algorithm = "ECDH-ES", clientMetadata: Record<string, unknown> = {}) {
    const { publicKey, privateKey } = await generateKeyPair(algorithm, { extractable: true });
    const jwk = { ...(await exportJWK(publicKey)), alg: algorithm, use: "enc", kid: "encryption-key" };
    const authorizationRequestUrl = await signedAuthorizationRequest({
        client_metadata: { jwks: { keys: [jwk] }, encrypted_response_enc_values_supported: ["A256GCM"], ...clientMetadata }
    });
    const resolved = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl });
    const authorizationRequest = resolved.value.authorizationRequest;
    const responseUri = authorizationRequest.authorizationRequestPayload.response_uri!;
    issuerResponses.set(responseUri, new Response(JSON.stringify({ accepted: true })));
    return { authorizationRequest, privateKey, responseUri };
}

interface ProofHeader {
    alg: string;
    jwk?: webcrypto.JsonWebKey;
    kid?: string;
}

function p256DidProofKey(header: ProofHeader): webcrypto.JsonWebKey {
    const compressed = CoreBuffer.fromBase58(header.kid!.split("#")[0].slice(9)).buffer.slice(2);
    const point = ECDH.convertKey(Buffer.from(compressed), "prime256v1", undefined, undefined, "uncompressed") as Buffer;
    return { kty: "EC", crv: "P-256", x: point.subarray(1, 33).toString("base64url"), y: point.subarray(33).toString("base64url") };
}

async function prepareJwtVcIssuer(algorithm: string, binding: string, keyFromProof: (header: ProofHeader) => webcrypto.JsonWebKey) {
    // EUDIPLO supplies the offer, authorization and nonce. This endpoint supplies its unsupported JWT VC format.
    const [template] = await issueCredential(runtimeServices1);
    const credentialOffer = await prepareCredentialOffer();
    const issuer = credentialOffer.credentialOfferPayload.credential_issuer;
    const metadata = {
        ...credentialOffer.metadata.credentialIssuer,
        credential_configurations_supported: {
            test: {
                format: "jwt_vc_json",
                credential_definition: { type: ["VerifiableCredential", "TestCredential"], "@context": ["https://www.w3.org/2018/credentials/v1"] },
                cryptographic_binding_methods_supported: [binding],
                proof_types_supported: { jwt: { proof_signing_alg_values_supported: [algorithm] } }
            }
        }
    };
    const issuerUrl = new URL(issuer);
    issuerResponses.set(`${issuerUrl.origin}/.well-known/openid-credential-issuer${issuerUrl.pathname}`, Response.json(metadata));
    const issuerKey = await fixturePrivateKey("attestation-key");
    const issuerHeader = JSON.parse(Buffer.from(template.encoded.split(".")[0], "base64url").toString()) as Record<string, unknown>;
    issuerHandlers.set(metadata.credential_endpoint, (init) => {
        const proof = (JSON.parse(init!.body as string) as { proofs: { jwt: string[] } }).proofs.jwt[0];
        const proofHeader = JSON.parse(Buffer.from(proof.split(".")[0], "base64url").toString()) as ProofHeader;
        const holderKey = keyFromProof(proofHeader);
        const subject = proofHeader.kid?.split("#")[0] ?? `did:jwk:${Buffer.from(JSON.stringify(holderKey)).toString("base64url")}`;
        const header = Buffer.from(JSON.stringify({ ...issuerHeader, typ: "JWT" })).toString("base64url");
        const payload = Buffer.from(
            JSON.stringify({
                iss: issuer,
                sub: subject,
                cnf: { jwk: holderKey },
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 3600,
                vc: { "@context": ["https://www.w3.org/2018/credentials/v1"], type: ["VerifiableCredential", "TestCredential"], credentialSubject: { id: subject, name: "Alice" } }
            })
        ).toString("base64url");
        const signature = sign("sha256", Buffer.from(`${header}.${payload}`), { key: issuerKey, dsaEncoding: "ieee-p1363" }).toString("base64url");
        return Response.json({ credentials: [{ credential: `${header}.${payload}.${signature}` }] });
    });
    return credentialOffer;
}

async function prepareAuthorizationRequestWithFormats(vpFormatsSupported: Record<string, unknown>, configId = "test") {
    const request = await eudiploClient.createPresentationRequest({ configId });
    const jwt = await fetchAuthorizationRequestJwt(request.uri);
    const payload = decodeJwtPayload(jwt);
    const signedRequest = await replaceJwtClaims(
        jwt,
        { client_metadata: { ...(payload.client_metadata as Record<string, unknown>), vp_formats_supported: vpFormatsSupported } },
        "access-key"
    );
    const authorizationRequestUrl = `openid4vp://?client_id=${encodeURIComponent(payload.client_id as string)}&request=${signedRequest}`;
    const resolved = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl });
    return { authorizationRequest: resolved.value.authorizationRequest, sessionId: request.sessionId };
}
