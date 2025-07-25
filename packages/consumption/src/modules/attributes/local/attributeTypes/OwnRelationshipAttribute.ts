import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import {
    ForwardedAttributeDeletionInfo,
    ForwardedAttributeDeletionStatus,
    ForwardedRelationshipAttributeSharingInfo,
    ForwardedRelationshipAttributeSharingInfoJSON,
    IForwardedRelationshipAttributeSharingInfo,
    IOwnRelationshipAttributeSharingInfo,
    OwnRelationshipAttributeSharingInfo,
    OwnRelationshipAttributeSharingInfoJSON
} from "../sharingInfos";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";

export interface OwnRelationshipAttributeJSON extends LocalAttributeJSON {
    "@type": "OwnRelationshipAttribute";
    content: RelationshipAttributeJSON;
    peerSharingInfo: OwnRelationshipAttributeSharingInfoJSON;
    forwardedSharingInfos?: ForwardedRelationshipAttributeSharingInfoJSON[];
}

export interface IOwnRelationshipAttribute extends ILocalAttribute {
    content: IRelationshipAttribute;
    peerSharingInfo: IOwnRelationshipAttributeSharingInfo;
    forwardedSharingInfos?: IForwardedRelationshipAttributeSharingInfo[];
}

@type("OwnRelationshipAttribute")
export class OwnRelationshipAttribute extends LocalAttribute implements IOwnRelationshipAttribute {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<OwnRelationshipAttribute>((r) => r.peerSharingInfo),
        nameof<OwnRelationshipAttribute>((r) => r.forwardedSharingInfos)
    ];

    @serialize()
    @validate()
    public override content: RelationshipAttribute;

    @serialize()
    @validate()
    public peerSharingInfo: OwnRelationshipAttributeSharingInfo;

    @serialize()
    @validate({ nullable: true })
    public forwardedSharingInfos?: ForwardedRelationshipAttributeSharingInfo[];

    public isSharedWith(peerAddress: CoreAddress, includeDeletedAndToBeDeleted = false): boolean {
        if (!this.forwardedSharingInfos) return false;

        const thirdPartySharingInfosWithPeer = this.forwardedSharingInfos.filter((sharingInfo) => sharingInfo.peer.equals(peerAddress));
        if (thirdPartySharingInfosWithPeer.length === 0) return false;

        if (includeDeletedAndToBeDeleted) return true;

        const excludedDeletionStatuses = [ForwardedAttributeDeletionStatus.DeletedByPeer, ForwardedAttributeDeletionStatus.ToBeDeletedByPeer];
        return thirdPartySharingInfosWithPeer.some((sharingInfo) => !sharingInfo.deletionInfo || !excludedDeletionStatuses.includes(sharingInfo.deletionInfo.deletionStatus));
    }

    public isDeletedOrToBeDeletedByPeer(): boolean {
        if (!this.peerSharingInfo.deletionInfo) return false;

        const deletionStatuses = [ForwardedAttributeDeletionStatus.DeletedByPeer, ForwardedAttributeDeletionStatus.ToBeDeletedByPeer];
        return deletionStatuses.includes(this.peerSharingInfo.deletionInfo.deletionStatus);
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

    public setPeerDeletionInfo(deletionInfo: ForwardedAttributeDeletionInfo): this {
        this.peerSharingInfo.deletionInfo = deletionInfo;
        return this;
    }

    public setForwardedDeletionInfo(deletionInfo: ForwardedAttributeDeletionInfo, thirdParty: CoreAddress): this {
        const sharingInfoForThirdParty = this.forwardedSharingInfos?.find((sharingInfo) => sharingInfo.peer.equals(thirdParty));
        if (!sharingInfoForThirdParty) throw Error; // TODO:

        sharingInfoForThirdParty.deletionInfo = deletionInfo; // TODO: check if this works
        return this;
    }

    public getThirdParties(includeDeletedAndToBeDeleted = false): CoreAddress[] {
        const excludedDeletionStatuses = [ForwardedAttributeDeletionStatus.DeletedByPeer, ForwardedAttributeDeletionStatus.ToBeDeletedByPeer];

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

    public static override from(value: IOwnRelationshipAttribute | OwnRelationshipAttributeJSON): OwnRelationshipAttribute {
        return super.fromAny(value) as OwnRelationshipAttribute;
    }
}
