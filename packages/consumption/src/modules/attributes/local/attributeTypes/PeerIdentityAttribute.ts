import { serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute } from "@nmshd/content";
import { nameof } from "ts-simple-nameof";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import {
    IPeerIdentityAttributeSharingDetails,
    PeerIdentityAttributeSharingDetails,
    PeerIdentityAttributeSharingDetailsJSON,
    ReceivedAttributeDeletionInfo,
    ReceivedAttributeDeletionStatus
} from "../sharingDetails";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";

export interface PeerIdentityAttributeJSON extends LocalAttributeJSON {
    "@type": "PeerIdentityAttribute";
    content: IdentityAttributeJSON;
    peerSharingDetails: PeerIdentityAttributeSharingDetailsJSON;
}

export interface IPeerIdentityAttribute extends ILocalAttribute {
    content: IIdentityAttribute;
    peerSharingDetails: IPeerIdentityAttributeSharingDetails;
}

@type("PeerIdentityAttribute")
export class PeerIdentityAttribute extends LocalAttribute implements IPeerIdentityAttribute {
    public override readonly technicalProperties: string[] = [...this.technicalProperties, "@type", "@context", nameof<PeerIdentityAttribute>((r) => r.peerSharingDetails)];

    @serialize({ customGenerator: (value: IdentityAttribute) => value.toJSON(true) })
    @validate()
    public override content: IdentityAttribute;

    @serialize()
    @validate()
    public peerSharingDetails: PeerIdentityAttributeSharingDetails;

    public isDeletedByOwnerOrToBeDeleted(): boolean {
        if (!this.peerSharingDetails.deletionInfo) return false;

        const deletionStatuses = [ReceivedAttributeDeletionStatus.DeletedByOwner, ReceivedAttributeDeletionStatus.ToBeDeleted];
        return deletionStatuses.includes(this.peerSharingDetails.deletionInfo.deletionStatus);
    }

    public isToBeDeleted(): boolean {
        return this.peerSharingDetails.deletionInfo?.deletionStatus === ReceivedAttributeDeletionStatus.ToBeDeleted;
    }

    public setPeerDeletionInfo(deletionInfo: ReceivedAttributeDeletionInfo | undefined, overrideDeleted = false): this {
        if (!overrideDeleted && this.peerSharingDetails.deletionInfo?.deletionStatus === ReceivedAttributeDeletionStatus.DeletedByOwner) {
            throw ConsumptionCoreErrors.attributes.cannotSetAttributeDeletionInfo(this.id);
        }

        this.peerSharingDetails.deletionInfo = deletionInfo;
        return this;
    }

    public static override from(value: IPeerIdentityAttribute | PeerIdentityAttributeJSON): PeerIdentityAttribute {
        return super.fromAny(value) as PeerIdentityAttribute;
    }
}
