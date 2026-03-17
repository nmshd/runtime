import { Result } from "@js-soft/ts-utils";
import { AttributesController, OpenId4VcController } from "@nmshd/consumption";
import { VerifiableCredential } from "@nmshd/content";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { TokenDTO } from "@nmshd/runtime-types";
import { TokenController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { AttributeIdString, ISO8601DateTimeString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { TokenMapper } from "../../transport/tokens/TokenMapper";

export interface CreatePresentationTokenRequest {
    attributeId: AttributeIdString;
    expiresAt: ISO8601DateTimeString;
    ephemeral: boolean;
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

        // TODO: use ephemeral
        const emptyToken = await this.tokenController.sendEmptyToken({ expiresAt: CoreDate.from(request.expiresAt) });

        const presentationTokenContent = await this.openId4VcController.createPresentationTokenContent(attribute.content.value, emptyToken.id.toString());

        const presentationToken = await this.tokenController.updateTokenContent({
            id: emptyToken.id,
            secretKey: emptyToken.secretKey,
            content: presentationTokenContent,
            passwordProtection: emptyToken.passwordProtection
        });

        return Result.ok(TokenMapper.toTokenDTO(presentationToken, true));
    }
}
