import { Result } from "@js-soft/ts-utils";
import { Inject } from "@nmshd/typescript-ioc";
import { TokenDTO } from "../../../types";
import {
    CreateOwnTokenRequest,
    CreateOwnTokenUseCase,
    DeleteTokenRequest,
    DeleteTokenUseCase,
    GetTokenRequest,
    GetTokensRequest,
    GetTokensUseCase,
    GetTokenUseCase,
    LoadPeerTokenRequest,
    LoadPeerTokenUseCase
} from "../../../useCases";

export class TokensFacade {
    public constructor(
        @Inject private readonly createOwnTokenUseCase: CreateOwnTokenUseCase,
        @Inject private readonly loadPeerTokenUseCase: LoadPeerTokenUseCase,
        @Inject private readonly getTokensUseCase: GetTokensUseCase,
        @Inject private readonly getTokenUseCase: GetTokenUseCase,
        @Inject private readonly deleteTokenUseCase: DeleteTokenUseCase
    ) {}

    public async createOwnToken(request: CreateOwnTokenRequest): Promise<Result<TokenDTO>> {
        return await this.createOwnTokenUseCase.execute(request);
    }

    public async loadPeerToken(request: LoadPeerTokenRequest): Promise<Result<TokenDTO>> {
        return await this.loadPeerTokenUseCase.execute(request);
    }

    public async getTokens(request: GetTokensRequest): Promise<Result<TokenDTO[]>> {
        return await this.getTokensUseCase.execute(request);
    }

    public async getToken(request: GetTokenRequest): Promise<Result<TokenDTO>> {
        return await this.getTokenUseCase.execute(request);
    }

    public async deleteToken(request: DeleteTokenRequest): Promise<Result<void>> {
        return await this.deleteTokenUseCase.execute(request);
    }
}
