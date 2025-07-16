import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, ICoreAddress, ICoreDate, ICoreId } from "@nmshd/core-types";
import { IOwnAttributeDeletionInfo, OwnAttributeDeletionInfo, OwnAttributeDeletionInfoJSON } from "./OwnAttributeDeletionInfo";

export interface OwnRelationshipAttributeSharingInfoJSON {
    peer: string;
    sourceReference: string;
    sharedAt: string;
    deletionInfo?: OwnAttributeDeletionInfoJSON;
}

export interface IOwnRelationshipAttributeSharingInfo extends ISerializable {
    peer: ICoreAddress;
    sourceReference: ICoreId;
    sharedAt: ICoreDate;
    deletionInfo?: IOwnAttributeDeletionInfo;
}

export class OwnRelationshipAttributeSharingInfo extends Serializable implements IOwnRelationshipAttributeSharingInfo {
    @validate()
    @serialize()
    public peer: CoreAddress;

    @serialize()
    @validate()
    public sourceReference: CoreId;

    @serialize()
    @validate()
    public sharedAt: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public deletionInfo?: OwnAttributeDeletionInfo;

    public static from(value: IOwnRelationshipAttributeSharingInfo | OwnRelationshipAttributeSharingInfoJSON): OwnRelationshipAttributeSharingInfo {
        return super.fromAny(value) as OwnRelationshipAttributeSharingInfo;
    }
}
