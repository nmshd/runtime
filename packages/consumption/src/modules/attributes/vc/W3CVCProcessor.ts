// @ts-expect-error
import { contexts as dataIntegrityContexts } from "@digitalbazaar/data-integrity-context";
// @ts-expect-error
import { securityLoader } from "@digitalbazaar/security-document-loader";
// @ts-expect-error
import { contexts as bitstringStatusListContexts } from "@digitalbazaar/vc-bitstring-status-list-context";
import { BitstringStatusListEntryCreationParameters, StatusListEntryCreationParameters, SupportedStatusListTypes } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import axios from "axios";
import { AbstractVCProcessor } from "./AbstractVCProcessor";
// @ts-expect-error
import * as eddsa2022CryptoSuite from "@digitalbazaar/eddsa-2022-cryptosuite";
// @ts-expect-error
import { DataIntegrityProof } from "@digitalbazaar/data-integrity";
import { CoreBuffer } from "@nmshd/crypto";
// @ts-expect-error
import * as vc from "@digitalbazaar/vc";
// @ts-expect-error
import { BitstringStatusList, checkStatus, createCredential, VC_BSL_VC_V2_CONTEXT } from "@digitalbazaar/vc-bitstring-status-list";
// @ts-expect-error
import * as jsonld from "jsonld";

export class W3CVCProcessor extends AbstractVCProcessor<any> {
    private eddsa2022CryptoSuite: any;
    private documentLoader: any;

    public override async revokeCredential(credential: Record<string, any>): Promise<unknown> {
        if (!credential.credentialStatus) throw new Error("Can't revoke credential without credential status");
        if (credential.credentialStatus.type !== "BitstringStatusListEntry") throw new Error("unsupported status type");

        const statusListCredential = (await axios.get(credential.credentialStatus.statusListCredential)).data;
        const statusList = await BitstringStatusList.decode({ encodedList: statusListCredential.credentialSubject.encodedList });
        statusList.setStatus(Number(credential.credentialStatus.statusListIndex), true);
        return await this.createStatusList({ type: SupportedStatusListTypes.BitstringStatusList, uri: statusListCredential.id, data: statusList });
    }

    public override async init(): Promise<this> {
        const documentLoader = securityLoader();
        documentLoader.addDocuments({ documents: dataIntegrityContexts });
        documentLoader.addDocuments({ documents: bitstringStatusListContexts });
        documentLoader.setProtocolHandler({
            protocol: "http",
            handler: {
                async get({ url }: { url: string }) {
                    return (await axios.get(url)).data;
                }
            }
        });
        this.documentLoader = documentLoader.build();

        this.eddsa2022CryptoSuite = eddsa2022CryptoSuite.cryptosuite;
        this.eddsa2022CryptoSuite.canonize = this.canonize;
        return await Promise.resolve(this);
    }

    public override async issue(
        data: object,
        subjectDid: string,
        statusList?: StatusListEntryCreationParameters
    ): Promise<{ credential: unknown; statusListCredential?: unknown }> {
        if (statusList && statusList.type !== SupportedStatusListTypes.BitstringStatusList) throw new Error("unsupported status list");

        const issuanceDate = CoreDate.utc().toString();
        const enrichedData = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential"],
            issuer: this.issuerId,
            issuanceDate,
            credentialSubject: { ...data, id: subjectDid }
        };

        if (statusList) {
            Object.assign(enrichedData, {
                credentialStatus: {
                    type: "BitstringStatusListEntry",
                    statusListIndex: "0",
                    statusListCredential: statusList.uri,
                    statusPurpose: "revocation"
                }
            });
            enrichedData["@context"].push("https://www.w3.org/ns/credentials/status/v1");
        }

        const statusListCredential = await this.createStatusList(statusList);

        const credential = await this.sign(enrichedData);

        return { credential, statusListCredential };
    }

    private async createStatusList(statusList?: BitstringStatusListEntryCreationParameters): Promise<unknown> {
        if (!statusList) return undefined;
        const list = statusList.data ?? new BitstringStatusList({ length: 8 });
        const statusPurpose = "revocation";

        const credential = await createCredential({
            id: statusList.uri,
            list,
            statusPurpose,
            context: VC_BSL_VC_V2_CONTEXT
        });

        const completedCredential = { ...credential, issuer: this.issuerId };

        return await this.sign(completedCredential);
    }

    private async sign(data: unknown): Promise<unknown> {
        const signer = {
            sign: async (data: any) => (await this.accountController.identity.sign(CoreBuffer.from(data.data))).signature.buffer,
            algorithm: "Ed25519",
            id: this.issuerVerificationMethod
        };

        const suite = new DataIntegrityProof({ signer, cryptosuite: this.eddsa2022CryptoSuite });
        return await vc.issue({ credential: data, suite, documentLoader: this.documentLoader });
    }

    public override async verify(data: any): Promise<{ isSuccess: false } | { isSuccess: true; payload: Record<string, unknown>; subject?: string; issuer: string }> {
        const suite = new DataIntegrityProof({ cryptosuite: this.eddsa2022CryptoSuite });

        const verificationResult = await vc.verifyCredential({
            credential: data,
            suite,
            documentLoader: this.documentLoader,
            checkStatus: async ({ credential, documentLoader, suite, verifyBitstringStatusListCredential = true, verifyMatchingIssuers = true }: any = {}) => {
                const statusResult = await checkStatus({
                    credential,
                    documentLoader,
                    suite,
                    verifyBitstringStatusListCredential,
                    verifyMatchingIssuers
                });
                if (statusResult.verified === false) return statusResult;
                if (statusResult.results.some((result: any) => result.status === true)) statusResult.verified = false;

                return statusResult;
            }
        });

        const verificationSuccessful = verificationResult.verified;
        if (verificationSuccessful) {
            return {
                isSuccess: true,
                payload: data.credentialSubject,
                subject: data.credentialSubject.id,
                issuer: data.issuer
            };
        }

        return { isSuccess: false };
    }

    // Disable safe mode of canonization - otherwise enmeshed's @type is misinterpreted as JSON-LD's @type causing an error because it's not a URL
    private async canonize(input: Record<string, unknown>, options: Record<string, unknown>) {
        return await jsonld.canonize(input, {
            ...options,
            algorithm: "URDNA2015",
            format: "application/n-quads",
            safe: false
        });
    }
}
