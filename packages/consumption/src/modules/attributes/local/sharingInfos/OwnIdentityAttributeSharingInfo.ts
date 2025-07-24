import { serialize, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";
import { AbstractAttributeSharingInfo, AbstractAttributeSharingInfoJSON, IAbstractAttributeSharingInfo } from "./AbstractAttributeSharingInfo";
import { ForwardedAttributeDeletionInfo, ForwardedAttributeDeletionInfoJSON, IForwardedAttributeDeletionInfo } from "./deletionInfos";

export interface OwnIdentityAttributeSharingInfoJSON extends AbstractAttributeSharingInfoJSON {
    sharedAt: string;
    deletionInfo?: ForwardedAttributeDeletionInfoJSON;
}

export interface IOwnIdentityAttributeSharingInfo extends IAbstractAttributeSharingInfo {
    sharedAt: ICoreDate;
    deletionInfo?: IForwardedAttributeDeletionInfo;
}

export class OwnIdentityAttributeSharingInfo extends AbstractAttributeSharingInfo implements IOwnIdentityAttributeSharingInfo {
    @serialize()
    @validate()
    public sharedAt: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public override deletionInfo?: ForwardedAttributeDeletionInfo;

    public static from(value: IOwnIdentityAttributeSharingInfo | OwnIdentityAttributeSharingInfoJSON): OwnIdentityAttributeSharingInfo {
        return super.fromAny(value) as OwnIdentityAttributeSharingInfo;
    }
}
