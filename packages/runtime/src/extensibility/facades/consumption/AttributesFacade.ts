import { Result } from "@js-soft/ts-utils";
import { Inject } from "typescript-ioc";
import { LocalAttributeDTO, LocalRequestDTO } from "../../../types";
import {
    CreateAndShareRelationshipAttributeRequest,
    CreateAndShareRelationshipAttributeUseCase,
    CreateIdentityAttributeRequest,
    CreateIdentityAttributeUseCase,
    ExecuteIdentityAttributeQueryRequest,
    ExecuteIdentityAttributeQueryUseCase,
    ExecuteIQLQueryRequest,
    ExecuteIQLQueryUseCase,
    ExecuteRelationshipAttributeQueryRequest,
    ExecuteRelationshipAttributeQueryUseCase,
    ExecuteThirdPartyRelationshipAttributeQueryRequest,
    ExecuteThirdPartyRelationshipAttributeQueryUseCase,
    GetAttributeRequest,
    GetAttributesRequest,
    GetAttributesUseCase,
    GetAttributeUseCase,
    GetOwnIdentityAttributesRequest,
    GetOwnIdentityAttributesUseCase,
    GetOwnSharedAttributesRequest,
    GetOwnSharedAttributesUseCase,
    GetPeerSharedAttributesRequest,
    GetPeerSharedAttributesUseCase,
    GetSharedVersionsOfIdentityAttributeRequest,
    GetSharedVersionsOfIdentityAttributeUseCase,
    GetVersionsOfAttributeRequest,
    GetVersionsOfAttributeUseCase,
    NotifyPeerAboutIdentityAttributeSuccessionRequest,
    NotifyPeerAboutIdentityAttributeSuccessionResponse,
    NotifyPeerAboutIdentityAttributeSuccessionUseCase,
    ShareIdentityAttributeRequest,
    ShareIdentityAttributeUseCase,
    SucceedIdentityAttributeRequest,
    SucceedIdentityAttributeResponse,
    SucceedIdentityAttributeUseCase,
    SucceedRelationshipAttributeAndNotifyPeerRequest,
    SucceedRelationshipAttributeAndNotifyPeerResponse,
    SucceedRelationshipAttributeAndNotifyPeerUseCase,
    ValidateIQLQueryRequest,
    ValidateIQLQueryResponse,
    ValidateIQLQueryUseCase
} from "../../../useCases";

export class AttributesFacade {
    public constructor(
        @Inject private readonly createIdentityAttributeUseCase: CreateIdentityAttributeUseCase,
        @Inject private readonly shareIdentityAttributeUseCase: ShareIdentityAttributeUseCase,
        @Inject private readonly getPeerSharedAttributesUseCase: GetPeerSharedAttributesUseCase,
        @Inject private readonly getOwnSharedAttributesUseCase: GetOwnSharedAttributesUseCase,
        @Inject private readonly getOwnIdentityAttributesUseCase: GetOwnIdentityAttributesUseCase,
        @Inject private readonly getAttributeUseCase: GetAttributeUseCase,
        @Inject private readonly getAttributesUseCase: GetAttributesUseCase,
        @Inject private readonly getVersionsOfAttributeUseCase: GetVersionsOfAttributeUseCase,
        @Inject private readonly getSharedVersionsOfIdentityAttributeUseCase: GetSharedVersionsOfIdentityAttributeUseCase,
        @Inject private readonly succeedIdentityAttributeUseCase: SucceedIdentityAttributeUseCase,
        @Inject private readonly executeIdentityAttributeQueryUseCase: ExecuteIdentityAttributeQueryUseCase,
        @Inject private readonly executeRelationshipAttributeQueryUseCase: ExecuteRelationshipAttributeQueryUseCase,
        @Inject private readonly succeedRelationshipAttributeAndNotifyPeerUseCase: SucceedRelationshipAttributeAndNotifyPeerUseCase,
        @Inject private readonly executeThirdPartyRelationshipAttributeQueryUseCase: ExecuteThirdPartyRelationshipAttributeQueryUseCase,
        @Inject private readonly executeIQLQueryUseCase: ExecuteIQLQueryUseCase,
        @Inject private readonly validateIQLQueryUseCase: ValidateIQLQueryUseCase,
        @Inject private readonly createAndShareRelationshipAttributeUseCase: CreateAndShareRelationshipAttributeUseCase,
        @Inject private readonly notifyPeerAboutIdentityAttributeSuccessionUseCase: NotifyPeerAboutIdentityAttributeSuccessionUseCase
    ) {}

    public async createIdentityAttribute(request: CreateIdentityAttributeRequest): Promise<Result<LocalAttributeDTO>> {
        return await this.createIdentityAttributeUseCase.execute(request);
    }

    public async getPeerSharedAttributes(request: GetPeerSharedAttributesRequest): Promise<Result<LocalAttributeDTO[]>> {
        return await this.getPeerSharedAttributesUseCase.execute(request);
    }

    public async getOwnSharedAttributes(request: GetOwnSharedAttributesRequest): Promise<Result<LocalAttributeDTO[]>> {
        return await this.getOwnSharedAttributesUseCase.execute(request);
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

    public async getSharedVersionsOfIdentityAttribute(request: GetSharedVersionsOfIdentityAttributeRequest): Promise<Result<LocalAttributeDTO[]>> {
        return await this.getSharedVersionsOfIdentityAttributeUseCase.execute(request);
    }

    public async executeIdentityAttributeQuery(request: ExecuteIdentityAttributeQueryRequest): Promise<Result<LocalAttributeDTO[]>> {
        return await this.executeIdentityAttributeQueryUseCase.execute(request);
    }

    public async executeRelationshipAttributeQuery(request: ExecuteRelationshipAttributeQueryRequest): Promise<Result<LocalAttributeDTO>> {
        return await this.executeRelationshipAttributeQueryUseCase.execute(request);
    }

    public async succeedRelationshipAttributeAndNotifyPeer(
        request: SucceedRelationshipAttributeAndNotifyPeerRequest
    ): Promise<Result<SucceedRelationshipAttributeAndNotifyPeerResponse>> {
        return await this.succeedRelationshipAttributeAndNotifyPeerUseCase.execute(request);
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

    public async succeedIdentityAttribute(request: SucceedIdentityAttributeRequest): Promise<Result<SucceedIdentityAttributeResponse>> {
        return await this.succeedIdentityAttributeUseCase.execute(request);
    }

    public async shareIdentityAttribute(request: ShareIdentityAttributeRequest): Promise<Result<LocalRequestDTO>> {
        return await this.shareIdentityAttributeUseCase.execute(request);
    }

    public async createAndShareRelationshipAttribute(request: CreateAndShareRelationshipAttributeRequest): Promise<Result<LocalRequestDTO>> {
        return await this.createAndShareRelationshipAttributeUseCase.execute(request);
    }

    public async notifyPeerAboutIdentityAttributeSuccession(
        request: NotifyPeerAboutIdentityAttributeSuccessionRequest
    ): Promise<Result<NotifyPeerAboutIdentityAttributeSuccessionResponse>> {
        return await this.notifyPeerAboutIdentityAttributeSuccessionUseCase.execute(request);
    }
}
