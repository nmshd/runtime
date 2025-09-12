import { serialize, type, validate } from "@js-soft/ts-serval";
import { AbstractAttributeDeletionInfo, AbstractAttributeDeletionInfoJSON, IAbstractAttributeDeletionInfo } from "./AbstractAttributeDeletionInfo";

export enum ThirdPartyRelationshipAttributeDeletionStatus {
    ToBeDeleted = "ToBeDeleted",
    DeletedByOwner = "DeletedByOwner",
    DeletedByPeer = "DeletedByPeer"
}

export interface ThirdPartyRelationshipAttributeDeletionInfoJSON extends AbstractAttributeDeletionInfoJSON {
    deletionStatus: ThirdPartyRelationshipAttributeDeletionStatus;
}

export interface IThirdPartyRelationshipAttributeDeletionInfo extends IAbstractAttributeDeletionInfo {
    deletionStatus: ThirdPartyRelationshipAttributeDeletionStatus;
}

@type("ThirdPartyRelationshipAttributeDeletionInfo")
export class ThirdPartyRelationshipAttributeDeletionInfo extends AbstractAttributeDeletionInfo implements IThirdPartyRelationshipAttributeDeletionInfo {
    @serialize()
    @validate({
        customValidator: (v) =>
            !Object.values(ThirdPartyRelationshipAttributeDeletionStatus).includes(v)
                ? `must be one of: ${Object.values(ThirdPartyRelationshipAttributeDeletionStatus).map((o) => `"${o}"`)}`
                : undefined
    })
    public override deletionStatus: ThirdPartyRelationshipAttributeDeletionStatus;

    public static from(value: IThirdPartyRelationshipAttributeDeletionInfo | ThirdPartyRelationshipAttributeDeletionInfoJSON): ThirdPartyRelationshipAttributeDeletionInfo {
        return this.fromAny(value);
    }
}
