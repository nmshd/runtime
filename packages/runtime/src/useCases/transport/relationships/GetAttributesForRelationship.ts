import { Result } from "@js-soft/ts-utils";
import { AttributesController, ForwardableAttribute } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { Relationship, RelationshipsController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { RelationshipIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "../../consumption";

export interface GetAttributesForRelationshipRequest {
    id: RelationshipIdString;
    hideTechnical?: boolean;
    /**
     * default: true
     */
    onlyLatestVersions?: boolean;
}

export interface GetAttributesForRelationshipResponse extends Array<LocalAttributeDTO> {}

class Validator extends SchemaValidator<GetAttributesForRelationshipRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetAttributesForRelationshipRequest"));
    }
}

export class GetAttributesForRelationshipUseCase extends UseCase<GetAttributesForRelationshipRequest, GetAttributesForRelationshipResponse> {
    public constructor(
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject private readonly attributesController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetAttributesForRelationshipRequest): Promise<Result<GetAttributesForRelationshipResponse>> {
        const relationship = await this.relationshipsController.getRelationship(CoreId.from(request.id));
        if (!relationship) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Relationship));
        }

        const peerAddress = relationship.peer.address.toString();
        const queryForAttributesWithPeerSharingInfo: any = {
            "peerSharingInfo.peer": peerAddress
        };

        const queryForForwardedAttributes: any = {
            "@type": { $in: ["OwnIdentityAttribute", "OwnRelationshipAttribute", "PeerRelationshipAttribute"] },
            "forwardedSharingInfos.peer": relationship.peer.address.toString()
        };

        if (request.onlyLatestVersions ?? true) {
            queryForAttributesWithPeerSharingInfo["succeededBy"] = { $exists: false };
            queryForForwardedAttributes["succeededBy"] = { $exists: false };
        }

        const attributes = await this.attributesController.getLocalAttributes(queryForAttributesWithPeerSharingInfo, request.hideTechnical);
        const forwardedAttributes = (await this.attributesController.getLocalAttributes(queryForForwardedAttributes)) as ForwardableAttribute[];
        attributes.push(...forwardedAttributes);

        return Result.ok(AttributeMapper.toAttributeDTOList(attributes));
    }
}
