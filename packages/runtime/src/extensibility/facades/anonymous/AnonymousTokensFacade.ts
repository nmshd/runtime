import { ApplicationError, Result } from "@js-soft/ts-utils";
import { Inject } from "@nmshd/typescript-ioc";
import { TokenDTO } from "../../../types";
import { LoadPeerTokenAnonymousRequest, LoadPeerTokenAnonymousUseCase } from "../../../useCases";

export class AnonymousTokensFacade {
    public constructor(@Inject private readonly loadPeerTokenUseCase: LoadPeerTokenAnonymousUseCase) {}

    public async loadPeerToken(request: LoadPeerTokenAnonymousRequest): Promise<Result<TokenDTO, ApplicationError>> {
        return await this.loadPeerTokenUseCase.execute(request);
    }
}
