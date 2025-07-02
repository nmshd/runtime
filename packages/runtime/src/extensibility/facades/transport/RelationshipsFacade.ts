import { Result } from "@js-soft/ts-utils";
import { RelationshipDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import {
    AcceptRelationshipReactivationRequest,
    AcceptRelationshipReactivationUseCase,
    AcceptRelationshipRequest,
    AcceptRelationshipUseCase,
    CanCreateRelationshipRequest,
    CanCreateRelationshipResponse,
    CanCreateRelationshipUseCase,
    CreateRelationshipRequest,
    CreateRelationshipUseCase,
    DecomposeRelationshipRequest,
    DecomposeRelationshipUseCase,
    GetAttributesForRelationshipRequest,
    GetAttributesForRelationshipResponse,
    GetAttributesForRelationshipUseCase,
    GetRelationshipByAddressRequest,
    GetRelationshipByAddressUseCase,
    GetRelationshipRequest,
    GetRelationshipUseCase,
    GetRelationshipsRequest,
    GetRelationshipsUseCase,
    RejectRelationshipReactivationRequest,
    RejectRelationshipReactivationUseCase,
    RejectRelationshipRequest,
    RejectRelationshipUseCase,
    RequestRelationshipReactivationRequest,
    RequestRelationshipReactivationUseCase,
    RevokeRelationshipReactivationRequest,
    RevokeRelationshipReactivationUseCase,
    RevokeRelationshipRequest,
    RevokeRelationshipUseCase,
    TerminateRelationshipRequest,
    TerminateRelationshipUseCase
} from "../../../useCases";

export class RelationshipsFacade {
    public constructor(
        @Inject private readonly getRelationshipsUseCase: GetRelationshipsUseCase,
        @Inject private readonly getRelationshipUseCase: GetRelationshipUseCase,
        @Inject private readonly getRelationshipByAddressUseCase: GetRelationshipByAddressUseCase,
        @Inject private readonly canCreateRelationshipUseCase: CanCreateRelationshipUseCase,
        @Inject private readonly createRelationshipUseCase: CreateRelationshipUseCase,
        @Inject private readonly acceptRelationshipUseCase: AcceptRelationshipUseCase,
        @Inject private readonly rejectRelationshipUseCase: RejectRelationshipUseCase,
        @Inject private readonly revokeRelationshipUseCase: RevokeRelationshipUseCase,
        @Inject private readonly terminateRelationshipUseCase: TerminateRelationshipUseCase,
        @Inject private readonly requestRelationshipReactivationUseCase: RequestRelationshipReactivationUseCase,
        @Inject private readonly acceptRelationshipReactivationUseCase: AcceptRelationshipReactivationUseCase,
        @Inject private readonly rejectRelationshipReactivationUseCase: RejectRelationshipReactivationUseCase,
        @Inject private readonly revokeRelationshipReactivationUseCase: RevokeRelationshipReactivationUseCase,
        @Inject private readonly decomposeRelationshipUseCase: DecomposeRelationshipUseCase,
        @Inject private readonly getAttributesForRelationshipUseCase: GetAttributesForRelationshipUseCase
    ) {}

    public async getRelationships(request: GetRelationshipsRequest): Promise<Result<RelationshipDTO[]>> {
        return await this.getRelationshipsUseCase.execute(request);
    }

    public async getRelationship(request: GetRelationshipRequest): Promise<Result<RelationshipDTO>> {
        return await this.getRelationshipUseCase.execute(request);
    }

    public async getRelationshipByAddress(request: GetRelationshipByAddressRequest): Promise<Result<RelationshipDTO>> {
        return await this.getRelationshipByAddressUseCase.execute(request);
    }

    public async canCreateRelationship(request: CanCreateRelationshipRequest): Promise<Result<CanCreateRelationshipResponse>> {
        return await this.canCreateRelationshipUseCase.execute(request);
    }

    public async createRelationship(request: CreateRelationshipRequest): Promise<Result<RelationshipDTO>> {
        return await this.createRelationshipUseCase.execute(request);
    }

    public async acceptRelationship(request: AcceptRelationshipRequest): Promise<Result<RelationshipDTO>> {
        return await this.acceptRelationshipUseCase.execute(request);
    }

    public async rejectRelationship(request: RejectRelationshipRequest): Promise<Result<RelationshipDTO>> {
        return await this.rejectRelationshipUseCase.execute(request);
    }

    public async revokeRelationship(request: RevokeRelationshipRequest): Promise<Result<RelationshipDTO>> {
        return await this.revokeRelationshipUseCase.execute(request);
    }

    public async terminateRelationship(request: TerminateRelationshipRequest): Promise<Result<RelationshipDTO>> {
        return await this.terminateRelationshipUseCase.execute(request);
    }

    public async requestRelationshipReactivation(request: RequestRelationshipReactivationRequest): Promise<Result<RelationshipDTO>> {
        return await this.requestRelationshipReactivationUseCase.execute(request);
    }

    public async acceptRelationshipReactivation(request: AcceptRelationshipReactivationRequest): Promise<Result<RelationshipDTO>> {
        return await this.acceptRelationshipReactivationUseCase.execute(request);
    }

    public async rejectRelationshipReactivation(request: RejectRelationshipReactivationRequest): Promise<Result<RelationshipDTO>> {
        return await this.rejectRelationshipReactivationUseCase.execute(request);
    }

    public async revokeRelationshipReactivation(request: RevokeRelationshipReactivationRequest): Promise<Result<RelationshipDTO>> {
        return await this.revokeRelationshipReactivationUseCase.execute(request);
    }

    public async decomposeRelationship(request: DecomposeRelationshipRequest): Promise<Result<void>> {
        return await this.decomposeRelationshipUseCase.execute(request);
    }

    public async getAttributesForRelationship(request: GetAttributesForRelationshipRequest): Promise<Result<GetAttributesForRelationshipResponse>> {
        return await this.getAttributesForRelationshipUseCase.execute(request);
    }
}
