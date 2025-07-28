import { Result } from "@js-soft/ts-utils";
import { AttributeTagCollectionDTO, LocalAttributeDTO, LocalRequestDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import {
    CanCreateOwnIdentityAttributeRequest,
    CanCreateOwnIdentityAttributeResponse,
    CanCreateOwnIdentityAttributeUseCase,
    ChangeDefaultRepositoryAttributeRequest,
    ChangeDefaultRepositoryAttributeUseCase,
    CreateAndShareRelationshipAttributeRequest,
    CreateAndShareRelationshipAttributeUseCase,
    CreateOwnIdentityAttributeRequest,
    CreateOwnIdentityAttributeUseCase,
    DeleteOwnIdentityAttributeAndNotifyPeersRequest,
    DeleteOwnIdentityAttributeAndNotifyPeersUseCase,
    DeleteOwnRelationshipAttributeAndNotifyPeerRequest,
    DeleteOwnRelationshipAttributeAndNotifyPeerResponse,
    DeleteOwnRelationshipAttributeAndNotifyPeerUseCase,
    DeletePeerIdentityAttributeAndNotifyOwnerRequest,
    DeletePeerIdentityAttributeAndNotifyOwnerResponse,
    DeletePeerIdentityAttributeAndNotifyOwnerUseCase,
    DeleteSharedAttributesForRejectedOrRevokedRelationshipRequest,
    DeleteSharedAttributesForRejectedOrRevokedRelationshipUseCase,
    DeleteThirdPartyRelationshipAttributeAndNotifyPeerRequest,
    DeleteThirdPartyRelationshipAttributeAndNotifyPeerResponse,
    DeleteThirdPartyRelationshipAttributeAndNotifyPeerUseCase,
    ExecuteIQLQueryRequest,
    ExecuteIQLQueryUseCase,
    ExecuteIdentityAttributeQueryRequest,
    ExecuteIdentityAttributeQueryUseCase,
    ExecuteRelationshipAttributeQueryRequest,
    ExecuteRelationshipAttributeQueryUseCase,
    ExecuteThirdPartyRelationshipAttributeQueryRequest,
    ExecuteThirdPartyRelationshipAttributeQueryUseCase,
    GetAttributeRequest,
    GetAttributeTagCollectionUseCase,
    GetAttributeUseCase,
    GetAttributesRequest,
    GetAttributesUseCase,
    GetOwnSharedAttributesRequest,
    GetOwnSharedAttributesUseCase,
    GetPeerSharedAttributesRequest,
    GetPeerSharedAttributesUseCase,
    GetRepositoryAttributesRequest,
    GetRepositoryAttributesUseCase,
    GetSharedVersionsOfAttributeRequest,
    GetSharedVersionsOfAttributeUseCase,
    GetVersionsOfAttributeRequest,
    GetVersionsOfAttributeUseCase,
    MarkAttributeAsViewedRequest,
    MarkAttributeAsViewedUseCase,
    NotifyPeerAboutRepositoryAttributeSuccessionRequest,
    NotifyPeerAboutRepositoryAttributeSuccessionResponse,
    NotifyPeerAboutRepositoryAttributeSuccessionUseCase,
    SetAttributeDeletionInfoOfDeletionProposedRelationshipRequest,
    SetAttributeDeletionInfoOfDeletionProposedRelationshipUseCase,
    ShareRepositoryAttributeRequest,
    ShareRepositoryAttributeUseCase,
    SucceedRelationshipAttributeAndNotifyPeerRequest,
    SucceedRelationshipAttributeAndNotifyPeerResponse,
    SucceedRelationshipAttributeAndNotifyPeerUseCase,
    SucceedRepositoryAttributeRequest,
    SucceedRepositoryAttributeResponse,
    SucceedRepositoryAttributeUseCase,
    ValidateIQLQueryRequest,
    ValidateIQLQueryResponse,
    ValidateIQLQueryUseCase
} from "../../../useCases";

export class AttributesFacade {
    public constructor(
        @Inject private readonly canCreateOwnIdentityAttributeUseCase: CanCreateOwnIdentityAttributeUseCase,
        @Inject private readonly createOwnIdentityAttributeUseCase: CreateOwnIdentityAttributeUseCase,
        @Inject private readonly getPeerSharedAttributesUseCase: GetPeerSharedAttributesUseCase,
        @Inject private readonly getOwnSharedAttributesUseCase: GetOwnSharedAttributesUseCase,
        @Inject private readonly getRepositoryAttributesUseCase: GetRepositoryAttributesUseCase,
        @Inject private readonly getAttributeUseCase: GetAttributeUseCase,
        @Inject private readonly getAttributesUseCase: GetAttributesUseCase,
        @Inject private readonly getVersionsOfAttributeUseCase: GetVersionsOfAttributeUseCase,
        @Inject private readonly getSharedVersionsOfAttributeUseCase: GetSharedVersionsOfAttributeUseCase,
        @Inject private readonly executeIdentityAttributeQueryUseCase: ExecuteIdentityAttributeQueryUseCase,
        @Inject private readonly executeRelationshipAttributeQueryUseCase: ExecuteRelationshipAttributeQueryUseCase,
        @Inject private readonly executeThirdPartyRelationshipAttributeQueryUseCase: ExecuteThirdPartyRelationshipAttributeQueryUseCase,
        @Inject private readonly executeIQLQueryUseCase: ExecuteIQLQueryUseCase,
        @Inject private readonly validateIQLQueryUseCase: ValidateIQLQueryUseCase,
        @Inject private readonly succeedRepositoryAttributeUseCase: SucceedRepositoryAttributeUseCase,
        @Inject private readonly shareRepositoryAttributeUseCase: ShareRepositoryAttributeUseCase,
        @Inject private readonly notifyPeerAboutRepositoryAttributeSuccessionUseCase: NotifyPeerAboutRepositoryAttributeSuccessionUseCase,
        @Inject private readonly createAndShareRelationshipAttributeUseCase: CreateAndShareRelationshipAttributeUseCase,
        @Inject private readonly succeedRelationshipAttributeAndNotifyPeerUseCase: SucceedRelationshipAttributeAndNotifyPeerUseCase,
        @Inject private readonly changeDefaultRepositoryAttributeUseCase: ChangeDefaultRepositoryAttributeUseCase,
        @Inject private readonly deleteOwnSharedAttributeAndNotifyPeerUseCase: DeleteOwnRelationshipAttributeAndNotifyPeerUseCase,
        @Inject private readonly deletePeerSharedAttributeAndNotifyOwnerUseCase: DeletePeerIdentityAttributeAndNotifyOwnerUseCase,
        @Inject private readonly deleteThirdPartyRelationshipAttributeAndNotifyPeerUseCase: DeleteThirdPartyRelationshipAttributeAndNotifyPeerUseCase,
        @Inject private readonly deleteRepositoryAttributeUseCase: DeleteOwnIdentityAttributeAndNotifyPeersUseCase,
        @Inject private readonly deleteSharedAttributesForRejectedOrRevokedRelationshipUseCase: DeleteSharedAttributesForRejectedOrRevokedRelationshipUseCase,
        @Inject private readonly getAttributeTagCollectionUseCase: GetAttributeTagCollectionUseCase,
        @Inject private readonly setAttributeDeletionInfoOfDeletionProposedRelationshipUseCase: SetAttributeDeletionInfoOfDeletionProposedRelationshipUseCase,
        @Inject private readonly markAttributeAsViewedUseCase: MarkAttributeAsViewedUseCase
    ) {}

    public async canCreateOwnIdentityAttribute(request: CanCreateOwnIdentityAttributeRequest): Promise<Result<CanCreateOwnIdentityAttributeResponse>> {
        return await this.canCreateOwnIdentityAttributeUseCase.execute(request);
    }

    public async createOwnIdentityAttribute(request: CreateOwnIdentityAttributeRequest): Promise<Result<LocalAttributeDTO>> {
        return await this.createOwnIdentityAttributeUseCase.execute(request);
    }

    public async getPeerSharedAttributes(request: GetPeerSharedAttributesRequest): Promise<Result<LocalAttributeDTO[]>> {
        return await this.getPeerSharedAttributesUseCase.execute(request);
    }

    public async getOwnSharedAttributes(request: GetOwnSharedAttributesRequest): Promise<Result<LocalAttributeDTO[]>> {
        return await this.getOwnSharedAttributesUseCase.execute(request);
    }

    public async getRepositoryAttributes(request: GetRepositoryAttributesRequest): Promise<Result<LocalAttributeDTO[]>> {
        return await this.getRepositoryAttributesUseCase.execute(request);
    }

    public async getAttribute(request: GetAttributeRequest): Promise<Result<LocalAttributeDTO>> {
        return await this.getAttributeUseCase.execute(request);
    }

    public async getAttributes(request: GetAttributesRequest): Promise<Result<LocalAttributeDTO[]>> {
        return await this.getAttributesUseCase.execute(request);
    }

    public async getVersionsOfAttribute(request: GetVersionsOfAttributeRequest): Promise<Result<LocalAttributeDTO[]>> {
        return await this.getVersionsOfAttributeUseCase.execute(request);
    }

    public async getSharedVersionsOfAttribute(request: GetSharedVersionsOfAttributeRequest): Promise<Result<LocalAttributeDTO[]>> {
        return await this.getSharedVersionsOfAttributeUseCase.execute(request);
    }

    public async executeIdentityAttributeQuery(request: ExecuteIdentityAttributeQueryRequest): Promise<Result<LocalAttributeDTO[]>> {
        return await this.executeIdentityAttributeQueryUseCase.execute(request);
    }

    public async executeRelationshipAttributeQuery(request: ExecuteRelationshipAttributeQueryRequest): Promise<Result<LocalAttributeDTO>> {
        return await this.executeRelationshipAttributeQueryUseCase.execute(request);
    }

    public async executeThirdPartyRelationshipAttributeQuery(request: ExecuteThirdPartyRelationshipAttributeQueryRequest): Promise<Result<LocalAttributeDTO[]>> {
        return await this.executeThirdPartyRelationshipAttributeQueryUseCase.execute(request);
    }

    public async executeIQLQuery(request: ExecuteIQLQueryRequest): Promise<Result<LocalAttributeDTO[]>> {
        return await this.executeIQLQueryUseCase.execute(request);
    }

    public async validateIQLQuery(request: ValidateIQLQueryRequest): Promise<Result<ValidateIQLQueryResponse>> {
        return await this.validateIQLQueryUseCase.execute(request);
    }

    public async succeedRepositoryAttribute(request: SucceedRepositoryAttributeRequest): Promise<Result<SucceedRepositoryAttributeResponse>> {
        return await this.succeedRepositoryAttributeUseCase.execute(request);
    }

    public async shareRepositoryAttribute(request: ShareRepositoryAttributeRequest): Promise<Result<LocalRequestDTO>> {
        return await this.shareRepositoryAttributeUseCase.execute(request);
    }

    public async notifyPeerAboutRepositoryAttributeSuccession(
        request: NotifyPeerAboutRepositoryAttributeSuccessionRequest
    ): Promise<Result<NotifyPeerAboutRepositoryAttributeSuccessionResponse>> {
        return await this.notifyPeerAboutRepositoryAttributeSuccessionUseCase.execute(request);
    }

    public async createAndShareRelationshipAttribute(request: CreateAndShareRelationshipAttributeRequest): Promise<Result<LocalRequestDTO>> {
        return await this.createAndShareRelationshipAttributeUseCase.execute(request);
    }

    public async succeedRelationshipAttributeAndNotifyPeer(
        request: SucceedRelationshipAttributeAndNotifyPeerRequest
    ): Promise<Result<SucceedRelationshipAttributeAndNotifyPeerResponse>> {
        return await this.succeedRelationshipAttributeAndNotifyPeerUseCase.execute(request);
    }

    public async changeDefaultRepositoryAttribute(request: ChangeDefaultRepositoryAttributeRequest): Promise<Result<LocalAttributeDTO>> {
        return await this.changeDefaultRepositoryAttributeUseCase.execute(request);
    }

    public async deleteOwnSharedAttributeAndNotifyPeer(
        request: DeleteOwnRelationshipAttributeAndNotifyPeerRequest
    ): Promise<Result<DeleteOwnRelationshipAttributeAndNotifyPeerResponse>> {
        return await this.deleteOwnSharedAttributeAndNotifyPeerUseCase.execute(request);
    }

    public async deletePeerSharedAttributeAndNotifyOwner(
        request: DeletePeerIdentityAttributeAndNotifyOwnerRequest
    ): Promise<Result<DeletePeerIdentityAttributeAndNotifyOwnerResponse>> {
        return await this.deletePeerSharedAttributeAndNotifyOwnerUseCase.execute(request);
    }

    public async deleteThirdPartyRelationshipAttributeAndNotifyPeer(
        request: DeleteThirdPartyRelationshipAttributeAndNotifyPeerRequest
    ): Promise<Result<DeleteThirdPartyRelationshipAttributeAndNotifyPeerResponse>> {
        return await this.deleteThirdPartyRelationshipAttributeAndNotifyPeerUseCase.execute(request);
    }

    public async deleteRepositoryAttribute(request: DeleteOwnIdentityAttributeAndNotifyPeersRequest): Promise<Result<void>> {
        return await this.deleteRepositoryAttributeUseCase.execute(request);
    }

    public async deleteSharedAttributesForRejectedOrRevokedRelationship(request: DeleteSharedAttributesForRejectedOrRevokedRelationshipRequest): Promise<Result<void>> {
        return await this.deleteSharedAttributesForRejectedOrRevokedRelationshipUseCase.execute(request);
    }

    public async getAttributeTagCollection(): Promise<Result<AttributeTagCollectionDTO>> {
        return await this.getAttributeTagCollectionUseCase.execute();
    }

    public async setAttributeDeletionInfoOfDeletionProposedRelationship(request: SetAttributeDeletionInfoOfDeletionProposedRelationshipRequest): Promise<Result<void>> {
        return await this.setAttributeDeletionInfoOfDeletionProposedRelationshipUseCase.execute(request);
    }

    public async markAttributeAsViewed(request: MarkAttributeAsViewedRequest): Promise<Result<LocalAttributeDTO>> {
        return await this.markAttributeAsViewedUseCase.execute(request);
    }
}
