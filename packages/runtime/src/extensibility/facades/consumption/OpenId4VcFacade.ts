import { Result } from "@js-soft/ts-utils";
import { TokenDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import {
    AcceptAuthorizationRequestRequest,
    AcceptAuthorizationRequestResponse,
    AcceptAuthorizationRequestUseCase,
    CreatePresentationTokenRequest,
    CreatePresentationTokenUseCase,
    ResolveAuthorizationRequestRequest,
    ResolveAuthorizationRequestResponse,
    ResolveAuthorizationRequestUseCase
} from "../../../useCases";

export class OpenId4VcFacade {
    public constructor(
        @Inject private readonly resolveAuthorizationRequestUseCase: ResolveAuthorizationRequestUseCase,
        @Inject private readonly acceptAuthorizationRequestUseCase: AcceptAuthorizationRequestUseCase,
        @Inject private readonly createPresentationTokenUseCase: CreatePresentationTokenUseCase
    ) {}

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
