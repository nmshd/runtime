import { Result } from "@js-soft/ts-utils";
import { AttributeTagCollectionDTO, LocalAttributeDTO, LocalRequestDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import {
    CanCreateOwnIdentityAttributeRequest,
    CanCreateOwnIdentityAttributeResponse,
    CanCreateOwnIdentityAttributeUseCase,
    ChangeDefaultOwnIdentityAttributeRequest,
    ChangeDefaultOwnIdentityAttributeUseCase,
    CreateAndShareRelationshipAttributeRequest,
    CreateAndShareRelationshipAttributeUseCase,
    CreateOwnIdentityAttributeRequest,
    CreateOwnIdentityAttributeUseCase,
    DeleteOwnIdentityAttributeAndNotifyPeersRequest,
    DeleteOwnIdentityAttributeAndNotifyPeersUseCase,
    DeleteOwnRelationshipAttributeAndNotifyPeersRequest,
    DeleteOwnRelationshipAttributeAndNotifyPeersResponse,
    DeleteOwnRelationshipAttributeAndNotifyPeersUseCase,
    DeletePeerIdentityAttributeAndNotifyOwnerRequest,
    DeletePeerIdentityAttributeAndNotifyOwnerResponse,
    DeletePeerIdentityAttributeAndNotifyOwnerUseCase,
    DeletePeerRelationshipAttributeAndNotifyPeersRequest,
    DeletePeerRelationshipAttributeAndNotifyPeersResponse,
    DeletePeerRelationshipAttributeAndNotifyPeersUseCase,
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
    NotifyPeerAboutOwnIdentityAttributeSuccessionRequest,
    NotifyPeerAboutOwnIdentityAttributeSuccessionResponse,
    NotifyPeerAboutOwnIdentityAttributeSuccessionUseCase,
    SetAttributeDeletionInfoOfDeletionProposedRelationshipRequest,
    SetAttributeDeletionInfoOfDeletionProposedRelationshipUseCase,
    ShareOwnIdentityAttributeRequest,
    ShareOwnIdentityAttributeUseCase,
    SucceedOwnIdentityAttributeRequest,
    SucceedOwnIdentityAttributeResponse,
    SucceedOwnIdentityAttributeUseCase,
    SucceedRelationshipAttributeAndNotifyPeerRequest,
    SucceedRelationshipAttributeAndNotifyPeerResponse,
    SucceedRelationshipAttributeAndNotifyPeerUseCase,
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
        @Inject private readonly succeedOwnIdentityAttributeUseCase: SucceedOwnIdentityAttributeUseCase,
        @Inject private readonly shareOwnIdentityAttributeUseCase: ShareOwnIdentityAttributeUseCase,
        @Inject private readonly notifyPeerAboutOwnIdentityAttributeSuccessionUseCase: NotifyPeerAboutOwnIdentityAttributeSuccessionUseCase,
        @Inject private readonly createAndShareRelationshipAttributeUseCase: CreateAndShareRelationshipAttributeUseCase,
        @Inject private readonly succeedRelationshipAttributeAndNotifyPeerUseCase: SucceedRelationshipAttributeAndNotifyPeerUseCase,
        @Inject private readonly changeDefaultOwnIdentityAttributeUseCase: ChangeDefaultOwnIdentityAttributeUseCase,
        @Inject private readonly deleteOwnRelationshipAttributeAndNotifyPeersUseCase: DeleteOwnRelationshipAttributeAndNotifyPeersUseCase,
        @Inject private readonly deletePeerRelationshipAttributeAndNotifyPeersUseCase: DeletePeerRelationshipAttributeAndNotifyPeersUseCase,
        @Inject private readonly deletePeerIdentityAttributeAndNotifyOwnerUseCase: DeletePeerIdentityAttributeAndNotifyOwnerUseCase,
        @Inject private readonly deleteThirdPartyRelationshipAttributeAndNotifyPeerUseCase: DeleteThirdPartyRelationshipAttributeAndNotifyPeerUseCase,
        @Inject private readonly deleteOwnIdentityAttributeUseCase: DeleteOwnIdentityAttributeAndNotifyPeersUseCase,
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

    public async succeedOwnIdentityAttribute(request: SucceedOwnIdentityAttributeRequest): Promise<Result<SucceedOwnIdentityAttributeResponse>> {
        return await this.succeedOwnIdentityAttributeUseCase.execute(request);
    }

    public async shareOwnIdentityAttribute(request: ShareOwnIdentityAttributeRequest): Promise<Result<LocalRequestDTO>> {
        return await this.shareOwnIdentityAttributeUseCase.execute(request);
    }

    public async notifyPeerAboutOwnIdentityAttributeSuccession(
        request: NotifyPeerAboutOwnIdentityAttributeSuccessionRequest
    ): Promise<Result<NotifyPeerAboutOwnIdentityAttributeSuccessionResponse>> {
        return await this.notifyPeerAboutOwnIdentityAttributeSuccessionUseCase.execute(request);
    }

    public async createAndShareRelationshipAttribute(request: CreateAndShareRelationshipAttributeRequest): Promise<Result<LocalRequestDTO>> {
        return await this.createAndShareRelationshipAttributeUseCase.execute(request);
    }

    public async succeedRelationshipAttributeAndNotifyPeer(
        request: SucceedRelationshipAttributeAndNotifyPeerRequest
    ): Promise<Result<SucceedRelationshipAttributeAndNotifyPeerResponse>> {
        return await this.succeedRelationshipAttributeAndNotifyPeerUseCase.execute(request);
    }

    public async changeDefaultOwnIdentityAttribute(request: ChangeDefaultOwnIdentityAttributeRequest): Promise<Result<LocalAttributeDTO>> {
        return await this.changeDefaultOwnIdentityAttributeUseCase.execute(request);
    }

    public async deleteOwnRelationshipAttributeAndNotifyPeers(
        request: DeleteOwnRelationshipAttributeAndNotifyPeersRequest
    ): Promise<Result<DeleteOwnRelationshipAttributeAndNotifyPeersResponse>> {
        return await this.deleteOwnRelationshipAttributeAndNotifyPeersUseCase.execute(request);
    }

    public async deletePeerRelationshipAttributeAndNotifyPeers(
        request: DeletePeerRelationshipAttributeAndNotifyPeersRequest
    ): Promise<Result<DeletePeerRelationshipAttributeAndNotifyPeersResponse>> {
        return await this.deletePeerRelationshipAttributeAndNotifyPeersUseCase.execute(request);
    }

    public async deletePeerIdentityAttributeAndNotifyOwner(
        request: DeletePeerIdentityAttributeAndNotifyOwnerRequest
    ): Promise<Result<DeletePeerIdentityAttributeAndNotifyOwnerResponse>> {
        return await this.deletePeerIdentityAttributeAndNotifyOwnerUseCase.execute(request);
    }

    public async deleteThirdPartyRelationshipAttributeAndNotifyPeer(
        request: DeleteThirdPartyRelationshipAttributeAndNotifyPeerRequest
    ): Promise<Result<DeleteThirdPartyRelationshipAttributeAndNotifyPeerResponse>> {
        return await this.deleteThirdPartyRelationshipAttributeAndNotifyPeerUseCase.execute(request);
    }

    public async deleteOwnIdentityAttribute(request: DeleteOwnIdentityAttributeAndNotifyPeersRequest): Promise<Result<void>> {
        return await this.deleteOwnIdentityAttributeUseCase.execute(request);
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
