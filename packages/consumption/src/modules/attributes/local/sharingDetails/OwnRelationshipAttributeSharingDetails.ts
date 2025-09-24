import { serialize, type, validate } from "@js-soft/ts-serval";
import { AbstractAttributeSharingDetails, AbstractAttributeSharingDetailsJSON, IAbstractAttributeSharingDetails } from "./AbstractAttributeSharingDetails";
import { EmittedAttributeDeletionInfo, EmittedAttributeDeletionInfoJSON, IEmittedAttributeDeletionInfo } from "./deletionInfos";

export interface OwnRelationshipAttributeSharingDetailsJSON extends AbstractAttributeSharingDetailsJSON {
    deletionInfo?: EmittedAttributeDeletionInfoJSON;
}

export interface IOwnRelationshipAttributeSharingDetails extends IAbstractAttributeSharingDetails {
    deletionInfo?: IEmittedAttributeDeletionInfo;
}

@type("OwnRelationshipAttributeSharingDetails")
export class OwnRelationshipAttributeSharingDetails extends AbstractAttributeSharingDetails implements IOwnRelationshipAttributeSharingDetails {
    @serialize()
    @validate({ nullable: true })
    public override deletionInfo?: EmittedAttributeDeletionInfo;

    public static from(value: IOwnRelationshipAttributeSharingDetails | OwnRelationshipAttributeSharingDetailsJSON): OwnRelationshipAttributeSharingDetails {
        return super.fromAny(value) as OwnRelationshipAttributeSharingDetails;
    }
}
