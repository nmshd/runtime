import { serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute } from "@nmshd/content";
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { IReceivedAttributeDeletionInfo, ReceivedAttributeDeletionInfo, ReceivedAttributeDeletionInfoJSON, ReceivedAttributeDeletionStatus } from "../sharingDetails";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";

export interface PeerIdentityAttributeJSON extends LocalAttributeJSON {
    "@type": "PeerIdentityAttribute";
    content: IdentityAttributeJSON;
    peer: string;
    sourceReference: string;
    deletionInfo?: ReceivedAttributeDeletionInfoJSON;
}

export interface IPeerIdentityAttribute extends ILocalAttribute {
    content: IIdentityAttribute;
    peer: ICoreAddress;
    sourceReference: ICoreId;
    deletionInfo?: IReceivedAttributeDeletionInfo;
}

@type("PeerIdentityAttribute")
export class PeerIdentityAttribute extends LocalAttribute implements IPeerIdentityAttribute {
    public override readonly technicalProperties: string[] = [
        ...this.technicalProperties,
        "@type",
        "@context",
        nameof<PeerIdentityAttribute>((r) => r.peer),
        nameof<PeerIdentityAttribute>((r) => r.sourceReference),
        nameof<PeerIdentityAttribute>((r) => r.deletionInfo)
    ];

    @serialize({ customGenerator: (value: IdentityAttribute) => value.toJSON(true) })
    @validate()
    public override content: IdentityAttribute;

    @validate()
    @serialize()
    public peer: CoreAddress;

    @serialize()
    @validate()
    public sourceReference: CoreId;

    @serialize()
    @validate({ nullable: true })
    public deletionInfo?: ReceivedAttributeDeletionInfo;

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

    public static override from(value: IPeerIdentityAttribute | PeerIdentityAttributeJSON): PeerIdentityAttribute {
        return super.fromAny(value) as PeerIdentityAttribute;
    }
}
