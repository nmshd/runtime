import { Result } from "@js-soft/ts-utils";
import { Inject } from "typescript-ioc";
import { RelationshipTemplateDTO, TokenDTO } from "../../../types";
import {
    CreateOwnRelationshipTemplateRequest,
    CreateOwnRelationshipTemplateUseCase,
    CreateQRCodeForOwnTemplateRequest,
    CreateQRCodeForOwnTemplateResponse,
    CreateQRCodeForOwnTemplateUseCase,
    CreateTokenForOwnTemplateRequest,
    CreateTokenForOwnTemplateUseCase,
    CreateTokenQRCodeForOwnTemplateRequest,
    CreateTokenQRCodeForOwnTemplateResponse,
    CreateTokenQRCodeForOwnTemplateUseCase,
    GetRelationshipTemplateRequest,
    GetRelationshipTemplatesRequest,
    GetRelationshipTemplatesUseCase,
    GetRelationshipTemplateUseCase,
    LoadPeerRelationshipTemplateRequest,
    LoadPeerRelationshipTemplateUseCase
} from "../../../useCases";

export class RelationshipTemplatesFacade {
    public constructor(
        @Inject private readonly createOwnRelationshipTemplateUseCase: CreateOwnRelationshipTemplateUseCase,
        @Inject private readonly loadPeerRelationshipTemplateUseCase: LoadPeerRelationshipTemplateUseCase,
        @Inject private readonly getRelationshipTemplatesUseCase: GetRelationshipTemplatesUseCase,
        @Inject private readonly getRelationshipTemplateUseCase: GetRelationshipTemplateUseCase,
        @Inject private readonly createQRCodeForOwnTemplateUseCase: CreateQRCodeForOwnTemplateUseCase,
        @Inject private readonly createTokenQRCodeForOwnTemplateUseCase: CreateTokenQRCodeForOwnTemplateUseCase,
        @Inject private readonly createTokenForOwnTemplateUseCase: CreateTokenForOwnTemplateUseCase
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

    public async createQRCodeForOwnTemplate(request: CreateQRCodeForOwnTemplateRequest): Promise<Result<CreateQRCodeForOwnTemplateResponse>> {
        return await this.createQRCodeForOwnTemplateUseCase.execute(request);
    }

    public async createTokenQRCodeForOwnTemplate(request: CreateTokenQRCodeForOwnTemplateRequest): Promise<Result<CreateTokenQRCodeForOwnTemplateResponse>> {
        return await this.createTokenQRCodeForOwnTemplateUseCase.execute(request);
    }

    public async createTokenForOwnTemplate(request: CreateTokenForOwnTemplateRequest): Promise<Result<TokenDTO>> {
        return await this.createTokenForOwnTemplateUseCase.execute(request);
    }
}
