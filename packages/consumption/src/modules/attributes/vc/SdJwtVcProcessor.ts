import { CoreBuffer, CryptoHash, CryptoHashAlgorithm, Encoding } from "@nmshd/crypto";
import { CoreCrypto } from "@nmshd/transport";
import { SDJwtVcInstance } from "@sd-jwt/sd-jwt-vc";
import { Hasher } from "@sd-jwt/types";
import didJWT from "did-jwt";
import { Resolver } from "did-resolver";
import { getResolver } from "key-did-resolver";
import { AbstractVCProcessor } from "./AbstractVCProcessor";

export class SdJwtVcProcessor extends AbstractVCProcessor<any> {
    public override async init(): Promise<this> {
        return await Promise.resolve(this);
    }

    public override async sign(data: object, subjectDid: string): Promise<unknown> {
        const multikeyPublic = `z${CoreBuffer.from([0xed, 0x01]).append(this.accountController.identity.identity.publicKey.publicKey).toBase58()}`;

        const agent = new SDJwtVcInstance({
            signer: async (string: string) => (await this.accountController.identity.sign(CoreBuffer.fromUtf8(string))).signature.toBase64URL(),
            hasher: this.hasher,
            saltGenerator: async (length: number) => (await CoreCrypto.random(length)).toString(Encoding.Hex),
            hashAlg: "sha-512",
            signAlg: "EdDSA" // https://www.iana.org/assignments/jose/jose.xhtml#web-signature-encryption-algorithms
        });

        const issuanceDate = new Date().getTime();
        const enrichedData = {
            vct: "placeholder",
            iss: `did:key:${multikeyPublic}`,
            sub: subjectDid,
            iat: issuanceDate,
            ...data
        };

        return await agent.issue(enrichedData);
    }

    public override async verify(data: any): Promise<{ isSuccess: false } | { isSuccess: true; payload: Record<string, unknown>; subject?: string; issuer: string }> {
        const didResolver = new Resolver(getResolver());

        const agent = new SDJwtVcInstance({
            verifier: async (data: string, signature: string) => {
                try {
                    await didJWT.verifyJWT(`${data}.${signature}`, { resolver: didResolver, policies: { now: new Date().getTime() } });
                    return true;
                } catch (_) {
                    return false;
                }
            },
            hasher: this.hasher
        });

        const claimKeys = await agent.keys(data);
        try {
            const payload = (await agent.verify(data, claimKeys)).payload; // check all claims sent in the credential
            return { isSuccess: true, payload, subject: payload.sub, issuer: payload.iss };
        } catch (_) {
            return { isSuccess: false };
        }
    }

    private readonly hasher: Hasher = async (data: string | ArrayBuffer, alg: string) => {
        let mappedAlg: CryptoHashAlgorithm;
        switch (alg) {
            case "sha-256":
                mappedAlg = CryptoHashAlgorithm.SHA256;
                break;
            case "sha-512":
                mappedAlg = CryptoHashAlgorithm.SHA512;
                break;
            case "blake2b-512":
                mappedAlg = CryptoHashAlgorithm.BLAKE2B;
                break;
            default:
                throw new Error("unsupported hash algorithm");
        }

        return (await CryptoHash.hash(CoreBuffer.from(data), mappedAlg)).buffer;
    };
}
