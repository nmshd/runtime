import { Serializable } from "@js-soft/ts-serval";
import { Result } from "@js-soft/ts-utils";
import { TokenDTO } from "@nmshd/runtime-types";
import { AccountController, TokenController, TokenReference } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, SchemaRepository, SchemaValidator, TokenReferenceString, UseCase } from "../../common";
import { TokenMapper } from "./TokenMapper";

export interface UpdateTokenContentRequest {
    reference: TokenReferenceString;
    content: any;
}

class Validator extends SchemaValidator<UpdateTokenContentRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("UpdateTokenContentRequest"));
    }
}

export class UpdateTokenContentUseCase extends UseCase<UpdateTokenContentRequest, TokenDTO> {
    public constructor(
        @Inject private readonly tokenController: TokenController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: UpdateTokenContentRequest): Promise<Result<TokenDTO>> {
        let tokenContent;
        try {
            tokenContent = Serializable.fromUnknown(request.content);
        } catch {
            throw RuntimeErrors.general.invalidTokenContent();
        }

        const reference = TokenReference.fromTruncated(request.reference);

        const passwordProtection = reference.passwordProtection;
        if (passwordProtection && !passwordProtection.password) {
            throw new Error("RuntimeErrors.general.noPasswordProvided()");
        }

        const response = await this.tokenController.updateTokenContent({
            id: reference.id,
            content: tokenContent,
            secretKey: reference.key,
            passwordProtection: reference.passwordProtection!
        });

        return Result.ok(TokenMapper.toTokenDTO(response, true));
    }
}
