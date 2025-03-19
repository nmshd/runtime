import { SupportedVCTypes } from "@nmshd/content";
import { AccountController } from "@nmshd/transport";
import { SdJwtVcProcessor } from "./SdJwtVcProcessor";
import { W3CVCProcessor } from "./W3CVCProcessor";

export abstract class AbstractVCProcessor<VCType> {
    public constructor(protected readonly accountController: AccountController) {}

    public abstract init(): Promise<this>;
    public abstract sign(data: unknown, subjectDid: string): Promise<VCType>;
    public abstract verify(data: VCType): Promise<boolean>;

    public static async getVCProcessor(type: SupportedVCTypes, accountController: AccountController): Promise<AbstractVCProcessor<unknown>> {
        let vcProcessor: AbstractVCProcessor<unknown>;
        switch (type) {
            case SupportedVCTypes.W3CVC:
                vcProcessor = new W3CVCProcessor(accountController);

            case SupportedVCTypes.SdJwtVc:
                vcProcessor = new SdJwtVcProcessor(accountController);
        }
        return await vcProcessor.init();
    }
}
