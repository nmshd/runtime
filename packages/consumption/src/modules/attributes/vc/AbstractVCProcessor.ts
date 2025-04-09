import { StatusListEntryCreationParameters } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { AccountController } from "@nmshd/transport";
import axios from "axios";

export abstract class AbstractVCProcessor<VCType> {
    public constructor(protected readonly accountController: AccountController) {}

    public init(): this {
        return this;
    }
    public abstract issue(
        data: unknown,
        subjectDid: string,
        statusList?: StatusListEntryCreationParameters,
        expiresAt?: CoreDate
    ): Promise<{ credential: VCType; statusListCredential?: unknown }>;
    public abstract credentialTypeSpecificVerify(data: VCType): Promise<
        | { isSuccess: false }
        | {
              isSuccess: true;
              payload: Record<string, unknown>;
              subject?: string;
              issuer: string;
          }
    >;
    public async verify(data: VCType): Promise<
        | { isSuccess: false }
        | {
              isSuccess: true;
              payload: Record<string, unknown>;
              subject?: string;
              issuer: string;
          }
    > {
        const verificationResult = await this.credentialTypeSpecificVerify(data);
        if (!verificationResult.isSuccess) return verificationResult;
        if (!(await this.isIssuerTrusted(verificationResult.issuer))) return { isSuccess: false };
        return verificationResult;
    }

    public abstract revokeCredential(credential: unknown): Promise<unknown>;
    public abstract getExpiration(credential: unknown): Promise<CoreDate | undefined>;

    private async isIssuerTrusted(issuerId: string): Promise<boolean> {
        // use EBSI's trusted issuer list https://hub.ebsi.eu/vc-framework/trust-model/issuer-trust-model-v3 and the API is https://hub.ebsi.eu/apis/pilot/trusted-issuers-registry/v5/get-issuer
        // - but e. g. EUDIW considers ETSI TS 119 612 lists https://eu-digital-identity-wallet.github.io/eudi-doc-architecture-and-reference-framework/1.4.0/annexes/annex-2/annex-2-high-level-requirements/#a2331-topic-31-pid-provider-wallet-provider-attestation-provider-and-access-certificate-authority-notification-and-publication

        const safeIssuerId = issuerId.replaceAll(":", "/");
        const issuerListBaseUrl = "http://localhost:44445/issuer_list";

        try {
            const returnValue = (await axios.get(`${issuerListBaseUrl}/${safeIssuerId}`)).status === 200;

            return returnValue;
        } catch (_) {
            return false;
        }
    }
}
