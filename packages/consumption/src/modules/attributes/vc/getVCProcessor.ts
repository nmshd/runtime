import { SupportedVCTypes } from "@nmshd/content";
import { AccountController } from "@nmshd/transport";
import { AbstractVCProcessor } from "./AbstractVCProcessor";
import { SdJwtVcProcessor } from "./SdJwtVcProcessor";
import { W3CVCProcessor } from "./W3CVCProcessor";

export async function getVCProcessor(type: SupportedVCTypes, accountController: AccountController): Promise<AbstractVCProcessor<unknown>> {
    let vcProcessor: AbstractVCProcessor<unknown>;
    switch (type) {
        case SupportedVCTypes.W3CVC:
            vcProcessor = new W3CVCProcessor(accountController);
            break;
        case SupportedVCTypes.SdJwtVc:
            vcProcessor = new SdJwtVcProcessor(accountController);
    }
    return await vcProcessor.init();
}
