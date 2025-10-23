import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { IReceivedAttributeDeletionInfo, ReceivedAttributeDeletionInfo, ReceivedAttributeDeletionInfoJSON, ReceivedAttributeDeletionStatus } from "../deletionInfos";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";

export interface PeerRelationshipAttributeJSON extends LocalAttributeJSON {
    "@type": "PeerRelationshipAttribute";
    content: RelationshipAttributeJSON;
    peer: string;
    sourceReference: string;
    deletionInfo?: ReceivedAttributeDeletionInfoJSON;
}

export interface IPeerRelationshipAttribute extends ILocalAttribute {
    content: IRelationshipAttribute;
    peer: ICoreAddress;
    sourceReference: ICoreId;
    deletionInfo?: IReceivedAttributeDeletionInfo;
}

@type("PeerRelationshipAttribute")
export class PeerRelationshipAttribute extends LocalAttribute implements IPeerRelationshipAttribute {
    public override readonly technicalProperties: string[] = [
        ...this.technicalProperties,
        "@type",
        "@context",
        nameof<PeerRelationshipAttribute>((r) => r.peer),
        nameof<PeerRelationshipAttribute>((r) => r.sourceReference),
        nameof<PeerRelationshipAttribute>((r) => r.deletionInfo)
    ];

    @serialize({ customGenerator: (value: RelationshipAttribute) => value.toJSON(true) })
    @validate()
    public override content: RelationshipAttribute;

    @validate()
    @serialize()
    public peer: CoreAddress;

    @serialize()
    @validate()
    public sourceReference: CoreId;

    @serialize()
    @validate({ nullable: true })
    public deletionInfo?: ReceivedAttributeDeletionInfo;

    // this is not persisted, only used when returning Attributes via the API
    public numberOfForwards?: number;

    public isDeletedByEmitterOrToBeDeleted(): boolean {
        if (!this.deletionInfo) return false;

        const deletionStatuses = [ReceivedAttributeDeletionStatus.DeletedByEmitter, ReceivedAttributeDeletionStatus.ToBeDeleted];
        return deletionStatuses.includes(this.deletionInfo.deletionStatus);
    }

    public isToBeDeleted(): boolean {
        return this.deletionInfo?.deletionStatus === ReceivedAttributeDeletionStatus.ToBeDeleted;
    }

    public setPeerDeletionInfo(deletionInfo: ReceivedAttributeDeletionInfo | undefined, overrideDeleted = false): this {
        if (!overrideDeleted && this.deletionInfo?.deletionStatus === ReceivedAttributeDeletionStatus.DeletedByEmitter) {
            throw ConsumptionCoreErrors.attributes.cannotSetAttributeDeletionInfo(this.id);
        }

        this.deletionInfo = deletionInfo;
        return this;
    }

    public static override from(value: IPeerRelationshipAttribute | PeerRelationshipAttributeJSON): PeerRelationshipAttribute {
        return super.fromAny(value) as PeerRelationshipAttribute;
    }
}
