import { serialize, validate } from "@js-soft/ts-serval";
import { AbstractAttributeSharingInfo, AbstractAttributeSharingInfoJSON, IAbstractAttributeSharingInfo } from "./AbstractAttributeSharingInfo";
import { IOwnAttributeDeletionInfo, OwnAttributeDeletionInfo, OwnAttributeDeletionInfoJSON } from "./OwnAttributeDeletionInfo";

export interface OwnRelationshipAttributeSharingInfoJSON extends AbstractAttributeSharingInfoJSON {
    deletionInfo?: OwnAttributeDeletionInfoJSON;
}

export interface IOwnRelationshipAttributeSharingInfo extends IAbstractAttributeSharingInfo {
    deletionInfo?: IOwnAttributeDeletionInfo;
}

export class OwnRelationshipAttributeSharingInfo extends AbstractAttributeSharingInfo implements IOwnRelationshipAttributeSharingInfo {
    @serialize()
    @validate({ nullable: true })
    public override deletionInfo?: OwnAttributeDeletionInfo;

    public static from(value: IOwnRelationshipAttributeSharingInfo | OwnRelationshipAttributeSharingInfoJSON): OwnRelationshipAttributeSharingInfo {
        return super.fromAny(value) as OwnRelationshipAttributeSharingInfo;
    }
}
