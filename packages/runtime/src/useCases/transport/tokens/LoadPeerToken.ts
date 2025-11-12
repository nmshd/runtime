import { Result } from "@js-soft/ts-utils";
import { TokenDTO } from "@nmshd/runtime-types";
import { AccountController, TokenController, TokenReference } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, TokenReferenceString, URLTokenReferenceString, UseCase } from "../../common/index.js";
import { TokenMapper } from "./TokenMapper.js";

/**
 * @errorMessage token reference invalid
 */
export interface LoadPeerTokenRequest {
    reference: TokenReferenceString | URLTokenReferenceString;
    ephemeral: boolean;
    password?: string;
}

class Validator extends SchemaValidator<LoadPeerTokenRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("LoadPeerTokenRequest"));
    }
}

export class LoadPeerTokenUseCase extends UseCase<LoadPeerTokenRequest, TokenDTO> {
    public constructor(
        @Inject private readonly tokenController: TokenController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: LoadPeerTokenRequest): Promise<Result<TokenDTO>> {
        const result = await this.tokenController.loadPeerTokenByReference(TokenReference.from(request.reference), request.ephemeral, request.password);

        if (!request.ephemeral) {
            await this.accountController.syncDatawallet();
        }

        return Result.ok(TokenMapper.toTokenDTO(result, request.ephemeral));
    }
}
