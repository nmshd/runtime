import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, ICoreAddress, ICoreDate, ICoreId } from "@nmshd/core-types";
import {
    ForwardedRelationshipAttributeDeletionInfo,
    ForwardedRelationshipAttributeDeletionInfoJSON,
    IForwardedRelationshipAttributeDeletionInfo
} from "./ForwardedRelationshipAttributeDeletionInfo";

// TODO: we should probably have a(n abstract) base class for AttributeSharingInfo that these other classes extend from
// TODO: also we should improve the folder structure
export interface ForwardedRelationshipAttributeSharingInfoJSON {
    peer: string;
    sourceReference: string;
    sharedAt: string;
    deletionInfo?: ForwardedRelationshipAttributeDeletionInfoJSON;
}

export interface IForwardedRelationshipAttributeSharingInfo extends ISerializable {
    peer: ICoreAddress;
    sourceReference: ICoreId;
    sharedAt: ICoreDate;
    deletionInfo?: IForwardedRelationshipAttributeDeletionInfo;
}

export class ForwardedRelationshipAttributeSharingInfo extends Serializable implements IForwardedRelationshipAttributeSharingInfo {
    @serialize()
    @validate()
    public peer: CoreAddress;

    @serialize()
    @validate()
    public sourceReference: CoreId;

    @serialize()
    @validate()
    public sharedAt: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public deletionInfo?: ForwardedRelationshipAttributeDeletionInfo;

    public static from(value: IForwardedRelationshipAttributeSharingInfo | ForwardedRelationshipAttributeSharingInfoJSON): ForwardedRelationshipAttributeSharingInfo {
        return super.fromAny(value) as ForwardedRelationshipAttributeSharingInfo;
    }
}
