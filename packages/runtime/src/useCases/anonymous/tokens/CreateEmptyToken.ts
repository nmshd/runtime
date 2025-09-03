import { Result } from "@js-soft/ts-utils";
import { EmptyTokenDTO } from "@nmshd/runtime-types";
import { AnonymousTokenController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { UseCase } from "../../common";
import { TokenMapper } from "../../transport/tokens/TokenMapper";

export class CreateEmptyTokenUseCase extends UseCase<void, EmptyTokenDTO> {
    public constructor(@Inject private readonly anonymousTokenController: AnonymousTokenController) {
        super();
    }

    protected async executeInternal(): Promise<Result<EmptyTokenDTO>> {
        const createdToken = await this.anonymousTokenController.createEmptyToken();
        return Result.ok(TokenMapper.toEmptyTokenDTO(createdToken, true));
    }
}
