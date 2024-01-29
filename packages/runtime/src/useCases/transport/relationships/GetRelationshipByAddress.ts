import { Result } from "@js-soft/ts-utils";
import { CoreAddress, Relationship, RelationshipsController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RelationshipDTO } from "../../../types";
import { AddressString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { RelationshipMapper } from "./RelationshipMapper";

export interface GetRelationshipByAddressRequest {
    address: AddressString;
}

class Validator extends SchemaValidator<GetRelationshipByAddressRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetRelationshipByAddressRequest"));
    }
}

export class GetRelationshipByAddressUseCase extends UseCase<GetRelationshipByAddressRequest, RelationshipDTO> {
    public constructor(
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetRelationshipByAddressRequest): Promise<Result<RelationshipDTO>> {
        const relationship = await this.relationshipsController.getRelationshipToIdentity(CoreAddress.from(request.address));
        if (!relationship) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Relationship));
        }

        return Result.ok(RelationshipMapper.toRelationshipDTO(relationship));
    }
}
