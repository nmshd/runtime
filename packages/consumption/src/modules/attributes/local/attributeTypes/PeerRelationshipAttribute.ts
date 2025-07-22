import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import {
    ForwardedRelationshipAttributeDeletionInfo,
    ForwardedRelationshipAttributeDeletionStatus,
    ForwardedRelationshipAttributeSharingInfo,
    ForwardedRelationshipAttributeSharingInfoJSON,
    IForwardedRelationshipAttributeSharingInfo,
    IPeerRelationshipAttributeSharingInfo,
    PeerAttributeDeletionInfo,
    PeerRelationshipAttributeSharingInfo,
    PeerRelationshipAttributeSharingInfoJSON
} from "../sharingInfos";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";

export interface PeerRelationshipAttributeJSON extends LocalAttributeJSON {
    "@type": "PeerRelationshipAttribute";
    content: RelationshipAttributeJSON;
    peerSharingInfo: PeerRelationshipAttributeSharingInfoJSON;
    forwardedSharingInfos?: ForwardedRelationshipAttributeSharingInfoJSON[];
}

export interface IPeerRelationshipAttribute extends ILocalAttribute {
    content: IRelationshipAttribute;
    peerSharingInfo: IPeerRelationshipAttributeSharingInfo;
    forwardedSharingInfos?: IForwardedRelationshipAttributeSharingInfo[];
}

@type("PeerRelationshipAttribute")
export class PeerRelationshipAttribute extends LocalAttribute implements IPeerRelationshipAttribute {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<PeerRelationshipAttribute>((r) => r.peerSharingInfo),
        nameof<PeerRelationshipAttribute>((r) => r.forwardedSharingInfos)
    ];

    @serialize()
    @validate()
    public override content: RelationshipAttribute;

    @serialize()
    @validate()
    public peerSharingInfo: PeerRelationshipAttributeSharingInfo;

    @serialize()
    @validate({ nullable: true })
    public forwardedSharingInfos?: ForwardedRelationshipAttributeSharingInfo[];

    public isSharedWith(peerAddress: CoreAddress, includeDeletedAndToBeDeleted = false): boolean {
        if (!this.forwardedSharingInfos) return false;

        const thirdPartySharingInfosWithPeer = this.forwardedSharingInfos.filter((sharingInfo) => sharingInfo.peer.equals(peerAddress));
        if (thirdPartySharingInfosWithPeer.length === 0) return false;

        if (includeDeletedAndToBeDeleted) return true;

        const excludedDeletionStatuses = [ForwardedRelationshipAttributeDeletionStatus.DeletedByPeer, ForwardedRelationshipAttributeDeletionStatus.ToBeDeletedByPeer];
        return thirdPartySharingInfosWithPeer.some((sharingInfo) => !sharingInfo.deletionInfo || !excludedDeletionStatuses.includes(sharingInfo.deletionInfo.deletionStatus));
    }

    public setDeletionInfo(deletionInfo: PeerAttributeDeletionInfo): this {
        this.peerSharingInfo.deletionInfo = deletionInfo;
        return this;
    }

    public setDeletionInfoForThirdParty(deletionInfo: ForwardedRelationshipAttributeDeletionInfo, thirdParty: CoreAddress): this {
        const sharingInfoForThirdParty = this.forwardedSharingInfos?.find((sharingInfo) => sharingInfo.peer.equals(thirdParty));
        if (!sharingInfoForThirdParty) throw Error; // TODO:

        sharingInfoForThirdParty.deletionInfo = deletionInfo; // TODO: check if this works
        return this;
    }

    public getThirdParties(includeDeletedAndToBeDeleted = false): CoreAddress[] {
        const excludedDeletionStatuses = [ForwardedRelationshipAttributeDeletionStatus.DeletedByPeer, ForwardedRelationshipAttributeDeletionStatus.ToBeDeletedByPeer];

        const sharingInfos = includeDeletedAndToBeDeleted
            ? this.forwardedSharingInfos
            : this.forwardedSharingInfos?.filter((sharingInfo) => {
                  if (!sharingInfo.deletionInfo) return true;
                  return !excludedDeletionStatuses.includes(sharingInfo.deletionInfo.deletionStatus);
              });

        const thirdParty = sharingInfos?.map((sharingInfo) => sharingInfo.peer);
        if (!thirdParty) return [];

        return thirdParty;
    }

    public static override from(value: IPeerRelationshipAttribute | PeerRelationshipAttributeJSON): PeerRelationshipAttribute {
        return super.fromAny(value) as PeerRelationshipAttribute;
    }
}
