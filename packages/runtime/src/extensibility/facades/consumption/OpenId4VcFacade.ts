import { ApplicationError, Result } from "@js-soft/ts-utils";
import { VerifiableCredentialDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import {
    AcceptAuthorizationRequestRequest,
    AcceptAuthorizationRequestResponse,
    AcceptAuthorizationRequestUseCase,
    AcceptCredentialOfferRequest,
    AcceptCredentialOfferUseCase,
    GetVerifiableCredentialsUseCase,
    ResolveAuthorizationRequestRequest,
    ResolveAuthorizationRequestResponse,
    ResolveAuthorizationRequestUseCase,
    ResolveCredentialOfferRequest,
    ResolveCredentialOfferResponse,
    ResolveCredentialOfferUseCase
} from "../../../useCases";

export class OpenId4VcFacade {
    public constructor(
        @Inject private readonly resolveCredentialOfferUseCase: ResolveCredentialOfferUseCase,
        @Inject private readonly acceptCredentialOfferUseCase: AcceptCredentialOfferUseCase,
        @Inject private readonly resolveAuthorizationRequestUseCase: ResolveAuthorizationRequestUseCase,
        @Inject private readonly acceptAuthorizationRequestUseCase: AcceptAuthorizationRequestUseCase,
        @Inject private readonly getVerifiableCredentialsUseCase: GetVerifiableCredentialsUseCase
    ) {}

    public async resolveCredentialOffer(request: ResolveCredentialOfferRequest): Promise<Result<ResolveCredentialOfferResponse, ApplicationError>> {
        return await this.resolveCredentialOfferUseCase.execute(request);
    }

    public async acceptCredentialOffer(request: AcceptCredentialOfferRequest): Promise<Result<VerifiableCredentialDTO, ApplicationError>> {
        return await this.acceptCredentialOfferUseCase.execute(request);
    }

    public async resolveAuthorizationRequest(request: ResolveAuthorizationRequestRequest): Promise<Result<ResolveAuthorizationRequestResponse, ApplicationError>> {
        return await this.resolveAuthorizationRequestUseCase.execute(request);
    }

    public async acceptAuthorizationRequest(request: AcceptAuthorizationRequestRequest): Promise<Result<AcceptAuthorizationRequestResponse, ApplicationError>> {
        return await this.acceptAuthorizationRequestUseCase.execute(request);
    }

    public async getVerifiableCredentials(ids?: string[]): Promise<Result<VerifiableCredentialDTO[], ApplicationError>> {
        return await this.getVerifiableCredentialsUseCase.execute({ ids });
    }
}
