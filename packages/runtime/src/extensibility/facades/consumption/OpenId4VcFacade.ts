import { Result } from "@js-soft/ts-utils";
import { LocalAttributeDTO, TokenDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import {
    AcceptAuthorizationRequestRequest,
    AcceptAuthorizationRequestResponse,
    AcceptAuthorizationRequestUseCase,
    CreatePresentationTokenRequest,
    CreatePresentationTokenUseCase,
    RequestCredentialsRequest,
    RequestCredentialsResponse,
    RequestCredentialsUseCase,
    ResolveAuthorizationRequestRequest,
    ResolveAuthorizationRequestResponse,
    ResolveAuthorizationRequestUseCase,
    ResolveCredentialOfferRequest,
    ResolveCredentialOfferResponse,
    ResolveCredentialOfferUseCase,
    StoreCredentialsRequest,
    StoreCredentialsUseCase
} from "../../../useCases";

export class OpenId4VcFacade {
    public constructor(
        @Inject private readonly resolveCredentialOfferUseCase: ResolveCredentialOfferUseCase,
        @Inject private readonly requestCredentialsUseCase: RequestCredentialsUseCase,
        @Inject private readonly storeCredentialsUseCase: StoreCredentialsUseCase,
        @Inject private readonly resolveAuthorizationRequestUseCase: ResolveAuthorizationRequestUseCase,
        @Inject private readonly acceptAuthorizationRequestUseCase: AcceptAuthorizationRequestUseCase,
        @Inject private readonly createPresentationTokenUseCase: CreatePresentationTokenUseCase
    ) {}

    public async resolveCredentialOffer(request: ResolveCredentialOfferRequest): Promise<Result<ResolveCredentialOfferResponse>> {
        return await this.resolveCredentialOfferUseCase.execute(request);
    }

    public async requestCredentials(request: RequestCredentialsRequest): Promise<Result<RequestCredentialsResponse>> {
        return await this.requestCredentialsUseCase.execute(request);
    }

    public async storeCredentials(request: StoreCredentialsRequest): Promise<Result<LocalAttributeDTO>> {
        return await this.storeCredentialsUseCase.execute(request);
    }

    public async resolveAuthorizationRequest(request: ResolveAuthorizationRequestRequest): Promise<Result<ResolveAuthorizationRequestResponse>> {
        return await this.resolveAuthorizationRequestUseCase.execute(request);
    }

    public async acceptAuthorizationRequest(request: AcceptAuthorizationRequestRequest): Promise<Result<AcceptAuthorizationRequestResponse>> {
        return await this.acceptAuthorizationRequestUseCase.execute(request);
    }

    public async createPresentationToken(request: CreatePresentationTokenRequest): Promise<Result<TokenDTO>> {
        return await this.createPresentationTokenUseCase.execute(request);
    }
}
