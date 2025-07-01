import { ApplicationError, Result } from "@js-soft/ts-utils";
import { TokenDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { LoadPeerTokenAnonymousRequest, LoadPeerTokenAnonymousUseCase } from "../../../useCases";

export class AnonymousTokensFacade {
    public constructor(@Inject private readonly loadPeerTokenUseCase: LoadPeerTokenAnonymousUseCase) {}

    public async loadPeerToken(request: LoadPeerTokenAnonymousRequest): Promise<Result<TokenDTO, ApplicationError>> {
        return await this.loadPeerTokenUseCase.execute(request);
    }
}
