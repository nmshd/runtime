import { Result } from "@js-soft/ts-utils";
import { AttributesController, CreateSharedLocalAttributeParams, CreateSharedLocalAttributeParamsJSON } from "@nmshd/consumption";
import { IdentityAttributeJSON, RelationshipAttributeJSON } from "@nmshd/content";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "../attributes";

export interface CreateSharedLocalAttributeRequest {
    id: string;
    peer: string;
    requestReference: string;
    content: IdentityAttributeJSON | RelationshipAttributeJSON;
}

class Validator extends SchemaValidator<CreateSharedLocalAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateSharedLocalAttributeRequest"));
    }
}

export class CreateSharedLocalAttributeUseCase extends UseCase<CreateSharedLocalAttributeRequest, LocalAttributeDTO> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateSharedLocalAttributeRequest): Promise<Result<LocalAttributeDTO>> {
        const attribute = await this.attributesController.createSharedLocalAttribute(CreateSharedLocalAttributeParams.from(request as CreateSharedLocalAttributeParamsJSON));

        return Result.ok(AttributeMapper.toAttributeDTO(attribute));
    }
}
