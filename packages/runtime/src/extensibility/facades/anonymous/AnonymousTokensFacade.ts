import { ApplicationError, Result } from "@js-soft/ts-utils";
import { EmptyTokenDTO, TokenDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { CreateEmptyTokenUseCase, LoadPeerTokenAnonymousRequest, LoadPeerTokenAnonymousUseCase } from "../../../useCases/index.js";

export class AnonymousTokensFacade {
    public constructor(
        @Inject private readonly loadPeerTokenUseCase: LoadPeerTokenAnonymousUseCase,
        @Inject private readonly createEmptyTokenUseCase: CreateEmptyTokenUseCase
    ) {}

    public async loadPeerToken(request: LoadPeerTokenAnonymousRequest): Promise<Result<TokenDTO, ApplicationError>> {
        return await this.loadPeerTokenUseCase.execute(request);
    }

    public async createEmptyToken(): Promise<Result<EmptyTokenDTO, ApplicationError>> {
        return await this.createEmptyTokenUseCase.execute();
    }
}
