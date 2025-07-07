import { Result } from "@js-soft/ts-utils";
import { DraftDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import {
    CreateDraftRequest,
    CreateDraftUseCase,
    DeleteDraftRequest,
    DeleteDraftUseCase,
    GetDraftRequest,
    GetDraftsRequest,
    GetDraftsUseCase,
    GetDraftUseCase,
    UpdateDraftRequest,
    UpdateDraftUseCase
} from "../../../useCases";

export class DraftsFacade {
    public constructor(
        @Inject private readonly createDraftUseCase: CreateDraftUseCase,
        @Inject private readonly deleteDraftUseCase: DeleteDraftUseCase,
        @Inject private readonly getDraftUseCase: GetDraftUseCase,
        @Inject private readonly getDraftsUseCase: GetDraftsUseCase,
        @Inject private readonly updateDraftUseCase: UpdateDraftUseCase
    ) {}

    public async createDraft(request: CreateDraftRequest): Promise<Result<DraftDTO>> {
        return await this.createDraftUseCase.execute(request);
    }

    public async deleteDraft(request: DeleteDraftRequest): Promise<Result<void>> {
        return await this.deleteDraftUseCase.execute(request);
    }

    public async getDraft(request: GetDraftRequest): Promise<Result<DraftDTO>> {
        return await this.getDraftUseCase.execute(request);
    }

    public async getDrafts(request: GetDraftsRequest): Promise<Result<DraftDTO[]>> {
        return await this.getDraftsUseCase.execute(request);
    }

    public async updateDraft(request: UpdateDraftRequest): Promise<Result<DraftDTO>> {
        return await this.updateDraftUseCase.execute(request);
    }
}
