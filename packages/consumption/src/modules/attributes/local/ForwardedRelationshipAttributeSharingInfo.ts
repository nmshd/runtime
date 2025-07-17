import { serialize, validate } from "@js-soft/ts-serval";
import { AbstractAttributeSharingInfo, AbstractAttributeSharingInfoJSON, IAbstractAttributeSharingInfo } from "./AbstractAttributeSharingInfo";
import {
    ForwardedRelationshipAttributeDeletionInfo,
    ForwardedRelationshipAttributeDeletionInfoJSON,
    IForwardedRelationshipAttributeDeletionInfo
} from "./ForwardedRelationshipAttributeDeletionInfo";

// TODO: we should improve the folder structure
export interface ForwardedRelationshipAttributeSharingInfoJSON extends AbstractAttributeSharingInfoJSON {
    deletionInfo?: ForwardedRelationshipAttributeDeletionInfoJSON;
}

export interface IForwardedRelationshipAttributeSharingInfo extends IAbstractAttributeSharingInfo {
    deletionInfo?: IForwardedRelationshipAttributeDeletionInfo;
}

export class ForwardedRelationshipAttributeSharingInfo extends AbstractAttributeSharingInfo implements IForwardedRelationshipAttributeSharingInfo {
    @serialize()
    @validate({ nullable: true })
    public override deletionInfo?: ForwardedRelationshipAttributeDeletionInfo;

    public static from(value: IForwardedRelationshipAttributeSharingInfo | ForwardedRelationshipAttributeSharingInfoJSON): ForwardedRelationshipAttributeSharingInfo {
        return super.fromAny(value) as ForwardedRelationshipAttributeSharingInfo;
    }
}
