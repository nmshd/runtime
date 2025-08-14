import { serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { EmittedAttributeDeletionInfo, EmittedAttributeDeletionStatus, ForwardedSharingInfo, ForwardedSharingInfoJSON, IForwardedSharingInfo } from "../sharingInfos";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";

export interface OwnIdentityAttributeJSON extends LocalAttributeJSON {
    "@type": "OwnIdentityAttribute";
    content: IdentityAttributeJSON;
    isDefault?: true;
    forwardedSharingInfos?: ForwardedSharingInfoJSON[];
}

export interface IOwnIdentityAttribute extends ILocalAttribute {
    content: IIdentityAttribute;
    isDefault?: true;
    forwardedSharingInfos?: IForwardedSharingInfo[];
}

@type("OwnIdentityAttribute")
export class OwnIdentityAttribute extends LocalAttribute implements IOwnIdentityAttribute {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        // TODO: super, same for other attribute types
        nameof<OwnIdentityAttribute>((r) => r.isDefault),
        nameof<OwnIdentityAttribute>((r) => r.forwardedSharingInfos)
    ];

    // TODO: maybe we can get rid of this customGenerator
    @serialize({ customGenerator: (value: IdentityAttribute) => value.toJSON(true) })
    @validate()
    public override content: IdentityAttribute;

    @serialize()
    @validate({ nullable: true })
    public isDefault?: true;

    @serialize({ type: ForwardedSharingInfo })
    @validate({ nullable: true })
    public forwardedSharingInfos?: ForwardedSharingInfo[];

    public isSharedWith(peerAddress: CoreAddress, includeToBeDeleted = false, includeDeleted = false): boolean {
        if (!this.forwardedSharingInfos) return false;

        const sharingInfosWithPeer = this.forwardedSharingInfos.filter((sharingInfo) => sharingInfo.peer.equals(peerAddress));
        if (sharingInfosWithPeer.length === 0) return false;

        let excludedDeletionStatuses = [];
        if (!includeToBeDeleted) excludedDeletionStatuses.push(EmittedAttributeDeletionStatus.ToBeDeletedByPeer);
        if (!includeDeleted) excludedDeletionStatuses.push(EmittedAttributeDeletionStatus.DeletedByPeer);

        if (excludedDeletionStatuses.length === 0) return true;

        return sharingInfosWithPeer.some((sharingInfo) => !sharingInfo.deletionInfo || !excludedDeletionStatuses.includes(sharingInfo.deletionInfo.deletionStatus));
    }

    public isDeletedOrToBeDeletedByForwardingPeer(peerAddress: CoreAddress, queriedDeletionStatus?: "onlyDeleted" | "onlyToBeDeleted"): boolean {
        if (!this.forwardedSharingInfos) return false;

        const sharingInfosWithPeer = this.forwardedSharingInfos.filter((sharingInfo) => sharingInfo.peer.equals(peerAddress));
        if (sharingInfosWithPeer.length === 0) return false;

        let deletionStatuses;
        switch (queriedDeletionStatus) {
            case "onlyDeleted":
                deletionStatuses = [EmittedAttributeDeletionStatus.DeletedByPeer];
            case "onlyToBeDeleted":
                deletionStatuses = [EmittedAttributeDeletionStatus.ToBeDeletedByPeer];
            default:
                deletionStatuses = [EmittedAttributeDeletionStatus.DeletedByPeer, EmittedAttributeDeletionStatus.ToBeDeletedByPeer];
        }

        const hasSharingInfoWithDeletionStatus = sharingInfosWithPeer.some(
            (sharingInfo) => sharingInfo.deletionInfo && deletionStatuses.includes(sharingInfo.deletionInfo.deletionStatus)
        );
        const hasSharingInfoWithoutDeletionStatus = sharingInfosWithPeer.some(
            (sharingInfo) => !sharingInfo.deletionInfo || !deletionStatuses.includes(sharingInfo.deletionInfo.deletionStatus)
        );
        return hasSharingInfoWithDeletionStatus && !hasSharingInfoWithoutDeletionStatus;
    }

    public setForwardedDeletionInfo(deletionInfo: EmittedAttributeDeletionInfo | undefined, peer: CoreAddress): this {
        const sharingInfoForPeer = this.forwardedSharingInfos?.find((sharingInfo) => sharingInfo.peer.equals(peer));
        if (!sharingInfoForPeer) throw Error; // TODO:

        sharingInfoForPeer.deletionInfo = deletionInfo; // TODO: check if this works
        return this;
    }

    public getPeers(includeDeletedAndToBeDeleted = false): CoreAddress[] {
        const excludedDeletionStatuses = [EmittedAttributeDeletionStatus.DeletedByPeer, EmittedAttributeDeletionStatus.ToBeDeletedByPeer];

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
