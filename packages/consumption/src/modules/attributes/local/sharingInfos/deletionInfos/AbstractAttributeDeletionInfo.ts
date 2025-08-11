import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreDate, ICoreDate } from "@nmshd/core-types";
import { EmittedAttributeDeletionStatus } from "./EmittedAttributeDeletionInfo";
import { PeerAttributeDeletionStatus } from "./PeerAttributeDeletionInfo";
import { ThirdPartyRelationshipAttributeDeletionStatus } from "./ThirdPartyRelationshipAttributeDeletionInfo";

export interface AbstractAttributeDeletionInfoJSON {
    deletionStatus: EmittedAttributeDeletionStatus | PeerAttributeDeletionStatus | ThirdPartyRelationshipAttributeDeletionStatus;
    deletionDate: string;
}

export interface IAbstractAttributeDeletionInfo extends ISerializable {
    deletionStatus: EmittedAttributeDeletionStatus | PeerAttributeDeletionStatus | ThirdPartyRelationshipAttributeDeletionStatus;
    deletionDate: ICoreDate;
}

export abstract class AbstractAttributeDeletionInfo extends Serializable implements IAbstractAttributeDeletionInfo {
    @serialize()
    @validate()
    public deletionStatus: EmittedAttributeDeletionStatus | PeerAttributeDeletionStatus | ThirdPartyRelationshipAttributeDeletionStatus;

    @serialize()
    @validate()
    public deletionDate: CoreDate;
}
