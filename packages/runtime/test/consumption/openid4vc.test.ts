/* eslint-disable @typescript-eslint/naming-convention -- Standard OpenID4VC and DCQL field names. */
import { EudiploClient } from "@eudiplo/sdk-core";
import { AcceptShareAuthorizationRequestRequestItemParametersJSON, OpenId4VciCredentialResponseJSON } from "@nmshd/consumption";
import { RequestItemJSONDerivations, TokenContentVerifiablePresentationJSON, VerifiableCredentialJSON } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify, webcrypto, X509Certificate } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { StartedTestContainer } from "testcontainers";
import { startEudiplo } from "../../../../.dev/eudiplo/startEudiplo";
import { LocalAttributeDTO } from "../../src";
import { establishRelationship, RuntimeServiceProvider, syncUntilHasMessageWithRequest, TestRuntimeServices } from "../lib";

const eudiploBaseUrl = "http://localhost:3000";

const fetchInstance: typeof fetch = (input, init) => fetch(input, init);

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

    test("reject a correctly signed request from an untrusted verifier certificate", async () => {
        // Arrange
        const request = await eudiploClient.createPresentationRequest({ configId: "test" });
        const jwt = await fetchAuthorizationRequestJwt(request.uri);
        const certificate = new X509Certificate(await readFile(resolve(process.cwd(), "../../.dev/eudiplo/test-certificates/untrusted-verifier.cert.pem")));
        const key = createPrivateKey(await readFile(resolve(process.cwd(), "../../.dev/eudiplo/test-certificates/untrusted-verifier.key.pem")));
        const clientId = `x509_hash:${createHash("sha256").update(certificate.raw).digest("base64url")}`;
        const header = Buffer.from(JSON.stringify({ alg: "ES256", typ: "oauth-authz-req+jwt", x5c: [certificate.raw.toString("base64")] })).toString("base64url");
        const payload = Buffer.from(JSON.stringify({ ...decodeJwtPayload(jwt), client_id: clientId })).toString("base64url");
        const signature = sign("sha256", Buffer.from(`${header}.${payload}`), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
        const authorizationRequestUrl = `openid4vp://?client_id=${encodeURIComponent(clientId)}&request=${header}.${payload}.${signature}`;

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.resolveAuthorizationRequest({ authorizationRequestUrl });

        // Assert
        expect(result).toBeAnError(/trust|certificate/i, /.+/);
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

    test("reject reuse of a pre-authorized code", async () => {
        // Arrange
        const credentialOffer = await prepareCredentialOffer();
        await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["test"] });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.requestCredentials({ credentialOffer, credentialConfigurationIds: ["test"] });

        // Assert
        expect(result).toBeAnError(/invalid_grant|already|code/i, /.+/);
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

    test("request a credential using an authorization code access token", async () => {
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

    test("reject a presentation with a nonce unknown to the verifier", async () => {
        // Arrange
        const authorizationRequest = await prepareAuthorizationRequest("test");
        authorizationRequest.authorizationRequestPayload.nonce = "wrong-nonce";

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.status).toBe(400);
    });

    test("reject replay of a completed presentation", async () => {
        // Arrange
        const authorizationRequest = await prepareAuthorizationRequest("test");
        await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Act
        const result = await runtimeServices1.consumption.openId4Vc.acceptAuthorizationRequest({ authorizationRequest, attributeId: storedCredential.id });

        // Assert
        expect(result).toBeSuccessful();
        expect(result.value.status).toBe(400);
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

describe("request integration", () => {
    let peerCredential: LocalAttributeDTO;

    beforeAll(async () => {
        peerCredential = await createAndStoreCredential(runtimeServices2);
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

async function prepareIncomingRequest(item: RequestItemJSONDerivations) {
    const request = await runtimeServices1.consumption.outgoingRequests.create({ peer: runtimeServices2.address, content: { items: [item] } });
    await runtimeServices1.transport.messages.sendMessage({ recipients: [runtimeServices2.address], content: request.value.content });
    await syncUntilHasMessageWithRequest(runtimeServices2.transport, request.value.id);
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
