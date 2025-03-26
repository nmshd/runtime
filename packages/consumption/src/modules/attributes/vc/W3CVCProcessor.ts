import { BitstringStatusListEntryCreationParameters, StatusListEntryCreationParameters, SupportedStatusListTypes } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { AbstractVCProcessor } from "./AbstractVCProcessor";
import { init, issueStatusList, revokeCredential, sign, verify } from "./w3cUtils/wrapper";

export class W3CVCProcessor extends AbstractVCProcessor<any> {
    public override async revokeCredential(credential: Record<string, any>): Promise<unknown> {
        return await revokeCredential(credential, this.accountController);
    }

    public override async init(): Promise<this> {
        await init();
        return this;
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
        const credential = await sign(enrichedData, this.accountController, this.issuerVerificationMethod);

        return { credential, statusListCredential };
    }

    private async createStatusList(statusList?: BitstringStatusListEntryCreationParameters): Promise<unknown> {
        if (!statusList) return undefined;
        return await issueStatusList(statusList.uri, this.accountController, this.issuerId, this.issuerVerificationMethod);
    }

    public override async verify(data: any): Promise<{ isSuccess: false } | { isSuccess: true; payload: Record<string, unknown>; subject?: string; issuer: string }> {
        const verificationResult = await verify(data);

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
}
