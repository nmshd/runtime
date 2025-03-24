import { StatusListEntryCreationParameters } from "@nmshd/content";
import { CoreBuffer } from "@nmshd/crypto";
import { AccountController } from "@nmshd/transport";

export abstract class AbstractVCProcessor<VCType> {
    public constructor(protected readonly accountController: AccountController) {}

    protected get issuerId(): string {
        const multikeyPublic = `z${CoreBuffer.from([0xed, 0x01]).append(this.accountController.identity.identity.publicKey.publicKey).toBase58()}`;
        return `did:key:${multikeyPublic}`;
    }
    public abstract init(): Promise<this>;
    public abstract sign(data: unknown, subjectDid: string, statusList?: StatusListEntryCreationParameters): Promise<{ credential: VCType; statusListCredential?: unknown }>;
    public abstract verify(data: VCType): Promise<
        | { isSuccess: false }
        | {
              isSuccess: true;
              payload: Record<string, unknown>;
              subject?: string;
              issuer: string;
          }
    >;
}
