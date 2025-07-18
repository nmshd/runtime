import { serialize, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";
import { AbstractAttributeSharingInfo, AbstractAttributeSharingInfoJSON, IAbstractAttributeSharingInfo } from "./AbstractAttributeSharingInfo";
import {
    ForwardedRelationshipAttributeDeletionInfo,
    ForwardedRelationshipAttributeDeletionInfoJSON,
    IForwardedRelationshipAttributeDeletionInfo
} from "./ForwardedRelationshipAttributeDeletionInfo";

// TODO: we should improve the folder structure
export interface ForwardedRelationshipAttributeSharingInfoJSON extends AbstractAttributeSharingInfoJSON {
    sharedAt: string;
    deletionInfo?: ForwardedRelationshipAttributeDeletionInfoJSON;
}

export interface IForwardedRelationshipAttributeSharingInfo extends IAbstractAttributeSharingInfo {
    sharedAt: ICoreDate;
    deletionInfo?: IForwardedRelationshipAttributeDeletionInfo;
}

export class ForwardedRelationshipAttributeSharingInfo extends AbstractAttributeSharingInfo implements IForwardedRelationshipAttributeSharingInfo {
    @serialize()
    @validate()
    public sharedAt: CoreDate;

    @serialize()
    @validate({ nullable: true })
    public override deletionInfo?: ForwardedRelationshipAttributeDeletionInfo;

    public static from(value: IForwardedRelationshipAttributeSharingInfo | ForwardedRelationshipAttributeSharingInfoJSON): ForwardedRelationshipAttributeSharingInfo {
        return super.fromAny(value) as ForwardedRelationshipAttributeSharingInfo;
    }
}
