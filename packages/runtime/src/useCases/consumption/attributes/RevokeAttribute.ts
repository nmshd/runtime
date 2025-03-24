import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { IdentityAttribute, IdentityAttributeJSON } from "@nmshd/content";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface RevokeAttributeRequest {
    attribute: IdentityAttributeJSON;
}

class Validator extends SchemaValidator<RevokeAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("RevokeAttributeRequest"));
    }
}

export class RevokeAttributeUseCase extends UseCase<RevokeAttributeRequest, unknown> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: RevokeAttributeRequest): Promise<Result<unknown>> {
        const attribute = IdentityAttribute.from(request.attribute);

        const revokedStatusCredential = await this.attributeController.revokeAttribute(attribute);
        return Result.ok(revokedStatusCredential);
    }
}
