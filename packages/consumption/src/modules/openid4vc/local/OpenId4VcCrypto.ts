import "reflect-metadata";
import { p256 } from "@noble/curves/nist.js";
import { CallbackContext, clientAuthenticationNone, Jwk, JwtSigner, zJwk, zJwkSet } from "@openid4vc/oauth2";
import { CoseKey, SignatureAlgorithm } from "@owf/cose";
import { MdocContext } from "@owf/mdoc";
import { SubjectAlternativeNameExtension, X509Certificate } from "@peculiar/x509";
import { base58 } from "@scure/base";
import {
    base64url,
    calculateJwkThumbprint,
    CompactEncrypt,
    compactVerify,
    createLocalJWKSet,
    createRemoteJWKSet,
    customFetch,
    decodeJwt,
    decodeProtectedHeader,
    exportJWK,
    generateKeyPair,
    importJWK,
    importX509,
    JWTPayload,
    JWTHeaderParameters,
    jwtVerify,
    SignJWT
} from "jose";
import { z } from "zod";
import { KeyStorage } from "./KeyStorage";

const encoder = new TextEncoder();
const verificationMethodSchema = z.object({ id: z.string(), controller: z.string(), publicKeyJwk: zJwk.optional() });
const didDocumentSchema = z.object({
    id: z.string(),
    verificationMethod: z.array(verificationMethodSchema).optional(),
    assertionMethod: z.array(z.union([z.string(), verificationMethodSchema])).optional()
});
// eslint-disable-next-line @typescript-eslint/naming-convention -- Standard JWT VC issuer metadata field.
const issuerMetadataSchema = z.object({ issuer: z.string(), jwks: zJwkSet.optional(), jwks_uri: z.url().optional() });

export class OpenId4VcCrypto {
    public constructor(
        private readonly keyStorage: KeyStorage,
        private readonly fetchInstance: typeof fetch
    ) {}

    private requireWebCrypto(): Crypto {
        const webCrypto = globalThis.crypto;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- DOM typings declare Web Crypto even in insecure WebViews, where it can be absent.
        if (!webCrypto?.subtle) {
            throw new Error("OpenID4VC requires Web Crypto in a secure context. Load the WebView over HTTPS or localhost, or supply an HTTPS baseUrl to loadHtmlString.");
        }
        return webCrypto;
    }

    public async createKeyForAlgorithms(algorithms: readonly string[]): Promise<Jwk> {
        const supported = algorithms.filter((algorithm) => ["EdDSA", "ES256"].includes(algorithm));
        if (!supported.length) throw new Error("No supported holder signature algorithm");
        this.requireWebCrypto();
        let pair: CryptoKeyPair | undefined;
        for (const algorithm of supported) {
            try {
                pair = await generateKeyPair(algorithm, { extractable: true });
                break;
            } catch (error) {
                // Older system WebViews support P-256 but not Ed25519. Only fall back when
                // the native implementation rejects the algorithm, never after other failures.
                if (!(error instanceof DOMException) || error.name !== "NotSupportedError") throw error;
            }
        }
        if (!pair) throw new Error(`None of the issuer's holder signature algorithms are available in this Web Crypto implementation: ${supported.join(", ")}`);
        const publicKey = zJwk.parse(await exportJWK(pair.publicKey));
        const privateKey = zJwk.parse(await exportJWK(pair.privateKey));
        await this.keyStorage.storeKey(await calculateJwkThumbprint(publicKey), { publicKey, privateKey });
        return publicKey;
    }

    public async createKey(algorithm: string): Promise<Jwk> {
        if (!["EdDSA", "ES256"].includes(algorithm)) throw new Error(`Unsupported holder signature algorithm: ${algorithm}`);
        return await this.createKeyForAlgorithms([algorithm]);
    }

    public async getPrivateKey(publicKey: Jwk): Promise<Jwk> {
        this.requireWebCrypto();
        const pair = await this.keyStorage.getKey(await calculateJwkThumbprint(publicKey));
        if (!pair?.privateKey) throw new Error("Holder key not found");
        return pair.privateKey;
    }

    public algorithm(key: Jwk): "EdDSA" | "ES256" {
        if (key.kty === "OKP" && key.crv === "Ed25519") return "EdDSA";
        if (key.kty === "EC" && key.crv === "P-256") return "ES256";
        throw new Error("Unsupported holder key");
    }

    public didForKey(key: Jwk, method: "key" | "jwk"): string {
        const algorithm = this.algorithm(key);
        if (method === "jwk") return `did:jwk:${base64url.encode(JSON.stringify(key))}#0`;
        if (!key.x) throw new Error("Holder key coordinates are missing");
        let bytes: Uint8Array;
        if (algorithm === "EdDSA") {
            bytes = new Uint8Array([0xed, 0x01, ...base64url.decode(key.x)]);
        } else {
            if (!key.y) throw new Error("Holder key coordinates are missing");
            bytes = new Uint8Array([0x80, 0x24, ...p256.Point.fromBytes(new Uint8Array([4, ...base64url.decode(key.x), ...base64url.decode(key.y)])).toBytes(true)]);
        }
        const fingerprint = `z${base58.encode(bytes)}`;
        return `did:key:${fingerprint}#${fingerprint}`;
    }

    public async resolveDid(didUrl: string): Promise<Jwk> {
        const [did, fragment] = didUrl.split("#");
        if (did.startsWith("did:jwk:")) {
            if (fragment && fragment !== "0") throw new Error("Unknown did:jwk verification method");
            return this.publicKey(JSON.parse(new TextDecoder().decode(base64url.decode(did.slice(8)))));
        }
        if (did.startsWith("did:key:z")) {
            const fingerprint = did.slice(8);
            if (fragment && fragment !== fingerprint) throw new Error("Unknown did:key verification method");
            const bytes = base58.decode(fingerprint.slice(1));
            if (bytes[0] === 0xed && bytes[1] === 1 && bytes.length === 34) return { kty: "OKP", crv: "Ed25519", x: base64url.encode(bytes.slice(2)) };
            if (bytes[0] === 0x80 && bytes[1] === 0x24) {
                const point = p256.Point.fromBytes(bytes.slice(2)).toBytes(false);
                return { kty: "EC", crv: "P-256", x: base64url.encode(point.slice(1, 33)), y: base64url.encode(point.slice(33)) };
            }
            throw new Error("Unsupported did:key codec");
        }
        if (did.startsWith("did:web:")) {
            const parts = did.slice(8).split(":").map(decodeURIComponent);
            const url = `https://${parts[0]}/${parts.length === 1 ? ".well-known/" : `${parts.slice(1).join("/")}/`}did.json`;
            const document = didDocumentSchema.parse(await this.fetchJson(url));
            if (document.id !== did) throw new Error("DID document id mismatch");
            const methods = document.verificationMethod;
            const assertionMethods = document.assertionMethod;
            const absoluteId = (id: string) => (id.startsWith("#") ? `${did}${id}` : id);
            const assertions = assertionMethods?.map((entry) => (typeof entry === "string" ? methods?.find((candidate) => absoluteId(candidate.id) === absoluteId(entry)) : entry));
            const method = fragment ? assertions?.find((entry) => entry && absoluteId(entry.id) === didUrl) : assertions?.[0];
            if (!method?.publicKeyJwk || method.controller !== did) throw new Error("DID verification method not found");
            return this.publicKey(method.publicKeyJwk);
        }
        throw new Error("Unsupported DID method");
    }

    public publicKey(value: unknown): Jwk {
        const key = zJwk.parse(value);
        if (!key.kty || key.d || key.k || key.p || key.q) throw new Error("Expected an asymmetric public JWK");
        return key;
    }

    public async fetchJson(url: string): Promise<unknown> {
        const response = await this.fetchInstance(url, { headers: { accept: "application/json" } });
        if (!response.ok) throw new Error(`Unable to fetch metadata: HTTP ${response.status}`);
        return await response.json();
    }

    private async asymmetricKey(jwk: Jwk, algorithm: string): Promise<CryptoKey> {
        this.requireWebCrypto();
        const key = await importJWK(jwk, algorithm);
        if (key instanceof Uint8Array) throw new Error("Expected an asymmetric key");
        return key;
    }

    public async certificateKey(certificate: string | Uint8Array, algorithm: string): Promise<Jwk> {
        this.requireWebCrypto();
        const parsed = new X509Certificate(typeof certificate === "string" ? certificate : new Uint8Array(certificate));
        const now = new Date();
        if (parsed.notBefore > now || parsed.notAfter < now) throw new Error("Certificate is not valid at the current time");
        return zJwk.parse(await exportJWK(await importX509(parsed.toString("pem"), algorithm, { extractable: true })));
    }

    private async issuerKey(jwt: string): Promise<CryptoKey> {
        this.requireWebCrypto();
        const header = decodeProtectedHeader(jwt);
        const payload = decodeJwt(jwt);
        if (!header.alg || header.alg === "none") throw new Error("Unsupported JWT algorithm");
        if (header.x5c?.length) return await this.asymmetricKey(await this.certificateKey(header.x5c[0], header.alg), header.alg);
        if (payload.iss?.startsWith("did:")) {
            if (header.kid?.startsWith("did:") && header.kid.split("#")[0] !== payload.iss) throw new Error("JWT issuer does not match the signing DID");
            const didUrl = header.kid ? (header.kid.startsWith("did:") ? header.kid : `${payload.iss}#${header.kid.replace(/^#/u, "")}`) : payload.iss;
            return await this.asymmetricKey(await this.resolveDid(didUrl), header.alg);
        }
        if (!payload.iss) throw new Error("JWT issuer is missing");
        const issuer = new URL(payload.iss);
        const metadata = issuerMetadataSchema.parse(await this.fetchJson(`${issuer.origin}/.well-known/jwt-vc-issuer${issuer.pathname === "/" ? "" : issuer.pathname}`));
        if (metadata.issuer !== payload.iss) throw new Error("JWT issuer metadata mismatch");
        // JOSE enforces key type, curve, alg, kid, use and key_ops when selecting a public signing key.
        if (metadata.jwks) return await createLocalJWKSet(metadata.jwks)(header);
        if (metadata.jwks_uri) return await createRemoteJWKSet(new URL(metadata.jwks_uri), { [customFetch]: this.fetchInstance })(header);
        throw new Error("JWT issuer metadata has no JWKS");
    }

    public async verifyIssuerJwt(jwt: string): Promise<JWTPayload> {
        const key = await this.issuerKey(jwt);
        const { payload } = await jwtVerify(jwt, key);
        return payload;
    }

    public async verifyIssuerSignature(jwt: string): Promise<void> {
        const key = await this.issuerKey(jwt);
        await compactVerify(jwt, key);
    }

    public async signJwt(payload: JWTPayload, publicKey: Jwk, header: Omit<JWTHeaderParameters, "alg"> = {}): Promise<string> {
        const algorithm = this.algorithm(publicKey);
        return await new SignJWT(payload).setProtectedHeader({ ...header, alg: algorithm }).sign(await importJWK(await this.getPrivateKey(publicKey), algorithm));
    }

    public async signData(data: Uint8Array, publicKey: Jwk): Promise<Uint8Array> {
        const algorithm = this.algorithm(publicKey);
        const key = await this.asymmetricKey(publicKey.d ? publicKey : await this.getPrivateKey(publicKey), algorithm);
        return new Uint8Array(await this.requireWebCrypto().subtle.sign(algorithm === "ES256" ? { name: "ECDSA", hash: "SHA-256" } : "Ed25519", key, new Uint8Array(data)));
    }

    public async hash(data: Uint8Array, algorithm = "sha-256"): Promise<Uint8Array> {
        const normalized = algorithm.toUpperCase().replace("SHA256", "SHA-256").replace("SHA384", "SHA-384").replace("SHA512", "SHA-512");
        return new Uint8Array(await this.requireWebCrypto().subtle.digest(normalized, new Uint8Array(data)));
    }

    private async signerKey(signer: JwtSigner): Promise<Jwk> {
        if (signer.method === "jwk") {
            return this.publicKey(signer.publicJwk);
        }
        if (signer.method === "did") return await this.resolveDid(signer.didUrl);
        if (signer.method === "x5c") return await this.certificateKey(signer.x5c[0], signer.alg);
        throw new Error("Unsupported JWT signing method");
    }

    public get callbacks(): CallbackContext {
        return {
            fetch: this.fetchInstance,
            hash: (data, algorithm) => this.hash(data, algorithm),
            generateRandom: (length) => this.requireWebCrypto().getRandomValues(new Uint8Array(length)),
            clientAuthentication: clientAuthenticationNone({ clientId: "wallet" }),
            signJwt: async (signer, jwt) => {
                const signerJwk = await this.signerKey(signer);
                if (signer.alg !== this.algorithm(signerJwk)) throw new Error("Holder signature algorithm mismatch");
                return { jwt: await this.signJwt(jwt.payload, signerJwk, jwt.header), signerJwk };
            },
            verifyJwt: async (signer, jwt) => {
                try {
                    const signerJwk = await this.signerKey(signer);
                    await jwtVerify(jwt.compact, await this.asymmetricKey(signerJwk, signer.alg), { algorithms: [signer.alg] });
                    return { verified: true, signerJwk };
                } catch {
                    return { verified: false };
                }
            },
            encryptJwe: async (encryptor, data) => {
                const encryptionJwk = this.publicKey(encryptor.publicJwk);
                const encrypt = new CompactEncrypt(encoder.encode(data)).setProtectedHeader({
                    alg: encryptor.alg,
                    enc: encryptor.enc,
                    kid: encryptionJwk.kid,
                    apu: encryptor.apu,
                    apv: encryptor.apv
                });
                if (encryptor.alg.startsWith("ECDH-ES")) {
                    encrypt.setKeyManagementParameters({
                        apu: encryptor.apu ? base64url.decode(encryptor.apu) : undefined,
                        apv: encryptor.apv ? base64url.decode(encryptor.apv) : undefined
                    });
                }
                return { jwe: await encrypt.encrypt(await this.asymmetricKey(encryptionJwk, encryptor.alg)), encryptionJwk };
            },
            decryptJwe: () => {
                throw new Error("Encrypted authorization requests are not supported");
            },
            getX509CertificateMetadata: (certificate) => {
                const san = new X509Certificate(certificate).getExtension(SubjectAlternativeNameExtension);
                return {
                    sanDnsNames: san?.names.items.filter((entry) => entry.type === "dns").map((entry) => entry.value) ?? [],
                    sanUriNames: san?.names.items.filter((entry) => entry.type === "url").map((entry) => entry.value) ?? []
                };
            }
        };
    }

    public get mdocContext(): MdocContext {
        return {
            fetch: this.fetchInstance,
            crypto: {
                random: (length) => this.requireWebCrypto().getRandomValues(new Uint8Array(length)),
                digest: ({ bytes, digestAlgorithm }) => this.hash(bytes, digestAlgorithm),
                hdkf: () => {
                    throw new Error("mdoc MAC authentication is not supported");
                }
            },
            cose: {
                sign1: {
                    sign: async ({ key, toBeSigned, algorithm }) => {
                        const jwk = zJwk.parse(key.jwk);
                        const jwtAlgorithm = this.algorithm(jwk);
                        if (algorithm !== (jwtAlgorithm === "ES256" ? SignatureAlgorithm.ES256 : SignatureAlgorithm.EdDSA)) throw new Error("Unsupported mdoc signature algorithm");
                        return await this.signData(toBeSigned, jwk);
                    },
                    verify: async ({ key, signature, toBeVerified, algorithm }) => {
                        // DeviceAuth supplies only its key; issuer authentication also supplies an explicit algorithm.
                        const jwk = zJwk.parse(key.jwk);
                        const jwtAlgorithm = this.algorithm(jwk);
                        if (algorithm !== undefined && algorithm !== (jwtAlgorithm === "ES256" ? SignatureAlgorithm.ES256 : SignatureAlgorithm.EdDSA)) {
                            throw new Error("Unsupported mdoc signature algorithm");
                        }
                        return await this.requireWebCrypto().subtle.verify(
                            jwtAlgorithm === "ES256" ? { name: "ECDSA", hash: "SHA-256" } : "Ed25519",
                            await this.asymmetricKey(jwk, jwtAlgorithm),
                            new Uint8Array(signature),
                            new Uint8Array(toBeVerified)
                        );
                    }
                },
                mac0: {
                    authenticate: () => {
                        throw new Error("mdoc MAC authentication is not supported");
                    },
                    verify: () => {
                        throw new Error("mdoc MAC authentication is not supported");
                    }
                }
            },
            x509: {
                getSubjectNameField: ({ certificate, field }) => new X509Certificate(new Uint8Array(certificate)).subjectName.getField(field),
                getPublicKey: async ({ certificate, algorithm }) => {
                    if (algorithm !== SignatureAlgorithm.ES256 && algorithm !== SignatureAlgorithm.EdDSA) throw new Error("Unsupported mdoc certificate algorithm");
                    return CoseKey.fromJwk(await this.certificateKey(certificate, algorithm === SignatureAlgorithm.ES256 ? "ES256" : "EdDSA"));
                },
                // Preserve the existing policy: the supplied leaf is itself a trust anchor.
                verifyCertificateChain: ({ x5chain }) => {
                    if (!x5chain.length) throw new Error("Certificate chain is empty");
                    const leaf = new X509Certificate(new Uint8Array(x5chain[0]));
                    const now = new Date();
                    if (leaf.notBefore > now || leaf.notAfter < now) throw new Error("Certificate is not valid at the current time");
                    return Promise.resolve({ chain: [x5chain[0]] });
                },
                getCertificateData: async ({ certificate }) => {
                    const parsed = new X509Certificate(new Uint8Array(certificate));
                    return {
                        issuerName: parsed.issuer,
                        subjectName: parsed.subject,
                        serialNumber: parsed.serialNumber,
                        thumbprint: base64url.encode(new Uint8Array(await parsed.getThumbprint())),
                        notBefore: parsed.notBefore,
                        notAfter: parsed.notAfter,
                        pem: parsed.toString("pem")
                    };
                }
            }
        };
    }

    public async verifyWithKey(jwt: string, key: Jwk): Promise<boolean> {
        try {
            const algorithm = decodeProtectedHeader(jwt).alg;
            if (algorithm !== this.algorithm(key)) return false;
            await compactVerify(jwt, await this.asymmetricKey(key, algorithm), { algorithms: [algorithm] });
            return true;
        } catch {
            return false;
        }
    }
}
