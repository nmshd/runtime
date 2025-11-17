import { Result } from "@js-soft/ts-utils";
import { OutgoingRequestsController } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { Inject } from "@nmshd/typescript-ioc";
import { RequestIdString, UseCase } from "../../common/index.js";

export interface DiscardOutgoingRequestRequest {
    id: RequestIdString;
}

export class DiscardOutgoingRequestUseCase extends UseCase<DiscardOutgoingRequestRequest, void> {
    public constructor(@Inject private readonly outgoingRequestsController: OutgoingRequestsController) {
        super();
    }

    protected async executeInternal(request: DiscardOutgoingRequestRequest): Promise<Result<void>> {
        await this.outgoingRequestsController.discardOutgoingRequest(CoreId.from(request.id));
        return Result.ok(undefined);
    }
}
