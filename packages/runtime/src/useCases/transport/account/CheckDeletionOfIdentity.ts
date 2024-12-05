import { Result } from "@js-soft/ts-utils";
import { IdentityController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { UseCase } from "../../common";

export interface CheckDeletionOfIdentityResponse {
    isDeleted: boolean;
    deletionDate?: string;
}

export class CheckDeletionOfIdentityUseCase extends UseCase<void, CheckDeletionOfIdentityResponse> {
    public constructor(@Inject private readonly identityController: IdentityController) {
        super();
    }

    protected async executeInternal(): Promise<Result<CheckDeletionOfIdentityResponse>> {
        const result = await this.identityController.checkDeletionOfIdentity();

        if (result.isError) return Result.fail(result.error);

        return Result.ok(result.value);
    }
}
