import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreSerializable, ICoreAddress } from "../../../../core";
import { ICoreDate } from "../../../../core/types/CoreDate";
import { CoreId, ICoreId } from "../../../../core/types/CoreId";
import { BackboneGetRelationshipsChangesSingleChangeResponse } from "../../backbone/BackboneGetRelationshipsChanges";

export interface IRelationshipChangeRequest {
    createdBy: ICoreAddress;
    createdByDevice: ICoreId;
    createdAt: ICoreDate;
    content?: ISerializable;
}

@type("RelationshipChangeRequest")
export class RelationshipChangeRequest extends CoreSerializable implements IRelationshipChangeRequest {
    @validate()
    @serialize()
    public createdBy: CoreAddress;

    @validate()
    @serialize()
    public createdByDevice: CoreId;

    @validate()
    @serialize()
    public createdAt: CoreDate;

    @validate({ nullable: true })
    @serialize()
    public content?: Serializable;

    public static fromBackbone(backboneChange: BackboneGetRelationshipsChangesSingleChangeResponse, content?: ISerializable): RelationshipChangeRequest {
        return this.from({
            createdBy: CoreAddress.from(backboneChange.createdBy),
            createdByDevice: CoreId.from(backboneChange.createdByDevice),
            createdAt: CoreDate.from(backboneChange.createdAt),
            content: content
        });
    }

    public static from(value: IRelationshipChangeRequest): RelationshipChangeRequest {
        return this.fromAny(value);
    }
}
