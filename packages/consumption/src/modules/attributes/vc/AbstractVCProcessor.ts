import { SupportedVCTypes } from "@nmshd/content";
import { AccountController } from "@nmshd/transport";
import { SdJwtVcProcessor } from "./SdJwtVcProcessor";
import { W3CVCProcessor } from "./W3CVCProcessor";

export abstract class AbstractVCProcessor<VCType> {
    public constructor(protected readonly accountController: AccountController) {}

    public abstract init(): Promise<this>;
    public abstract sign(data: unknown, subjectDid: string): Promise<VCType>;
    public abstract verify(data: VCType): Promise<boolean>;

    public static getVCProcessor(type: SupportedVCTypes, accountController: AccountController): AbstractVCProcessor<unknown> {
        switch (type) {
            case SupportedVCTypes.W3CVC:
                return new W3CVCProcessor(accountController);

            case SupportedVCTypes.SdJwtVc:
                return new SdJwtVcProcessor(accountController);
        }
    }
}
