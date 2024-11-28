import { Result } from "@js-soft/ts-utils";
import { IdentityController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { UseCase } from "../../common";

export interface CheckIdentityDeletionForUsernameResponse {
    isDeleted: boolean;
    deletionDate?: string;
}

export class CheckIdentityDeletionForUsernameUseCase extends UseCase<void, CheckIdentityDeletionForUsernameResponse> {
    public constructor(@Inject private readonly identityController: IdentityController) {
        super();
    }

    protected async executeInternal(): Promise<Result<CheckIdentityDeletionForUsernameResponse>> {
        const result = await this.identityController.checkIdentityDeletionForUsername();

        if (result.isError) return Result.fail(result.error);

        return Result.ok(result.value);
    }
}
