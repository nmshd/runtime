import { AccountController } from "@nmshd/transport";

export abstract class AbstractVCProcessor<VCType> {
    public constructor(protected readonly accountController: AccountController) {}

    public abstract init(): Promise<this>;
    public abstract sign(data: unknown, subjectDid: string): Promise<VCType>;
    public abstract verify(data: VCType): Promise<boolean>;
}
