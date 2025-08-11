import { serialize, validate } from "@js-soft/ts-serval";
import { AbstractAttributeSharingInfo, AbstractAttributeSharingInfoJSON, IAbstractAttributeSharingInfo } from "./AbstractAttributeSharingInfo";
import { EmittedAttributeDeletionInfo, EmittedAttributeDeletionInfoJSON, IEmittedAttributeDeletionInfo } from "./deletionInfos";

export interface OwnRelationshipAttributeSharingInfoJSON extends AbstractAttributeSharingInfoJSON {
    deletionInfo?: EmittedAttributeDeletionInfoJSON;
}

export interface IOwnRelationshipAttributeSharingInfo extends IAbstractAttributeSharingInfo {
    deletionInfo?: IEmittedAttributeDeletionInfo;
}

export class OwnRelationshipAttributeSharingInfo extends AbstractAttributeSharingInfo implements IOwnRelationshipAttributeSharingInfo {
    @serialize()
    @validate({ nullable: true })
    public override deletionInfo?: EmittedAttributeDeletionInfo;

    public static from(value: IOwnRelationshipAttributeSharingInfo | OwnRelationshipAttributeSharingInfoJSON): OwnRelationshipAttributeSharingInfo {
        return super.fromAny(value) as OwnRelationshipAttributeSharingInfo;
    }
}
