import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { ForwardedRelationshipAttributeDeletionStatus } from "./ForwardedRelationshipAttributeDeletionInfo";
import {
    ForwardedRelationshipAttributeSharingInfo,
    ForwardedRelationshipAttributeSharingInfoJSON,
    IForwardedRelationshipAttributeSharingInfo
} from "./ForwardedRelationshipAttributeSharingInfo";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";
import { IPeerRelationshipAttributeSharingInfo, PeerRelationshipAttributeSharingInfo, PeerRelationshipAttributeSharingInfoJSON } from "./PeerRelationshipAttributeSharingInfo";

export interface PeerRelationshipAttributeJSON extends LocalAttributeJSON {
    "@type": "PeerRelationshipAttribute";
    content: RelationshipAttributeJSON;
    initialSharingInfo: PeerRelationshipAttributeSharingInfoJSON;
    thirdPartySharingInfos?: ForwardedRelationshipAttributeSharingInfoJSON[];
}

export interface IPeerRelationshipAttribute extends ILocalAttribute {
    content: IRelationshipAttribute;
    initialSharingInfo: IPeerRelationshipAttributeSharingInfo;
    thirdPartySharingInfos?: IForwardedRelationshipAttributeSharingInfo[];
}

@type("PeerRelationshipAttribute")
export class PeerRelationshipAttribute extends LocalAttribute implements IPeerRelationshipAttribute {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<PeerRelationshipAttribute>((r) => r.initialSharingInfo),
        nameof<PeerRelationshipAttribute>((r) => r.thirdPartySharingInfos)
    ];

    @serialize()
    @validate()
    public override content: RelationshipAttribute;

    @serialize()
    @validate()
    public initialSharingInfo: PeerRelationshipAttributeSharingInfo;

    @serialize()
    @validate({ nullable: true })
    public thirdPartySharingInfos?: ForwardedRelationshipAttributeSharingInfo[];

    public isSharedWith(peerAddress: CoreAddress, includeDeletedAndToBeDeleted = false): boolean {
        if (!this.thirdPartySharingInfos) return false;

        const thirdPartySharingInfosWithPeer = this.thirdPartySharingInfos.filter((sharingInfo) => sharingInfo.peer.equals(peerAddress));
        if (thirdPartySharingInfosWithPeer.length === 0) return false;

        if (includeDeletedAndToBeDeleted) return true;

        const excludedDeletionStatuses = [ForwardedRelationshipAttributeDeletionStatus.DeletedByPeer, ForwardedRelationshipAttributeDeletionStatus.ToBeDeletedByPeer];
        return thirdPartySharingInfosWithPeer.some((sharingInfo) => !sharingInfo.deletionInfo || !excludedDeletionStatuses.includes(sharingInfo.deletionInfo.deletionStatus));
    }

    public static override from(value: IPeerRelationshipAttribute | PeerRelationshipAttributeJSON): PeerRelationshipAttribute {
        return super.fromAny(value) as PeerRelationshipAttribute;
    }
}
