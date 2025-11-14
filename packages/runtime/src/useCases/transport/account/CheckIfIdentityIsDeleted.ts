import { Result } from "@js-soft/ts-utils";
import { IdentityController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { UseCase } from "../../common/index.js";

export interface CheckIfIdentityIsDeletedResponse {
    isDeleted: boolean;
    deletionDate?: string;
}

export class CheckIfIdentityIsDeletedUseCase extends UseCase<void, CheckIfIdentityIsDeletedResponse> {
    public constructor(@Inject private readonly identityController: IdentityController) {
        super();
    }

    protected async executeInternal(): Promise<Result<CheckIfIdentityIsDeletedResponse>> {
        const result = await this.identityController.checkIfIdentityIsDeleted();

        if (result.isError) return Result.fail(result.error);

        return Result.ok(result.value);
    }
}
