import { ISerializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreSerializable, ICoreSerializable } from "../../../../core";
import { CoreId, ICoreId } from "../../../../core/types/CoreId";
import { BackboneGetRelationshipsChangesResponse } from "../../backbone/BackboneGetRelationshipsChanges";
import { IRelationshipChangeRequest, RelationshipChangeRequest } from "./RelationshipChangeRequest";
import { IRelationshipChangeResponse, RelationshipChangeResponse } from "./RelationshipChangeResponse";
import { RelationshipChangeStatus } from "./RelationshipChangeStatus";
import { RelationshipChangeType } from "./RelationshipChangeType";

export interface IRelationshipChange extends ICoreSerializable {
    id: ICoreId;
    relationshipId: ICoreId;
    request: IRelationshipChangeRequest;
    response?: IRelationshipChangeResponse;
    status: RelationshipChangeStatus;
    type: RelationshipChangeType;
}

@type("RelationshipChange")
export class RelationshipChange extends CoreSerializable implements IRelationshipChange {
    @validate()
    @serialize()
    public id: CoreId;

    @validate()
    @serialize()
    public relationshipId: CoreId;

    @validate()
    @serialize()
    public request: RelationshipChangeRequest;

    @validate({ nullable: true })
    @serialize()
    public response?: RelationshipChangeResponse;

    @validate()
    @serialize()
    public status: RelationshipChangeStatus;

    @validate()
    @serialize()
    public type: RelationshipChangeType;

    public static fromBackbone(backboneChange: BackboneGetRelationshipsChangesResponse, requestContent?: ISerializable, responseContent?: ISerializable): RelationshipChange {
        const relationshipChange = this.from({
            id: CoreId.from(backboneChange.id),
            relationshipId: CoreId.from(backboneChange.relationshipId),
            type: backboneChange.type,
            status: backboneChange.status,
            request: RelationshipChangeRequest.fromBackbone(backboneChange.request, requestContent)
        });

        if (backboneChange.response) {
            relationshipChange.response = RelationshipChangeResponse.fromBackbone(backboneChange.response, responseContent);
        }

        return relationshipChange;
    }

    public static from(value: IRelationshipChange): RelationshipChange {
        return this.fromAny(value);
    }
}
