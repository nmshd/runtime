import { StatusListEntryCreationParameters, SupportedStatusListTypes, TokenStatusListEntryCreationParameters } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { CoreBuffer, CryptoHash, CryptoHashAlgorithm, Encoding } from "@nmshd/crypto";
import { CoreCrypto } from "@nmshd/transport";
import { SDJwtInstance } from "@sd-jwt/core";
import { createHeaderAndPayload, getListFromStatusListJWT, StatusList, StatusListJWTHeaderParameters } from "@sd-jwt/jwt-status-list";
import { SDJwtVcInstance, SdJwtVcPayload } from "@sd-jwt/sd-jwt-vc";
import { Hasher, JwtPayload } from "@sd-jwt/types";
import axios from "axios";
import didJWT from "did-jwt";
import { Resolver } from "did-resolver";
import { getResolver } from "key-did-resolver";
import { AbstractVCProcessor } from "./AbstractVCProcessor";

export class SdJwtVcProcessor extends AbstractVCProcessor<any> {
    public override async issue(
        data: object,
        subjectDid: string,
        statusList?: StatusListEntryCreationParameters,
        expiresAt?: CoreDate
    ): Promise<{ credential: unknown; statusListCredential?: unknown }> {
        if (statusList && statusList.type !== SupportedStatusListTypes.TokenStatusList) throw new Error("unsupported status list");

        const agent = new SDJwtVcInstance({
            signer: async (string: string) => (await this.accountController.identity.sign(CoreBuffer.fromUtf8(string))).signature.toBase64URL(),
            hasher: this.hasher,
            saltGenerator: async (length: number) => (await CoreCrypto.random(length)).toString(Encoding.Hex),
            hashAlg: "sha-512",
            signAlg: "EdDSA" // https://www.iana.org/assignments/jose/jose.xhtml#web-signature-encryption-algorithms
        });

        const enrichedData = {
            vct: "placeholder",
            iss: this.accountController.identity.didKey,
            sub: subjectDid,
            iat: new Date().getTime(),
            exp: expiresAt ? new Date(expiresAt.toString()).getTime() : undefined,
            status: statusList
                ? {
                      // eslint-disable-next-line @typescript-eslint/naming-convention
                      status_list: {
                          uri: statusList.uri,
                          idx: 0
                      }
                  }
                : undefined,
            ...data
        };

        const statusListCredential = await this.createStatusList(statusList);
        const credential = await agent.issue(enrichedData);

        return { credential, statusListCredential };
    }

    private async createStatusList(statusList?: TokenStatusListEntryCreationParameters): Promise<string | undefined> {
        if (!statusList) return undefined;

        const statusListCredential = statusList.data ?? new StatusList([0], 1); // TODO: allow multiple credentials in a status list
        const payload: JwtPayload = {
            iss: this.accountController.identity.didKey,
            sub: statusList.uri,
            iat: new Date().getTime()
        };

        const header: StatusListJWTHeaderParameters = {
            alg: "EdDSA",
            typ: "statuslist+jwt"
        };

        const enrichedJWTContent = createHeaderAndPayload(statusListCredential, payload, header);
        const agent = new SDJwtInstance({
            signer: async (string: string) => (await this.accountController.identity.sign(CoreBuffer.fromUtf8(string))).signature.toBase64URL(),
            signAlg: "EdDSA",
            hasher: this.hasher,
            hashAlg: "sha-512",
            saltGenerator: async (length: number) => (await CoreCrypto.random(length)).toString(Encoding.Hex)
        });

        const signedCredential = await agent.issue(enrichedJWTContent.payload, undefined, { header: enrichedJWTContent.header });
        return signedCredential.replaceAll("~", ""); // replace trailing ~
    }

    public override async credentialTypeSpecificVerify(
        data: any
    ): Promise<{ isSuccess: false } | { isSuccess: true; payload: Record<string, unknown>; subject?: string; issuer: string }> {
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
            hasher: this.hasher,
            statusListFetcher: async (uri: string) => {
                return (await axios.get(uri)).data;
            },
            statusValidator: (status: number) => {
                if (status === 0) return Promise.resolve();
                throw new Error("Status is not valid");
            }
        });

        try {
            const claimKeys = await agent.keys(data);
            const payload = (await agent.verify(data, claimKeys)).payload; // check all claims sent in the credential
            return { isSuccess: true, payload, subject: payload.sub, issuer: payload.iss };
        } catch (_) {
            return { isSuccess: false };
        }
    }

    public async revokeCredential(credential: string): Promise<string> {
        const agent = new SDJwtInstance({
            // TODO: read the hash algorithm from the credential
            hasher: this.hasher,
            hashAlg: "sha-512"
        });

        const decodedCredential = (await agent.getClaims(credential)) as SdJwtVcPayload;
        if (!decodedCredential.status) throw new Error("no status given");

        const uri = decodedCredential.status.status_list.uri;
        const index = decodedCredential.status.status_list.idx;

        const statusList = (await axios.get(uri)).data;
        const decodedStatusList = getListFromStatusListJWT(statusList);
        decodedStatusList.setStatus(index, 1);

        return (await this.createStatusList({
            type: SupportedStatusListTypes.TokenStatusList,
            uri,
            data: decodedStatusList
        }))!;
    }

    public override async getExpiration(credential: string): Promise<CoreDate | undefined> {
        const agent = new SDJwtInstance({
            hasher: this.hasher,
            hashAlg: "sha-512"
        });

        const decodedCredential = (await agent.getClaims(credential)) as SdJwtVcPayload;
        if (decodedCredential.exp) {
            return CoreDate.from(decodedCredential.exp);
        }
        return undefined;
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
