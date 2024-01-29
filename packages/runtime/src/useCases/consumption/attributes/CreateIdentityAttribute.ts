import { Result } from "@js-soft/ts-utils";
import { AttributesController, CreateLocalAttributeParams } from "@nmshd/consumption";
import { AttributeValues } from "@nmshd/content";
import { AccountController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalAttributeDTO } from "../../../types";
import { ISO8601DateTimeString, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface CreateIdentityAttributeRequest {
    content: {
        value: AttributeValues.Identity.Json;
        tags?: string[];
        validFrom?: ISO8601DateTimeString;
        validTo?: ISO8601DateTimeString;
    };
}

class Validator extends SchemaValidator<CreateIdentityAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateIdentityAttributeRequest"));
    }
}

export class CreateIdentityAttributeUseCase extends UseCase<CreateIdentityAttributeRequest, LocalAttributeDTO> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateIdentityAttributeRequest): Promise<Result<LocalAttributeDTO>> {
        const params = CreateLocalAttributeParams.from({
            content: {
                "@type": "IdentityAttribute",
                owner: this.accountController.identity.address.toString(),
                ...request.content
            }
        });
        const createdAttribute = await this.attributeController.createLocalAttribute(params);
        await this.accountController.syncDatawallet();

        return Result.ok(AttributeMapper.toAttributeDTO(createdAttribute));
    }
}
