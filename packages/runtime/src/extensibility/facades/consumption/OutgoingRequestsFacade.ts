import { Result } from "@js-soft/ts-utils";
import { Inject } from "typescript-ioc";
import { LocalRequestDTO, RequestValidationResultDTO } from "../../../types";
import {
    CanCreateOutgoingRequestRequest,
    CanCreateOutgoingRequestUseCase,
    CompleteOutgoingRequestRequest,
    CompleteOutgoingRequestUseCase,
    CreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseRequest,
    CreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseUseCase,
    CreateOutgoingRequestRequest,
    CreateOutgoingRequestUseCase,
    DiscardOutgoingRequestRequest,
    DiscardOutgoingRequestUseCase,
    GetOutgoingRequestRequest,
    GetOutgoingRequestsRequest,
    GetOutgoingRequestsUseCase,
    GetOutgoingRequestUseCase,
    SentOutgoingRequestRequest,
    SentOutgoingRequestUseCase
} from "../../../useCases";

export class OutgoingRequestsFacade {
    public constructor(
        @Inject private readonly canCreateUseCase: CanCreateOutgoingRequestUseCase,
        @Inject private readonly createUseCase: CreateOutgoingRequestUseCase,
        @Inject private readonly sentUseCase: SentOutgoingRequestUseCase,
        @Inject private readonly createAndCompleteFromRelationshipTemplateResponseUseCase: CreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseUseCase,
        @Inject private readonly completeUseCase: CompleteOutgoingRequestUseCase,
        @Inject private readonly getRequestUseCase: GetOutgoingRequestUseCase,
        @Inject private readonly getRequestsUseCase: GetOutgoingRequestsUseCase,
        @Inject private readonly discardRequestUseCase: DiscardOutgoingRequestUseCase
    ) {}

    public async canCreate(request: CanCreateOutgoingRequestRequest): Promise<Result<RequestValidationResultDTO>> {
        return await this.canCreateUseCase.execute(request);
    }

    public async create(request: CreateOutgoingRequestRequest): Promise<Result<LocalRequestDTO>> {
        return await this.createUseCase.execute(request);
    }

    public async createAndCompleteFromRelationshipTemplateResponse(
        request: CreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseRequest
    ): Promise<Result<LocalRequestDTO>> {
        return await this.createAndCompleteFromRelationshipTemplateResponseUseCase.execute(request);
    }

    public async sent(request: SentOutgoingRequestRequest): Promise<Result<LocalRequestDTO>> {
        return await this.sentUseCase.execute(request);
    }

    public async complete(request: CompleteOutgoingRequestRequest): Promise<Result<LocalRequestDTO>> {
        return await this.completeUseCase.execute(request);
    }

    public async getRequest(request: GetOutgoingRequestRequest): Promise<Result<LocalRequestDTO>> {
        return await this.getRequestUseCase.execute(request);
    }

    public async getRequests(request: GetOutgoingRequestsRequest): Promise<Result<LocalRequestDTO[]>> {
        return await this.getRequestsUseCase.execute(request);
    }

    public async discard(request: DiscardOutgoingRequestRequest): Promise<Result<void>> {
        return await this.discardRequestUseCase.execute(request);
    }
}
