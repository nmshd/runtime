import { Result } from "@js-soft/ts-utils";
import { AttributesController, LocalAttribute } from "@nmshd/consumption";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { TokenDTO } from "@nmshd/runtime-types";
import { TokenController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { TokenMapper } from "../../transport";

export interface CreateTokenForAttributeRequest {
    attributeId: string;
}

class Validator extends SchemaValidator<CreateTokenForAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateTokenForAttributeRequest"));
    }
}

export class CreateTokenForAttributeUseCase extends UseCase<CreateTokenForAttributeRequest, TokenDTO> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject private readonly tokenController: TokenController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateTokenForAttributeRequest): Promise<Result<TokenDTO>> {
        const attribute = await this.attributesController.getLocalAttribute(CoreId.from(request.attributeId));

        if (!attribute) {
            return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));
        }

        const token = await this.tokenController.sendToken({
            content: attribute.content.value,
            expiresAt: CoreDate.utc().add({ minutes: 1 }),
            ephemeral: true
        });

        return Result.ok(TokenMapper.toTokenDTO(token, true));
    }
}
