import { Result } from "@js-soft/ts-utils";
import { CryptoSecretKey } from "@nmshd/crypto";
import { AnonymousTokenController, CoreId } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { TokenDTO } from "../../../types";
import { SchemaRepository, SchemaValidator, TokenIdString, UseCase } from "../../common";
import { TokenMapper } from "../../transport/tokens/TokenMapper";

export interface LoadPeerTokenAnonymousByIdAndKeyRequest {
    id: TokenIdString;
    secretKey: string;
}

class Validator extends SchemaValidator<LoadPeerTokenAnonymousByIdAndKeyRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("LoadPeerTokenAnonymousByIdAndKeyRequest"));
    }
}

export class LoadPeerTokenAnonymousByIdAndKeyUseCase extends UseCase<LoadPeerTokenAnonymousByIdAndKeyRequest, TokenDTO> {
    public constructor(
        @Inject private readonly anonymousTokenController: AnonymousTokenController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: LoadPeerTokenAnonymousByIdAndKeyRequest): Promise<Result<TokenDTO>> {
        const key = CryptoSecretKey.fromBase64(request.secretKey);
        const createdToken = await this.anonymousTokenController.loadPeerToken(CoreId.from(request.id), key);

        return Result.ok(TokenMapper.toTokenDTO(createdToken, true));
    }
}
