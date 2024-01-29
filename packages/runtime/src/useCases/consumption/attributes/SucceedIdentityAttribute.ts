import { Result } from "@js-soft/ts-utils";
import { AttributesController, AttributeSuccessorParamsJSON, CoreErrors } from "@nmshd/consumption";
import { AttributeValues } from "@nmshd/content";
import { AccountController, CoreId } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { LocalAttributeDTO } from "../../../types";
import { ISO8601DateTimeString, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface SucceedIdentityAttributeResponse {
    predecessor: LocalAttributeDTO;
    successor: LocalAttributeDTO;
}

export interface SucceedIdentityAttributeRequest {
    predecessorId: string;
    successorContent: {
        value: AttributeValues.Identity.Json;
        tags?: string[];
        validFrom?: ISO8601DateTimeString;
        validTo?: ISO8601DateTimeString;
    };
}

class Validator extends SchemaValidator<SucceedIdentityAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("SucceedIdentityAttributeRequest"));
    }
}

export class SucceedIdentityAttributeUseCase extends UseCase<SucceedIdentityAttributeRequest, SucceedIdentityAttributeResponse> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: SucceedIdentityAttributeRequest): Promise<Result<SucceedIdentityAttributeResponse>> {
        const predecessor = await this.attributeController.getLocalAttribute(CoreId.from(request.predecessorId));
        if (typeof predecessor === "undefined") {
            return Result.fail(CoreErrors.attributes.predecessorDoesNotExist());
        }

        const successorParams: AttributeSuccessorParamsJSON = {
            content: {
                "@type": "IdentityAttribute",
                owner: this.accountController.identity.address.toString(),
                ...request.successorContent
            },
            succeeds: predecessor.id.toString()
        };
        const predecessorId = CoreId.from(request.predecessorId);
        const validationResult = await this.attributeController.validateRepositoryAttributeSuccession(predecessorId, successorParams);
        if (validationResult.isError()) {
            return Result.fail(validationResult.error);
        }

        const { predecessor: updatedPredecessor, successor } = await this.attributeController.succeedRepositoryAttribute(predecessorId, successorParams, false);
        await this.accountController.syncDatawallet();

        const response: SucceedIdentityAttributeResponse = {
            predecessor: AttributeMapper.toAttributeDTO(updatedPredecessor),
            successor: AttributeMapper.toAttributeDTO(successor)
        };
        return Result.ok(response);
    }
}
