import { serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import {
    ForwardedAttributeDeletionInfo,
    ForwardedAttributeDeletionStatus,
    IOwnIdentityAttributeSharingInfo,
    OwnIdentityAttributeSharingInfo,
    OwnIdentityAttributeSharingInfoJSON
} from "../sharingInfos";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";

export interface OwnIdentityAttributeJSON extends LocalAttributeJSON {
    "@type": "OwnIdentityAttribute";
    content: IdentityAttributeJSON;
    isDefault?: true;
    forwardedSharingInfos?: OwnIdentityAttributeSharingInfoJSON[];
}

export interface IOwnIdentityAttribute extends ILocalAttribute {
    content: IIdentityAttribute;
    isDefault?: true;
    forwardedSharingInfos?: IOwnIdentityAttributeSharingInfo[];
}

@type("OwnIdentityAttribute")
export class OwnIdentityAttribute extends LocalAttribute implements IOwnIdentityAttribute {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<OwnIdentityAttribute>((r) => r.isDefault),
        nameof<OwnIdentityAttribute>((r) => r.forwardedSharingInfos)
    ];

    @serialize()
    @validate()
    public override content: IdentityAttribute;

    @serialize()
    @validate({ nullable: true })
    public isDefault?: true;

    @serialize()
    @validate({ nullable: true })
    public forwardedSharingInfos?: OwnIdentityAttributeSharingInfo[];

    public isSharedWith(peerAddress: CoreAddress, includeDeletedAndToBeDeleted = false): boolean {
        if (!this.forwardedSharingInfos) return false;

        const sharingInfosWithPeer = this.forwardedSharingInfos.filter((sharingInfo) => sharingInfo.peer.equals(peerAddress));
        if (sharingInfosWithPeer.length === 0) return false;

        if (includeDeletedAndToBeDeleted) return true;

        const excludedDeletionStatuses = [ForwardedAttributeDeletionStatus.DeletedByPeer, ForwardedAttributeDeletionStatus.ToBeDeletedByPeer];
        return sharingInfosWithPeer.some((sharingInfo) => !sharingInfo.deletionInfo || !excludedDeletionStatuses.includes(sharingInfo.deletionInfo.deletionStatus));
    }

    public isDeletedOrToBeDeletedByForwardingPeer(peerAddress: CoreAddress): boolean {
        if (!this.forwardedSharingInfos) return false;

        const sharingInfosWithPeer = this.forwardedSharingInfos.filter((sharingInfo) => sharingInfo.peer.equals(peerAddress));
        if (sharingInfosWithPeer.length === 0) return false;

        const deletionStatuses = [ForwardedAttributeDeletionStatus.DeletedByPeer, ForwardedAttributeDeletionStatus.ToBeDeletedByPeer];
        const hasSharingInfoWithDeletionStatus = sharingInfosWithPeer.some(
            (sharingInfo) => sharingInfo.deletionInfo && deletionStatuses.includes(sharingInfo.deletionInfo.deletionStatus)
        );
        const hasSharingInfoWithoutDeletionStatus = sharingInfosWithPeer.some(
            (sharingInfo) => !sharingInfo.deletionInfo || !deletionStatuses.includes(sharingInfo.deletionInfo.deletionStatus)
        );
        return hasSharingInfoWithDeletionStatus && !hasSharingInfoWithoutDeletionStatus;
    }

    public setForwardedDeletionInfo(deletionInfo: ForwardedAttributeDeletionInfo, peer: CoreAddress): this {
        const sharingInfoForPeer = this.forwardedSharingInfos?.find((sharingInfo) => sharingInfo.peer.equals(peer));
        if (!sharingInfoForPeer) throw Error; // TODO:

        sharingInfoForPeer.deletionInfo = deletionInfo; // TODO: check if this works
        return this;
    }

    public getPeers(includeDeletedAndToBeDeleted = false): CoreAddress[] {
        const excludedDeletionStatuses = [ForwardedAttributeDeletionStatus.DeletedByPeer, ForwardedAttributeDeletionStatus.ToBeDeletedByPeer];

        const sharingInfos = includeDeletedAndToBeDeleted
            ? this.forwardedSharingInfos
            : this.forwardedSharingInfos?.filter((sharingInfo) => {
                  if (!sharingInfo.deletionInfo) return true;
                  return !excludedDeletionStatuses.includes(sharingInfo.deletionInfo.deletionStatus);
              });

        const peers = sharingInfos?.map((sharingInfo) => sharingInfo.peer);
        if (!peers) return [];

        return peers;
    }

    public static override from(value: IOwnIdentityAttribute | OwnIdentityAttributeJSON): OwnIdentityAttribute {
        return super.fromAny(value) as OwnIdentityAttribute;
    }
}
