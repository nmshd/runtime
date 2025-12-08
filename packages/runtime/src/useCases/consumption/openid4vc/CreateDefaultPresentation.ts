import { Result } from "@js-soft/ts-utils";
import { AttributesController, OpenId4VcController } from "@nmshd/consumption";
import { VerifiableCredential } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface CreateDefaultPresentationRequest {
    attributeId: string;
}

export interface CreateDefaultPresentationResponse {
    presentation: string;
}

class Validator extends SchemaValidator<CreateDefaultPresentationRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateDefaultPresentationRequest"));
    }
}

export class CreateDefaultPresentationUseCase extends UseCase<CreateDefaultPresentationRequest, CreateDefaultPresentationResponse> {
    public constructor(
        @Inject private readonly openId4VcController: OpenId4VcController,
        @Inject private readonly attributesController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: CreateDefaultPresentationRequest): Promise<Result<CreateDefaultPresentationResponse>> {
        const attribute = await this.attributesController.getLocalAttribute(CoreId.from(request.attributeId));
        if (!(attribute?.content.value instanceof VerifiableCredential)) return Result.fail(RuntimeErrors.general.recordNotFound("Attribute with Verifiable Credential"));

        const result = await this.openId4VcController.createDefaultPresentation(attribute.content.value);
        return Result.ok({ presentation: result });
    }
}
