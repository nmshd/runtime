import { Result } from "@js-soft/ts-utils";
import { CoreAddress, IdentityController, RelationshipsController, RelationshipStatus } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { RelationshipDTO } from "../../../types";
import { AddressString, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { RelationshipMapper } from "../relationships/RelationshipMapper";

export interface CheckIdentityRequest {
    address: AddressString;
}

export interface CheckIdentityResponse {
    unknown?: boolean;
    self?: boolean;
    peer?: boolean;
    relationshipPending?: boolean;
    relationshipActive?: boolean;
    relationshipTerminated?: boolean;
    relationship?: RelationshipDTO;
}

class Validator extends SchemaValidator<CheckIdentityRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CheckIdentityRequest"));
    }
}

export class CheckIdentityUseCase extends UseCase<CheckIdentityRequest, CheckIdentityResponse> {
    public constructor(
        @Inject private readonly identityController: IdentityController,
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CheckIdentityRequest): Promise<Result<CheckIdentityResponse>> {
        const address = CoreAddress.from(request.address);
        const self = this.identityController.isMe(address);

        if (self) {
            return Result.ok({
                self: true
            });
        }

        const relationship = await this.relationshipsController.getRelationshipToIdentity(address);
        if (relationship) {
            const relationshipDTO = RelationshipMapper.toRelationshipDTO(relationship);
            if (relationship.status === RelationshipStatus.Pending) {
                return Result.ok({
                    peer: true,
                    relationshipPending: true,
                    relationship: relationshipDTO
                });
            } else if (relationship.status === RelationshipStatus.Active || relationship.status === RelationshipStatus.Terminating) {
                return Result.ok({
                    peer: true,
                    relationshipActive: true,
                    relationship: relationshipDTO
                });
            }

            return Result.ok({
                peer: true,
                relationshipTerminated: true,
                relationship: relationshipDTO
            });
        }

        return Result.ok({
            unknown: true
        });
    }
}
