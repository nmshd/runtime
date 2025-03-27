import { StatusListEntryCreationParameters } from "@nmshd/content";
import { CoreDate } from "@nmshd/core-types";
import { CoreBuffer } from "@nmshd/crypto";
import { AccountController } from "@nmshd/transport";

export abstract class AbstractVCProcessor<VCType> {
    public constructor(protected readonly accountController: AccountController) {}

    protected get issuerId(): string {
        const multikeyPublic = `z${CoreBuffer.from([0xed, 0x01]).append(this.accountController.identity.identity.publicKey.publicKey).toBase58()}`;
        return `did:key:${multikeyPublic}`;
    }
    protected get issuerVerificationMethod(): string {
        const keyPart = this.issuerId.split(":").at(-1);
        return `${this.issuerId}#${keyPart}`;
    }

    public abstract init(): Promise<this>;
    public abstract issue(
        data: unknown,
        subjectDid: string,
        statusList?: StatusListEntryCreationParameters,
        expiresAt?: CoreDate
    ): Promise<{ credential: VCType; statusListCredential?: unknown }>;
    public abstract verify(data: VCType): Promise<
        | { isSuccess: false }
        | {
              isSuccess: true;
              payload: Record<string, unknown>;
              subject?: string;
              issuer: string;
          }
    >;

    public abstract revokeCredential(credential: unknown): Promise<unknown>;
    public abstract getExpiration(credential: unknown): Promise<CoreDate | undefined>;
}
