import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";

// TODO: get deletion statuses straight
export enum ThirdPartyRelationshipAttributeDeletionStatus {
    ToBeDeleted = "ToBeDeleted",
    DeletedByPeer = "DeletedByPeer"
}

export interface ThirdPartyRelationshipAttributeDeletionInfoJSON {
    deletionStatus: ThirdPartyRelationshipAttributeDeletionStatus;
    deletionDate: string;
}

export interface IThirdPartyRelationshipAttributeDeletionInfo extends ISerializable {
    deletionStatus: ThirdPartyRelationshipAttributeDeletionStatus;
    deletionDate: ICoreDate;
}

export class ThirdPartyRelationshipAttributeDeletionInfo extends Serializable implements IThirdPartyRelationshipAttributeDeletionInfo {
    @serialize()
    @validate({
        customValidator: (v) =>
            !Object.values(ThirdPartyRelationshipAttributeDeletionStatus).includes(v)
                ? `must be one of: ${Object.values(ThirdPartyRelationshipAttributeDeletionStatus).map((o) => `"${o}"`)}`
                : undefined
    })
    public deletionStatus: ThirdPartyRelationshipAttributeDeletionStatus;

    @serialize()
    @validate()
    public deletionDate: CoreDate;

    public static from(value: IThirdPartyRelationshipAttributeDeletionInfo | ThirdPartyRelationshipAttributeDeletionInfoJSON): ThirdPartyRelationshipAttributeDeletionInfo {
        return this.fromAny(value);
    }
}
