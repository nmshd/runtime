import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";
import { ForwardedRelationshipAttributeDeletionStatus } from "./ForwardedRelationshipAttributeDeletionInfo";
import { OwnAttributeDeletionStatus } from "./OwnAttributeDeletionInfo";
import { PeerAttributeDeletionStatus } from "./PeerAttributeDeletionInfo";
import { ThirdPartyRelationshipAttributeDeletionStatus } from "./ThirdPartyRelationshipAttributeDeletionInfo";

export interface AbstractAttributeDeletionInfoJSON {
    deletionStatus: OwnAttributeDeletionStatus | PeerAttributeDeletionStatus | ForwardedRelationshipAttributeDeletionStatus | ThirdPartyRelationshipAttributeDeletionStatus;
    deletionDate: string;
}

export interface IAbstractAttributeDeletionInfo extends ISerializable {
    deletionStatus: OwnAttributeDeletionStatus | PeerAttributeDeletionStatus | ForwardedRelationshipAttributeDeletionStatus | ThirdPartyRelationshipAttributeDeletionStatus;
    deletionDate: ICoreDate;
}

export abstract class AbstractAttributeDeletionInfo extends Serializable implements IAbstractAttributeDeletionInfo {
    @serialize()
    @validate()
    public deletionStatus: OwnAttributeDeletionStatus | PeerAttributeDeletionStatus | ForwardedRelationshipAttributeDeletionStatus | ThirdPartyRelationshipAttributeDeletionStatus;

    @serialize()
    @validate()
    public deletionDate: CoreDate;
}
