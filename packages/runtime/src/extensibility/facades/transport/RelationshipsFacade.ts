import { ApplicationError, Result } from "@js-soft/ts-utils";
import { Inject } from "typescript-ioc";
import { RelationshipDTO } from "../../../types";
import {
    AcceptRelationshipRequest,
    AcceptRelationshipUseCase,
    CreateRelationshipRequest,
    CreateRelationshipUseCase,
    GetAttributesForRelationshipRequest,
    GetAttributesForRelationshipResponse,
    GetAttributesForRelationshipUseCase,
    GetRelationshipByAddressRequest,
    GetRelationshipByAddressUseCase,
    GetRelationshipRequest,
    GetRelationshipsRequest,
    GetRelationshipsUseCase,
    GetRelationshipUseCase,
    RejectRelationshipRequest,
    RejectRelationshipUseCase,
    RevokeRelationshipRequest,
    RevokeRelationshipUseCase
} from "../../../useCases";

export class RelationshipsFacade {
    public constructor(
        @Inject private readonly getRelationshipsUseCase: GetRelationshipsUseCase,
        @Inject private readonly getRelationshipUseCase: GetRelationshipUseCase,
        @Inject private readonly getRelationshipByAddressUseCase: GetRelationshipByAddressUseCase,
        @Inject private readonly createRelationshipUseCase: CreateRelationshipUseCase,
        @Inject private readonly acceptRelationshipUseCase: AcceptRelationshipUseCase,
        @Inject private readonly rejectRelationshipUseCase: RejectRelationshipUseCase,
        @Inject private readonly revokeRelationshipUseCase: RevokeRelationshipUseCase,
        @Inject private readonly getAttributesForRelationshipUseCase: GetAttributesForRelationshipUseCase
    ) {}

    public async getRelationships(request: GetRelationshipsRequest): Promise<Result<RelationshipDTO[], ApplicationError>> {
        return await this.getRelationshipsUseCase.execute(request);
    }

    public async getRelationship(request: GetRelationshipRequest): Promise<Result<RelationshipDTO, ApplicationError>> {
        return await this.getRelationshipUseCase.execute(request);
    }

    public async getRelationshipByAddress(request: GetRelationshipByAddressRequest): Promise<Result<RelationshipDTO, ApplicationError>> {
        return await this.getRelationshipByAddressUseCase.execute(request);
    }

    public async createRelationship(request: CreateRelationshipRequest): Promise<Result<RelationshipDTO, ApplicationError>> {
        return await this.createRelationshipUseCase.execute(request);
    }

    public async acceptRelationshipChange(request: AcceptRelationshipRequest): Promise<Result<RelationshipDTO, ApplicationError>> {
        return await this.acceptRelationshipUseCase.execute(request);
    }

    public async rejectRelationshipChange(request: RejectRelationshipRequest): Promise<Result<RelationshipDTO, ApplicationError>> {
        return await this.rejectRelationshipUseCase.execute(request);
    }

    public async revokeRelationshipChange(request: RevokeRelationshipRequest): Promise<Result<RelationshipDTO, ApplicationError>> {
        return await this.revokeRelationshipUseCase.execute(request);
    }

    public async getAttributesForRelationship(request: GetAttributesForRelationshipRequest): Promise<Result<GetAttributesForRelationshipResponse, ApplicationError>> {
        return await this.getAttributesForRelationshipUseCase.execute(request);
    }
}
