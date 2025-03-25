import { BitstringStatusListEntryCreationParameters, StatusListEntryCreationParameters, SupportedStatusListTypes } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { AbstractVCProcessor } from "./AbstractVCProcessor";
import { init, issueStatusList, sign, verify } from "./w3cUtils/wrapper";

export class W3CVCProcessor extends AbstractVCProcessor<any> {
    public override revokeCredential(credential: unknown): Promise<unknown> {
        throw new Error("Method not implemented.");
    }

    public override async init(): Promise<this> {
        await init();
        return this;
    }

    public override async sign(data: object, subjectDid: string, statusList?: StatusListEntryCreationParameters): Promise<{ credential: unknown; statusListCredential?: unknown }> {
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
                    statusListCredential: statusList.uri
                }
            });
            enrichedData["@context"].push("https://www.w3.org/ns/credentials/status/v1");
        }

        const statusListCredential = await this.createStatusList(statusList);
        const credential = await sign(enrichedData, this.accountController);

        return { credential, statusListCredential };
    }

    private async createStatusList(statusList?: BitstringStatusListEntryCreationParameters): Promise<unknown> {
        if (!statusList) return undefined;
        return await issueStatusList(statusList.uri, this.accountController, this.issuerId);
    }

    public override async verify(data: any): Promise<{ isSuccess: false } | { isSuccess: true; payload: Record<string, unknown>; subject?: string; issuer: string }> {
        const verificationSuccessful = await verify(data);
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
