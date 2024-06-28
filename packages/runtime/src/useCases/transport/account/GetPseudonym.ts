import { Result } from "@js-soft/ts-utils";
import { AccountController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { UseCase } from "../../common";

export class GetPseudonymUseCase extends UseCase<void, string> {
    public constructor(@Inject private readonly accountController: AccountController) {
        super();
    }

    protected async executeInternal(): Promise<Result<string>> {
        const pseudonym = await this.accountController.info.get("pseudonym");
        return Result.ok(pseudonym);
    }
}
