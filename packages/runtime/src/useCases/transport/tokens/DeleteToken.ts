import { Result } from "@js-soft/ts-utils";
import { CoreId } from "@nmshd/core-types";
import { Token, TokenController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, SchemaRepository, SchemaValidator, TokenIdString, UseCase } from "../../common";

export interface DeleteTokenRequest {
    tokenId: TokenIdString;
}

class Validator extends SchemaValidator<DeleteTokenRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeleteTokenRequest"));
    }
}

export class DeleteTokenUseCase extends UseCase<DeleteTokenRequest, void> {
    public constructor(
        @Inject private readonly tokenController: TokenController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DeleteTokenRequest): Promise<Result<void>> {
        const token = await this.tokenController.getToken(CoreId.from(request.tokenId));
        if (!token) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Token));
        }

        await this.tokenController.delete(token);

        return Result.ok(undefined);
    }
}
