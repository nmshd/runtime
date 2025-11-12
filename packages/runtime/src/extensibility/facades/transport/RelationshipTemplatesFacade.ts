import { Result } from "@js-soft/ts-utils";
import { RelationshipTemplateDTO, TokenDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import {
    CreateOwnRelationshipTemplateRequest,
    CreateOwnRelationshipTemplateUseCase,
    CreateTokenForOwnRelationshipTemplateRequest,
    CreateTokenForOwnRelationshipTemplateUseCase,
    DeleteRelationshipTemplateRequest,
    DeleteRelationshipTemplateUseCase,
    GetRelationshipTemplateRequest,
    GetRelationshipTemplateUseCase,
    GetRelationshipTemplatesRequest,
    GetRelationshipTemplatesUseCase,
    LoadPeerRelationshipTemplateRequest,
    LoadPeerRelationshipTemplateUseCase
} from "../../../useCases/index.js";

export class RelationshipTemplatesFacade {
    public constructor(
        @Inject private readonly createOwnRelationshipTemplateUseCase: CreateOwnRelationshipTemplateUseCase,
        @Inject private readonly loadPeerRelationshipTemplateUseCase: LoadPeerRelationshipTemplateUseCase,
        @Inject private readonly getRelationshipTemplatesUseCase: GetRelationshipTemplatesUseCase,
        @Inject private readonly getRelationshipTemplateUseCase: GetRelationshipTemplateUseCase,
        @Inject private readonly deleteRelationshipTemplateUseCase: DeleteRelationshipTemplateUseCase,
        @Inject private readonly createTokenForOwnRelationshipTemplateUseCase: CreateTokenForOwnRelationshipTemplateUseCase
    ) {}

    public async createOwnRelationshipTemplate(request: CreateOwnRelationshipTemplateRequest): Promise<Result<RelationshipTemplateDTO>> {
        return await this.createOwnRelationshipTemplateUseCase.execute(request);
    }

    public async loadPeerRelationshipTemplate(request: LoadPeerRelationshipTemplateRequest): Promise<Result<RelationshipTemplateDTO>> {
        return await this.loadPeerRelationshipTemplateUseCase.execute(request);
    }

    public async getRelationshipTemplates(request: GetRelationshipTemplatesRequest): Promise<Result<RelationshipTemplateDTO[]>> {
        return await this.getRelationshipTemplatesUseCase.execute(request);
    }

    public async getRelationshipTemplate(request: GetRelationshipTemplateRequest): Promise<Result<RelationshipTemplateDTO>> {
        return await this.getRelationshipTemplateUseCase.execute(request);
    }

    public async deleteRelationshipTemplate(request: DeleteRelationshipTemplateRequest): Promise<Result<void>> {
        return await this.deleteRelationshipTemplateUseCase.execute(request);
    }

    public async createTokenForOwnRelationshipTemplate(request: CreateTokenForOwnRelationshipTemplateRequest): Promise<Result<TokenDTO>> {
        return await this.createTokenForOwnRelationshipTemplateUseCase.execute(request);
    }
}
