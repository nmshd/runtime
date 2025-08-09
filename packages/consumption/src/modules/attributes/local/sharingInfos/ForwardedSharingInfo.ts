import { serialize, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";
import { AbstractAttributeSharingInfo, AbstractAttributeSharingInfoJSON, IAbstractAttributeSharingInfo } from "./AbstractAttributeSharingInfo";
import { ForwardedAttributeDeletionInfo, ForwardedAttributeDeletionInfoJSON, IForwardedAttributeDeletionInfo } from "./deletionInfos";

export interface ForwardedSharingInfoJSON extends AbstractAttributeSharingInfoJSON {
    sharedAt: string;
    deletionInfo?: ForwardedAttributeDeletionInfoJSON;
}

export interface IForwardedSharingInfo extends IAbstractAttributeSharingInfo {
    sharedAt: ICoreDate;
    deletionInfo?: IForwardedAttributeDeletionInfo;
}

export class ForwardedSharingInfo extends AbstractAttributeSharingInfo implements IForwardedSharingInfo {
    @serialize()
    @validate()
    public sharedAt: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public override deletionInfo?: ForwardedAttributeDeletionInfo;

    public static from(value: IForwardedSharingInfo | ForwardedSharingInfoJSON): ForwardedSharingInfo {
        return super.fromAny(value) as ForwardedSharingInfo;
    }
}
