import { Result } from "@js-soft/ts-utils";
import { IncomingRequestsController, LocalRequest } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface DeleteIncomingRequestRequest {
    requestId: string;
}

class Validator extends SchemaValidator<DeleteIncomingRequestRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeleteIncomingRequestRequest"));
    }
}

export class DeleteIncomingRequestUseCase extends UseCase<DeleteIncomingRequestRequest, void> {
    public constructor(
        @Inject private readonly incomingRequestsController: IncomingRequestsController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: DeleteIncomingRequestRequest): Promise<Result<void>> {
        const localRequest = await this.incomingRequestsController.getIncomingRequest(CoreId.from(request.requestId));
        if (!localRequest) {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalRequest));
        }

        await this.incomingRequestsController.delete(localRequest);

        await this.accountController.syncDatawallet();

        return Result.ok(undefined);
    }
}
