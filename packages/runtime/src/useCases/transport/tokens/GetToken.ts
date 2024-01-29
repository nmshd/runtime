import { Result } from "@js-soft/ts-utils";
import { CoreId, TokenController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { TokenDTO } from "../../../types";
import { RuntimeErrors, SchemaRepository, SchemaValidator, TokenIdString, UseCase } from "../../common";
import { TokenMapper } from "./TokenMapper";

export interface GetTokenRequest {
    id: TokenIdString;
}

class Validator extends SchemaValidator<GetTokenRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetTokenRequest"));
    }
}

export class GetTokenUseCase extends UseCase<GetTokenRequest, TokenDTO> {
    public constructor(
        @Inject private readonly tokenController: TokenController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetTokenRequest): Promise<Result<TokenDTO>> {
        const token = await this.tokenController.getToken(CoreId.from(request.id));
        if (!token) {
            return Result.fail(RuntimeErrors.general.recordNotFound("Token"));
        }

        return Result.ok(TokenMapper.toTokenDTO(token, false));
    }
}
