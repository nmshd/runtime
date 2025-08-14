import { serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute } from "@nmshd/content";
import { nameof } from "ts-simple-nameof";
import {
    IPeerIdentityAttributeSharingInfo,
    PeerIdentityAttributeSharingInfo,
    PeerIdentityAttributeSharingInfoJSON,
    ReceivedAttributeDeletionInfo,
    ReceivedAttributeDeletionStatus
} from "../sharingInfos";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";

export interface PeerIdentityAttributeJSON extends LocalAttributeJSON {
    "@type": "PeerIdentityAttribute";
    content: IdentityAttributeJSON;
    peerSharingInfo: PeerIdentityAttributeSharingInfoJSON;
}

export interface IPeerIdentityAttribute extends ILocalAttribute {
    content: IIdentityAttribute;
    peerSharingInfo: IPeerIdentityAttributeSharingInfo;
}

@type("PeerIdentityAttribute")
export class PeerIdentityAttribute extends LocalAttribute implements IPeerIdentityAttribute {
    public override readonly technicalProperties = ["@type", "@context", nameof<PeerIdentityAttribute>((r) => r.peerSharingInfo)];

    @serialize({ customGenerator: (value: IdentityAttribute) => value.toJSON(true) })
    @validate()
    public override content: IdentityAttribute;

    @serialize()
    @validate()
    public peerSharingInfo: PeerIdentityAttributeSharingInfo;

    public isDeletedByOwnerOrToBeDeleted(): boolean {
        if (!this.peerSharingInfo.deletionInfo) return false;

        const deletionStatuses = [ReceivedAttributeDeletionStatus.DeletedByOwner, ReceivedAttributeDeletionStatus.ToBeDeleted];
        return deletionStatuses.includes(this.peerSharingInfo.deletionInfo.deletionStatus);
    }

    public setPeerDeletionInfo(deletionInfo: ReceivedAttributeDeletionInfo | undefined): this {
        this.peerSharingInfo.deletionInfo = deletionInfo;
        return this;
    }

    public static override from(value: IPeerIdentityAttribute | PeerIdentityAttributeJSON): PeerIdentityAttribute {
        return super.fromAny(value) as PeerIdentityAttribute;
    }
}
