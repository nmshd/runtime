import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId, ICoreAddress, ICoreDate, ICoreId } from "@nmshd/core-types";
import { IOwnAttributeDeletionInfo, OwnAttributeDeletionInfo, OwnAttributeDeletionInfoJSON } from "./OwnAttributeDeletionInfo";

export interface OwnIdentityAttributeSharingInfoJSON {
    peer: string;
    sourceReference: string;
    sharedAt: string;
    deletionInfo?: OwnAttributeDeletionInfoJSON;
}

export interface IOwnIdentityAttributeSharingInfo extends ISerializable {
    peer: ICoreAddress;
    sourceReference: ICoreId;
    sharedAt: ICoreDate;
    deletionInfo?: IOwnAttributeDeletionInfo;
}

export class OwnIdentityAttributeSharingInfo extends Serializable implements IOwnIdentityAttributeSharingInfo {
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

    public static from(value: IOwnIdentityAttributeSharingInfo | OwnIdentityAttributeSharingInfoJSON): OwnIdentityAttributeSharingInfo {
        return super.fromAny(value) as OwnIdentityAttributeSharingInfo;
    }
}
