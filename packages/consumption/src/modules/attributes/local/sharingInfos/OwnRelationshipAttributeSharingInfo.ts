import { serialize, validate } from "@js-soft/ts-serval";
import { AbstractAttributeSharingInfo, AbstractAttributeSharingInfoJSON, IAbstractAttributeSharingInfo } from "./AbstractAttributeSharingInfo";
import { ForwardedAttributeDeletionInfo, ForwardedAttributeDeletionInfoJSON, IForwardedAttributeDeletionInfo } from "./deletionInfos";

export interface OwnRelationshipAttributeSharingInfoJSON extends AbstractAttributeSharingInfoJSON {
    deletionInfo?: ForwardedAttributeDeletionInfoJSON;
}

export interface IOwnRelationshipAttributeSharingInfo extends IAbstractAttributeSharingInfo {
    deletionInfo?: IForwardedAttributeDeletionInfo;
}

export class OwnRelationshipAttributeSharingInfo extends AbstractAttributeSharingInfo implements IOwnRelationshipAttributeSharingInfo {
    @serialize()
    @validate({ nullable: true })
    public override deletionInfo?: ForwardedAttributeDeletionInfo;

    public static from(value: IOwnRelationshipAttributeSharingInfo | OwnRelationshipAttributeSharingInfoJSON): OwnRelationshipAttributeSharingInfo {
        return super.fromAny(value) as OwnRelationshipAttributeSharingInfo;
    }
}
