import { ApplicationError, Result } from "@js-soft/ts-utils";
import { AcceptAuthorizationRequestDTO, FetchedAuthorizationRequestDTO, FetchedCredentialOfferDTO, VerifiableCredentialDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import {
    AcceptAuthorizationRequestRequest,
    AcceptAuthorizationRequestUseCase,
    FetchCredentialOfferRequest,
    FetchCredentialOfferUseCase,
    FetchedCredentialOfferRequest,
    GetVerifiableCredentialsUseCase,
    ResolveAuthorizationRequestRequest,
    ResolveAuthorizationRequestUseCase,
    ResolveCredentialOfferRequest,
    ResolveCredentialOfferUseCase,
    ResolveFetchedCredentialOfferUseCase
} from "../../../useCases";

export class OpenId4VcFacade {
    public constructor(
        @Inject private readonly resolveCredentialOfferUseCase: ResolveCredentialOfferUseCase,
        @Inject private readonly fetchOfferUseCase: FetchCredentialOfferUseCase,
        @Inject private readonly resolveFetchedOfferUseCase: ResolveFetchedCredentialOfferUseCase,
        @Inject private readonly resolveAuthorizationRequestUseCase: ResolveAuthorizationRequestUseCase,
        @Inject private readonly acceptAuthorizationRequestUseCase: AcceptAuthorizationRequestUseCase,
        @Inject private readonly getVerifiableCredentialsUseCase: GetVerifiableCredentialsUseCase
    ) {}

    public async resolveCredentialOffer(request: ResolveCredentialOfferRequest): Promise<Result<VerifiableCredentialDTO, ApplicationError>> {
        return await this.resolveCredentialOfferUseCase.execute(request);
    }

    public async fetchCredentialOffer(request: FetchCredentialOfferRequest): Promise<Result<FetchedCredentialOfferDTO, ApplicationError>> {
        return await this.fetchOfferUseCase.execute(request);
    }

    public async resolveFetchedCredentialOffer(request: FetchedCredentialOfferRequest): Promise<Result<VerifiableCredentialDTO, ApplicationError>> {
        return await this.resolveFetchedOfferUseCase.execute(request);
    }

    public async resolveAuthorizationRequest(request: ResolveAuthorizationRequestRequest): Promise<Result<FetchedAuthorizationRequestDTO, ApplicationError>> {
        return await this.resolveAuthorizationRequestUseCase.execute(request);
    }

    public async acceptAuthorizationRequest(request: AcceptAuthorizationRequestRequest): Promise<Result<AcceptAuthorizationRequestDTO, ApplicationError>> {
        return await this.acceptAuthorizationRequestUseCase.execute(request);
    }

    public async getVerifiableCredentials(ids?: string[]): Promise<Result<VerifiableCredentialDTO[], ApplicationError>> {
        return await this.getVerifiableCredentialsUseCase.execute({ ids });
    }
}
