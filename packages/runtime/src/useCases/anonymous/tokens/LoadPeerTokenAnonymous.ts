import { Result } from "@js-soft/ts-utils";
import { AnonymousTokenController, TokenReference } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { TokenDTO } from "../../../types";
import { SchemaRepository, SchemaValidator, TokenReferenceString, UseCase } from "../../common";
import { TokenMapper } from "../../transport/tokens/TokenMapper";

export interface LoadPeerTokenAnonymousRequest {
    reference: TokenReferenceString;
    password?: string;
}

class Validator extends SchemaValidator<LoadPeerTokenAnonymousRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("LoadPeerTokenAnonymousRequest"));
    }
}

export class LoadPeerTokenAnonymousUseCase extends UseCase<LoadPeerTokenAnonymousRequest, TokenDTO> {
    public constructor(
        @Inject private readonly anonymousTokenController: AnonymousTokenController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: LoadPeerTokenAnonymousRequest): Promise<Result<TokenDTO>> {
        const createdToken = await this.anonymousTokenController.loadPeerTokenByReference(TokenReference.from(request.reference), request.password);
        return Result.ok(TokenMapper.toTokenDTO(createdToken, true));
    }
}
