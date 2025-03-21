import { StatusListEntryCreationParameters } from "@nmshd/content";
import { AccountController } from "@nmshd/transport";

export abstract class AbstractVCProcessor<VCType> {
    public constructor(protected readonly accountController: AccountController) {}

    public abstract init(): Promise<this>;
    public abstract sign(data: unknown, subjectDid: string, statusList?: StatusListEntryCreationParameters): Promise<VCType>;
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
