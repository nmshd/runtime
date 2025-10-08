import { ApplicationError, Result } from "@js-soft/ts-utils";
import { AcceptProofRequestDTO, FetchedCredentialOfferDTO, FetchedProofRequestDTO, VerifiableCredentialDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import {
    AcceptProofRequestRequest,
    AcceptProofRequestUseCase,
    ExecuteDCQLQueryRequest,
    ExecuteDCQLQueryResponse,
    ExecuteDCQLQueryUseCase,
    FetchCredentialOfferRequest,
    FetchCredentialOfferUseCase,
    FetchedCredentialOfferRequest,
    FetchProofRequestRequest,
    FetchProofRequestUseCase,
    ResolveCredentialOfferRequest,
    ResolveCredentialOfferUseCase,
    ResolveFetchedCredentialOfferUseCase,
    VerifySharedCredentialRequest,
    VerifySharedCredentialResponse,
    VerifySharedCredentialUseCase
} from "../../../useCases";

export class OpenId4VcFacade {
    public constructor(
        @Inject private readonly resolveCredentialOfferUseCase: ResolveCredentialOfferUseCase,
        @Inject private readonly fetchOfferUseCase: FetchCredentialOfferUseCase,
        @Inject private readonly resolveFetchedOfferUseCase: ResolveFetchedCredentialOfferUseCase,
        @Inject private readonly fetchProofRequestUseCase: FetchProofRequestUseCase,
        @Inject private readonly accepProofRequestUseCase: AcceptProofRequestUseCase,
        @Inject private readonly executeDCQLQueryUseCase: ExecuteDCQLQueryUseCase,
        @Inject private readonly verifySharedCredentialUseCase: VerifySharedCredentialUseCase
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

    public async fetchProofRequest(request: FetchProofRequestRequest): Promise<Result<FetchedProofRequestDTO, ApplicationError>> {
        return await this.fetchProofRequestUseCase.execute(request);
    }

    public async acceptProofRequest(request: AcceptProofRequestRequest): Promise<Result<AcceptProofRequestDTO, ApplicationError>> {
        return await this.accepProofRequestUseCase.execute(request);
    }

    public async executeDCQLQuery(request: ExecuteDCQLQueryRequest): Promise<Result<ExecuteDCQLQueryResponse, ApplicationError>> {
        return await this.executeDCQLQueryUseCase.execute(request);
    }

    public async verifySharedCredential(request: VerifySharedCredentialRequest): Promise<Result<VerifySharedCredentialResponse>> {
        return await this.verifySharedCredentialUseCase.execute(request);
    }
}
