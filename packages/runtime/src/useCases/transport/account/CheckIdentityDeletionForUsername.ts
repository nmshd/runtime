import { Result } from "@js-soft/ts-utils";
import { IdentityController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface CheckIdentityDeletionForUsernameRequest {
    username: string; // device username
}

class Validator extends SchemaValidator<CheckIdentityDeletionForUsernameRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CheckIdentityDeletionForUsernameRequest"));
    }
}

export interface CheckIdentityDeletionForUsernameResponse {
    isDeleted: boolean;
    deletionDate?: string;
}

export class CheckIdentityDeletionForUsernameUseCase extends UseCase<CheckIdentityDeletionForUsernameRequest, CheckIdentityDeletionForUsernameResponse> {
    public constructor(
        @Inject private readonly identityController: IdentityController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CheckIdentityDeletionForUsernameRequest): Promise<Result<CheckIdentityDeletionForUsernameResponse>> {
        const result = await this.identityController.checkIdentityDeletionForUsername(request.username);
        if (result.isError) return Result.fail(result.error);

        return Result.ok(result.value);
    }
}
