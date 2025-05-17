import { Result } from "@js-soft/ts-utils";
import { AttributesController, AttributeSuccessorParamsJSON, ConsumptionCoreErrors } from "@nmshd/consumption";
import { AttributeValues } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { LocalAttributeDTO } from "../../../types";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface SucceedRepositoryAttributeResponse {
    predecessor: LocalAttributeDTO;
    successor: LocalAttributeDTO;
}

export interface SucceedRepositoryAttributeRequest {
    predecessorId: string;
    successorContent: {
        value: AttributeValues.Identity.Json;
        tags?: string[];
    };
}

class Validator extends SchemaValidator<SucceedRepositoryAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("SucceedRepositoryAttributeRequest"));
    }
}

export class SucceedRepositoryAttributeUseCase extends UseCase<SucceedRepositoryAttributeRequest, SucceedRepositoryAttributeResponse> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: SucceedRepositoryAttributeRequest): Promise<Result<SucceedRepositoryAttributeResponse>> {
        const predecessor = await this.attributeController.getLocalAttribute(CoreId.from(request.predecessorId));
        if (!predecessor) return Result.fail(ConsumptionCoreErrors.attributes.predecessorDoesNotExist());

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

        const response: SucceedRepositoryAttributeResponse = {
            predecessor: AttributeMapper.toAttributeDTO(updatedPredecessor),
            successor: AttributeMapper.toAttributeDTO(successor)
        };
        return Result.ok(response);
    }
}
