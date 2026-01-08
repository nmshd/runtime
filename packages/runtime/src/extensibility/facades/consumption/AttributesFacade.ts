import { Result } from "@js-soft/ts-utils";
import { AttributeTagCollectionDTO, LocalAttributeDTO, LocalAttributeForwardingDetailsDTO, LocalRequestDTO, TokenDTO } from "@nmshd/runtime-types";
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
    CreateTokenForAttributeRequest,
    CreateTokenForAttributeUseCase,
    DeleteAttributeAndNotifyRequest,
    DeleteAttributeAndNotifyResponse,
    DeleteAttributeAndNotifyUseCase,
    DeleteSharedAttributesForRejectedOrRevokedRelationshipRequest,
    DeleteSharedAttributesForRejectedOrRevokedRelationshipUseCase,
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
    GetForwardingDetailsForAttributeRequest,
    GetForwardingDetailsForAttributeUseCase,
    GetOwnAttributesSharedWithPeerRequest,
    GetOwnAttributesSharedWithPeerUseCase,
    GetOwnIdentityAttributesRequest,
    GetOwnIdentityAttributesUseCase,
    GetPeerAttributesRequest,
    GetPeerAttributesUseCase,
    GetVersionsOfAttributeRequest,
    GetVersionsOfAttributeSharedWithPeerRequest,
    GetVersionsOfAttributeSharedWithPeerUseCase,
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
        @Inject private readonly getPeerAttributesUseCase: GetPeerAttributesUseCase,
        @Inject private readonly getOwnAttributesSharedWithPeerUseCase: GetOwnAttributesSharedWithPeerUseCase,
        @Inject private readonly getOwnIdentityAttributesUseCase: GetOwnIdentityAttributesUseCase,
        @Inject private readonly getAttributeUseCase: GetAttributeUseCase,
        @Inject private readonly getAttributesUseCase: GetAttributesUseCase,
        @Inject private readonly getVersionsOfAttributeUseCase: GetVersionsOfAttributeUseCase,
        @Inject private readonly getVersionsOfAttributeSharedWithPeerUseCase: GetVersionsOfAttributeSharedWithPeerUseCase,
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
        @Inject private readonly deleteAttributeAndNotifyUseCase: DeleteAttributeAndNotifyUseCase,
        @Inject private readonly deleteSharedAttributesForRejectedOrRevokedRelationshipUseCase: DeleteSharedAttributesForRejectedOrRevokedRelationshipUseCase,
        @Inject private readonly getAttributeTagCollectionUseCase: GetAttributeTagCollectionUseCase,
        @Inject private readonly setAttributeDeletionInfoOfDeletionProposedRelationshipUseCase: SetAttributeDeletionInfoOfDeletionProposedRelationshipUseCase,
        @Inject private readonly markAttributeAsViewedUseCase: MarkAttributeAsViewedUseCase,
        @Inject private readonly getForwardingDetailsForAttributeUseCase: GetForwardingDetailsForAttributeUseCase,
        @Inject private readonly createTokenForAttributeUseCase: CreateTokenForAttributeUseCase
    ) {}

    public async canCreateOwnIdentityAttribute(request: CanCreateOwnIdentityAttributeRequest): Promise<Result<CanCreateOwnIdentityAttributeResponse>> {
        return await this.canCreateOwnIdentityAttributeUseCase.execute(request);
    }

    public async createOwnIdentityAttribute(request: CreateOwnIdentityAttributeRequest): Promise<Result<LocalAttributeDTO>> {
        return await this.createOwnIdentityAttributeUseCase.execute(request);
    }

    public async getPeerAttributes(request: GetPeerAttributesRequest): Promise<Result<LocalAttributeDTO[]>> {
        return await this.getPeerAttributesUseCase.execute(request);
    }

    public async getOwnAttributesSharedWithPeer(request: GetOwnAttributesSharedWithPeerRequest): Promise<Result<LocalAttributeDTO[]>> {
        return await this.getOwnAttributesSharedWithPeerUseCase.execute(request);
    }

    public async getOwnIdentityAttributes(request: GetOwnIdentityAttributesRequest): Promise<Result<LocalAttributeDTO[]>> {
        return await this.getOwnIdentityAttributesUseCase.execute(request);
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

    public async getVersionsOfAttributeSharedWithPeer(request: GetVersionsOfAttributeSharedWithPeerRequest): Promise<Result<LocalAttributeDTO[]>> {
        return await this.getVersionsOfAttributeSharedWithPeerUseCase.execute(request);
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

    public async deleteAttributeAndNotify(request: DeleteAttributeAndNotifyRequest): Promise<Result<DeleteAttributeAndNotifyResponse>> {
        return await this.deleteAttributeAndNotifyUseCase.execute(request);
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

    public async getForwardingDetailsForAttribute(request: GetForwardingDetailsForAttributeRequest): Promise<Result<LocalAttributeForwardingDetailsDTO[]>> {
        return await this.getForwardingDetailsForAttributeUseCase.execute(request);
    }

    public async createTokenForAttribute(request: CreateTokenForAttributeRequest): Promise<Result<TokenDTO>> {
        return await this.createTokenForAttributeUseCase.execute(request);
    }
}
