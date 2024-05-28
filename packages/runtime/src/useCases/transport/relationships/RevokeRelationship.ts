import { Result } from "@js-soft/ts-utils";
import { AccountController, CoreId, RelationshipsController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RelationshipDTO } from "../../../types";
import { RelationshipIdString, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { RelationshipMapper } from "./RelationshipMapper";

export interface RevokeRelationshipRequest {
    relationshipId: RelationshipIdString;
}

class Validator extends SchemaValidator<RevokeRelationshipRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("RevokeRelationshipRequest"));
    }
}

export class RevokeRelationshipUseCase extends UseCase<RevokeRelationshipRequest, RelationshipDTO> {
    public constructor(
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: RevokeRelationshipRequest): Promise<Result<RelationshipDTO>> {
        const updatedRelationship = await this.relationshipsController.revoke(CoreId.from(request.relationshipId));
        await this.accountController.syncDatawallet();
        return Result.ok(RelationshipMapper.toRelationshipDTO(updatedRelationship));
    }
}
