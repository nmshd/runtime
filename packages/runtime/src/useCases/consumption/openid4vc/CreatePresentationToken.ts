import { Result } from "@js-soft/ts-utils";
import { AttributesController, OpenId4VcController } from "@nmshd/consumption";
import { VerifiableCredential } from "@nmshd/content";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { TokenDTO } from "@nmshd/runtime-types";
import { TokenController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { TokenMapper } from "../../transport";

export interface CreatePresentationTokenRequest {
    attributeId: string;
}

class Validator extends SchemaValidator<CreatePresentationTokenRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreatePresentationTokenRequest"));
    }
}

export class CreatePresentationTokenUseCase extends UseCase<CreatePresentationTokenRequest, TokenDTO> {
    public constructor(
        @Inject private readonly openId4VcController: OpenId4VcController,
        @Inject private readonly attributesController: AttributesController,
        @Inject private readonly tokenController: TokenController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: CreatePresentationTokenRequest): Promise<Result<TokenDTO>> {
        const attribute = await this.attributesController.getLocalAttribute(CoreId.from(request.attributeId));
        if (!(attribute?.content.value instanceof VerifiableCredential)) return Result.fail(RuntimeErrors.general.recordNotFound("Attribute with Verifiable Credential"));

        const presentation = await this.openId4VcController.createDefaultPresentation(attribute.content.value);

        const token = await this.tokenController.sendToken({
            content: presentation.toJSON(),
            expiresAt: CoreDate.utc().add({ minutes: 1 }),
            ephemeral: true
        });

        return Result.ok(TokenMapper.toTokenDTO(token, true));
    }
}
