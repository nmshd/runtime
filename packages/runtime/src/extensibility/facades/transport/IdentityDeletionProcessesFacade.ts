import { Result } from "@js-soft/ts-utils";
import { IdentityDeletionProcessDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import {
    CancelIdentityDeletionProcessUseCase,
    GetActiveIdentityDeletionProcessUseCase,
    GetIdentityDeletionProcessesUseCase,
    GetIdentityDeletionProcessRequest,
    GetIdentityDeletionProcessUseCase,
    InitiateIdentityDeletionProcessRequest,
    InitiateIdentityDeletionProcessUseCase
} from "../../../useCases";

export class IdentityDeletionProcessesFacade {
    public constructor(
        @Inject private readonly initiateIdentityDeletionProcessUseCase: InitiateIdentityDeletionProcessUseCase,
        @Inject private readonly cancelIdentityDeletionProcessUseCase: CancelIdentityDeletionProcessUseCase,
        @Inject private readonly getIdentityDeletionProcessUseCase: GetIdentityDeletionProcessUseCase,
        @Inject private readonly getIdentityDeletionProcessesUseCase: GetIdentityDeletionProcessesUseCase,
        @Inject private readonly getActiveIdentityDeletionProcessUseCase: GetActiveIdentityDeletionProcessUseCase
    ) {}

    public async initiateIdentityDeletionProcess(request: InitiateIdentityDeletionProcessRequest = {}): Promise<Result<IdentityDeletionProcessDTO>> {
        return await this.initiateIdentityDeletionProcessUseCase.execute(request);
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
