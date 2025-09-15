import { ApplicationError, Result } from "@js-soft/ts-utils";
import { FetchedCredentialOfferDTO, FetchedProofRequestDTO, VerifiableCredentialDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import {
    FetchCredentialOfferRequest,
    FetchCredentialOfferUseCase,
    FetchedCredentialOfferRequest,
    FetchProofRequestUseCase,
    ResolveCredentialOfferRequest,
    ResolveCredentialOfferUseCase,
    ResolveFetchedCredentialOfferUseCase
} from "../../../useCases";

export class OpenId4VcFacade {
    public constructor(
        @Inject private readonly resolveCredentialOfferUseCase: ResolveCredentialOfferUseCase,
        @Inject private readonly fetchOfferUseCase: FetchCredentialOfferUseCase,
        @Inject private readonly resolveFetchedOfferUseCase: ResolveFetchedCredentialOfferUseCase,
        @Inject private readonly fetchProofRequestUseCase: FetchProofRequestUseCase
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

    public async fetchProofRequest(request: FetchCredentialOfferRequest): Promise<Result<FetchedProofRequestDTO, ApplicationError>> {
        return await this.fetchProofRequestUseCase.execute(request);
    }
}
