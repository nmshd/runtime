import { Result } from "@js-soft/ts-utils";
import { AttributesController, CreateRepositoryAttributeParams } from "@nmshd/consumption";
import { AttributeValues } from "@nmshd/content";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { LocalAttributeDTO } from "../../../types";
import { flattenObject, ISO8601DateTimeString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface CreateRepositoryAttributeRequest {
    content: {
        value: AttributeValues.Identity.Json;
        tags?: string[];
        validFrom?: ISO8601DateTimeString;
        validTo?: ISO8601DateTimeString;
    };
}

class Validator extends SchemaValidator<CreateRepositoryAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateRepositoryAttributeRequest"));
    }
}

export class CreateRepositoryAttributeUseCase extends UseCase<CreateRepositoryAttributeRequest, LocalAttributeDTO> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateRepositoryAttributeRequest): Promise<Result<LocalAttributeDTO>> {
        const params = CreateRepositoryAttributeParams.from({
            content: {
                "@type": "IdentityAttribute",
                owner: this.accountController.identity.address.toString(),
                ...request.content
            }
        });
        const queryWithoutOptionalRequestProperties = flattenObject({
            content: {
                "@type": "IdentityAttribute",
                owner: this.accountController.identity.address.toString(),
                value: request.content.value
            }
        });
        const existingAttribute = await this.attributeController.getLocalAttributes(queryWithoutOptionalRequestProperties);
        if (existingAttribute.length > 0) {
            return Result.fail(RuntimeErrors.attributes.cannotCreateDuplicateRepositoryAttribute(existingAttribute[0].id));
        }

        const createdLocalAttribute = await this.attributeController.createRepositoryAttribute(params);

        await this.accountController.syncDatawallet();

        return Result.ok(AttributeMapper.toAttributeDTO(createdLocalAttribute));
    }
}
