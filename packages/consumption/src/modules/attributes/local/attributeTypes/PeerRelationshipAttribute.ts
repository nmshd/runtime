import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import {
    EmittedAttributeDeletionInfo,
    EmittedAttributeDeletionStatus,
    ForwardedSharingInfo,
    ForwardedSharingInfoJSON,
    IForwardedSharingInfo,
    IPeerRelationshipAttributeSharingInfo,
    PeerRelationshipAttributeSharingInfo,
    PeerRelationshipAttributeSharingInfoJSON,
    ReceivedAttributeDeletionInfo,
    ReceivedAttributeDeletionStatus
} from "../sharingInfos";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";

export interface PeerRelationshipAttributeJSON extends LocalAttributeJSON {
    "@type": "PeerRelationshipAttribute";
    content: RelationshipAttributeJSON;
    peerSharingInfo: PeerRelationshipAttributeSharingInfoJSON;
    forwardedSharingInfos?: ForwardedSharingInfoJSON[];
}

export interface IPeerRelationshipAttribute extends ILocalAttribute {
    content: IRelationshipAttribute;
    peerSharingInfo: IPeerRelationshipAttributeSharingInfo;
    forwardedSharingInfos?: IForwardedSharingInfo[];
}

@type("PeerRelationshipAttribute")
export class PeerRelationshipAttribute extends LocalAttribute implements IPeerRelationshipAttribute {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<PeerRelationshipAttribute>((r) => r.peerSharingInfo),
        nameof<PeerRelationshipAttribute>((r) => r.forwardedSharingInfos)
    ];

    @serialize({ customGenerator: (value: RelationshipAttribute) => value.toJSON(true) })
    @validate()
    public override content: RelationshipAttribute;

    @serialize()
    @validate()
    public peerSharingInfo: PeerRelationshipAttributeSharingInfo;

    @serialize({ type: ForwardedSharingInfo })
    @validate({ nullable: true })
    public forwardedSharingInfos?: ForwardedSharingInfo[];

    public isSharedWith(peerAddress: CoreAddress, includeDeletedAndToBeDeleted = false): boolean {
        if (!this.forwardedSharingInfos) return false;

        const thirdPartySharingInfosWithPeer = this.forwardedSharingInfos.filter((sharingInfo) => sharingInfo.peer.equals(peerAddress));
        if (thirdPartySharingInfosWithPeer.length === 0) return false;

        if (includeDeletedAndToBeDeleted) return true;

        const excludedDeletionStatuses = [EmittedAttributeDeletionStatus.DeletedByPeer, EmittedAttributeDeletionStatus.ToBeDeletedByPeer];
        return thirdPartySharingInfosWithPeer.some((sharingInfo) => !sharingInfo.deletionInfo || !excludedDeletionStatuses.includes(sharingInfo.deletionInfo.deletionStatus));
    }

    // TODO: maybe simply rename deletionStatus DeletedByOwner to DeletedByPeer
    public isDeletedByOwnerOrToBeDeleted(): boolean {
        if (!this.peerSharingInfo.deletionInfo) return false;

        const deletionStatuses = [ReceivedAttributeDeletionStatus.DeletedByOwner, ReceivedAttributeDeletionStatus.ToBeDeleted];
        return deletionStatuses.includes(this.peerSharingInfo.deletionInfo.deletionStatus);
    }

    public isDeletedOrToBeDeletedByForwardingPeer(peerAddress: CoreAddress): boolean {
        if (!this.forwardedSharingInfos) return false;

        const sharingInfosWithPeer = this.forwardedSharingInfos.filter((sharingInfo) => sharingInfo.peer.equals(peerAddress));
        if (sharingInfosWithPeer.length === 0) return false;

        const deletionStatuses = [EmittedAttributeDeletionStatus.DeletedByPeer, EmittedAttributeDeletionStatus.ToBeDeletedByPeer];
        const hasSharingInfoWithDeletionStatus = sharingInfosWithPeer.some(
            (sharingInfo) => sharingInfo.deletionInfo && deletionStatuses.includes(sharingInfo.deletionInfo.deletionStatus)
        );
        const hasSharingInfoWithoutDeletionStatus = sharingInfosWithPeer.some(
            (sharingInfo) => !sharingInfo.deletionInfo || !deletionStatuses.includes(sharingInfo.deletionInfo.deletionStatus)
        );
        return hasSharingInfoWithDeletionStatus && !hasSharingInfoWithoutDeletionStatus;
    }

    public setPeerDeletionInfo(deletionInfo: ReceivedAttributeDeletionInfo | undefined): this {
        this.peerSharingInfo.deletionInfo = deletionInfo;
        return this;
    }

    public setForwardedDeletionInfo(deletionInfo: EmittedAttributeDeletionInfo | undefined, thirdParty: CoreAddress): this {
        const sharingInfoForThirdParty = this.forwardedSharingInfos?.find((sharingInfo) => sharingInfo.peer.equals(thirdParty));
        if (!sharingInfoForThirdParty) throw Error; // TODO:

        sharingInfoForThirdParty.deletionInfo = deletionInfo; // TODO: check if this works
        return this;
    }

    public getThirdParties(includeDeletedAndToBeDeleted = false): CoreAddress[] {
        const excludedDeletionStatuses = [EmittedAttributeDeletionStatus.DeletedByPeer, EmittedAttributeDeletionStatus.ToBeDeletedByPeer];

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
