import { Result } from "@js-soft/ts-utils";
import { OutgoingRequestsController } from "@nmshd/consumption";
import { CoreId } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RequestIdString, UseCase } from "../../common";

export interface DiscardOutgoingRequestRequest {
    id: RequestIdString;
}

// class Validator extends SchemaValidator<DiscardOutgoingRequestRequest> {
//     public constructor(@Inject schemaRepository: SchemaRepository) {
//         super(schemaRepository.getSchema("DiscardOutgoingRequestRequest"));
//     }
// }

export class DiscardOutgoingRequestUseCase extends UseCase<DiscardOutgoingRequestRequest, void> {
    public constructor(@Inject private readonly outgoingRequestsController: OutgoingRequestsController) {
        super();
    }

    protected async executeInternal(request: DiscardOutgoingRequestRequest): Promise<Result<void>> {
        await this.outgoingRequestsController.discardOutgoingRequest(CoreId.from(request.id));
        return Result.ok(undefined);
    }
}
