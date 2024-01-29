import { Result } from "@js-soft/ts-utils";
import { AnonymousTokenController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { TokenDTO } from "../../../types";
import { SchemaRepository, SchemaValidator, TokenReferenceString, UseCase } from "../../common";
import { TokenMapper } from "../../transport/tokens/TokenMapper";

export interface LoadPeerTokenAnonymousByTruncatedReferenceRequest {
    reference: TokenReferenceString;
}

class Validator extends SchemaValidator<LoadPeerTokenAnonymousByTruncatedReferenceRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("LoadPeerTokenAnonymousByTruncatedReferenceRequest"));
    }
}

export class LoadPeerTokenAnonymousByTruncatedReferenceUseCase extends UseCase<LoadPeerTokenAnonymousByTruncatedReferenceRequest, TokenDTO> {
    public constructor(
        @Inject private readonly anonymousTokenController: AnonymousTokenController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: LoadPeerTokenAnonymousByTruncatedReferenceRequest): Promise<Result<TokenDTO>> {
        const createdToken = await this.anonymousTokenController.loadPeerTokenByTruncated(request.reference);
        return Result.ok(TokenMapper.toTokenDTO(createdToken, true));
    }
}
