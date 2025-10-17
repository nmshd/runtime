import { Result } from "@js-soft/ts-utils";
import { AttributesController, ConsumptionCoreErrors, OwnIdentityAttribute, OwnIdentityAttributeSuccessorParamsJSON } from "@nmshd/consumption";
import { AttributeValues } from "@nmshd/content";
import { CoreId } from "@nmshd/core-types";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface SucceedOwnIdentityAttributeResponse {
    predecessor: LocalAttributeDTO;
    successor: LocalAttributeDTO;
}

export interface SucceedOwnIdentityAttributeRequest {
    predecessorId: string;
    successorContent: {
        value: AttributeValues.Identity.Json;
        tags?: string[];
    };
}

class Validator extends SchemaValidator<SucceedOwnIdentityAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("SucceedOwnIdentityAttributeRequest"));
    }
}

export class SucceedOwnIdentityAttributeUseCase extends UseCase<SucceedOwnIdentityAttributeRequest, SucceedOwnIdentityAttributeResponse> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: SucceedOwnIdentityAttributeRequest): Promise<Result<SucceedOwnIdentityAttributeResponse>> {
        const predecessor = await this.attributeController.getLocalAttribute(CoreId.from(request.predecessorId));
        if (!predecessor) return Result.fail(ConsumptionCoreErrors.attributes.predecessorDoesNotExist());

        if (!(predecessor instanceof OwnIdentityAttribute)) return Result.fail(RuntimeErrors.attributes.isNotOwnIdentityAttribute(request.predecessorId));

        const successorParams: OwnIdentityAttributeSuccessorParamsJSON = {
            content: {
                "@type": "IdentityAttribute",
                owner: this.accountController.identity.address.toString(),
                ...request.successorContent
            }
        };

        const validationResult = await this.attributeController.validateOwnIdentityAttributeSuccession(predecessor, successorParams);
        if (validationResult.isError()) return Result.fail(validationResult.error);

        const { predecessor: updatedPredecessor, successor } = await this.attributeController.succeedOwnIdentityAttribute(predecessor, successorParams, false);
        await this.accountController.syncDatawallet();

        const response: SucceedOwnIdentityAttributeResponse = {
            predecessor: AttributeMapper.toAttributeDTO(updatedPredecessor),
            successor: AttributeMapper.toAttributeDTO(successor)
        };
        return Result.ok(response);
    }
}
