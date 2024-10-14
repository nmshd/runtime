import { Result } from "@js-soft/ts-utils";
import { Inject } from "@nmshd/typescript-ioc";
import { IdentityDeletionProcessDTO } from "../../../types";
import {
    ApproveIdentityDeletionProcessUseCase,
    CancelIdentityDeletionProcessUseCase,
    GetActiveIdentityDeletionProcessUseCase,
    GetIdentityDeletionProcessesUseCase,
    GetIdentityDeletionProcessRequest,
    GetIdentityDeletionProcessUseCase,
    InitiateIdentityDeletionProcessUseCase,
    RejectIdentityDeletionProcessUseCase
} from "../../../useCases";

export class IdentityDeletionProcessesFacade {
    public constructor(
        @Inject private readonly approveIdentityDeletionProcessUseCase: ApproveIdentityDeletionProcessUseCase,
        @Inject private readonly rejectIdentityDeletionProcessUseCase: RejectIdentityDeletionProcessUseCase,
        @Inject private readonly initiateIdentityDeletionProcessUseCase: InitiateIdentityDeletionProcessUseCase,
        @Inject private readonly cancelIdentityDeletionProcessUseCase: CancelIdentityDeletionProcessUseCase,
        @Inject private readonly getIdentityDeletionProcessUseCase: GetIdentityDeletionProcessUseCase,
        @Inject private readonly getIdentityDeletionProcessesUseCase: GetIdentityDeletionProcessesUseCase,
        @Inject private readonly getActiveIdentityDeletionProcessUseCase: GetActiveIdentityDeletionProcessUseCase
    ) {}

    public async approveIdentityDeletionProcess(): Promise<Result<IdentityDeletionProcessDTO>> {
        return await this.approveIdentityDeletionProcessUseCase.execute();
    }

    public async rejectIdentityDeletionProcess(): Promise<Result<IdentityDeletionProcessDTO>> {
        return await this.rejectIdentityDeletionProcessUseCase.execute();
    }

    public async initiateIdentityDeletionProcess(): Promise<Result<IdentityDeletionProcessDTO>> {
        return await this.initiateIdentityDeletionProcessUseCase.execute();
    }

    public async cancelIdentityDeletionProcess(): Promise<Result<IdentityDeletionProcessDTO>> {
        return await this.cancelIdentityDeletionProcessUseCase.execute();
    }

    public async getIdentityDeletionProcess(request: GetIdentityDeletionProcessRequest): Promise<Result<IdentityDeletionProcessDTO>> {
        return await this.getIdentityDeletionProcessUseCase.execute(request);
    }

    public async getActiveIdentityDeletionProcess(): Promise<Result<IdentityDeletionProcessDTO>> {
        return await this.getActiveIdentityDeletionProcessUseCase.execute();
    }

    public async getIdentityDeletionProcesses(): Promise<Result<IdentityDeletionProcessDTO[]>> {
        return await this.getIdentityDeletionProcessesUseCase.execute();
    }
}
