import { serialize, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";
import { AbstractAttributeSharingInfo, AbstractAttributeSharingInfoJSON, IAbstractAttributeSharingInfo } from "./AbstractAttributeSharingInfo";
import { ForwardedAttributeDeletionInfo, ForwardedAttributeDeletionInfoJSON, IForwardedAttributeDeletionInfo } from "./deletionInfos";

export interface ForwardedRelationshipAttributeSharingInfoJSON extends AbstractAttributeSharingInfoJSON {
    sharedAt: string;
    deletionInfo?: ForwardedAttributeDeletionInfoJSON;
}

export interface IForwardedRelationshipAttributeSharingInfo extends IAbstractAttributeSharingInfo {
    sharedAt: ICoreDate;
    deletionInfo?: IForwardedAttributeDeletionInfo;
}

export class ForwardedRelationshipAttributeSharingInfo extends AbstractAttributeSharingInfo implements IForwardedRelationshipAttributeSharingInfo {
    @serialize()
    @validate()
    public sharedAt: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public override deletionInfo?: ForwardedAttributeDeletionInfo;

    public static from(value: IForwardedRelationshipAttributeSharingInfo | ForwardedRelationshipAttributeSharingInfoJSON): ForwardedRelationshipAttributeSharingInfo {
        return super.fromAny(value) as ForwardedRelationshipAttributeSharingInfo;
    }
}
