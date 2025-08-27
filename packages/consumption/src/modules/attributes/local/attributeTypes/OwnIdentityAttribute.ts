import { serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
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
    public override readonly technicalProperties: string[] = [
        ...this.technicalProperties,
        "@type",
        "@context",
        nameof<OwnIdentityAttribute>((r) => r.isDefault),
        nameof<OwnIdentityAttribute>((r) => r.forwardedSharingInfos)
    ];

    // TODO: maybe we can get rid of this customGenerator -> different PR
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

        const excludedDeletionStatuses: any = [];
        if (!includeToBeDeleted) excludedDeletionStatuses.push(EmittedAttributeDeletionStatus.ToBeDeletedByPeer);
        if (!includeDeleted) excludedDeletionStatuses.push(EmittedAttributeDeletionStatus.DeletedByPeer);

        if (excludedDeletionStatuses.length === 0) return true;

        return sharingInfosWithPeer.some((sharingInfo) => !sharingInfo.deletionInfo || !excludedDeletionStatuses.includes(sharingInfo.deletionInfo.deletionStatus));
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

    public isToBeDeletedByForwardingPeer(peerAddress: CoreAddress): boolean {
        if (!this.forwardedSharingInfos) return false;

        return this.forwardedSharingInfos.some(
            (sharingInfo) => sharingInfo.peer.equals(peerAddress) && sharingInfo.deletionInfo?.deletionStatus === EmittedAttributeDeletionStatus.ToBeDeletedByPeer
        );
    }

    public setForwardedDeletionInfo(deletionInfo: EmittedAttributeDeletionInfo | undefined, peer: CoreAddress): this {
        const sharingInfoForPeer = this.forwardedSharingInfos?.find((sharingInfo) => sharingInfo.peer.equals(peer));
        if (!sharingInfoForPeer) throw ConsumptionCoreErrors.attributes.cannotSetAttributeDeletionInfoForPeer(this.id, peer);

        sharingInfoForPeer.deletionInfo = deletionInfo;
        return this;
    }

    public getPeers(includeToBeDeleted = false): CoreAddress[] {
        const sharingInfos = includeToBeDeleted
            ? this.forwardedSharingInfos
            : this.forwardedSharingInfos?.filter((sharingInfo) => {
                  return sharingInfo.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.ToBeDeletedByPeer;
              });

        const peers = sharingInfos?.map((sharingInfo) => sharingInfo.peer);
        if (!peers) return [];

        return peers;
    }

    public static override from(value: IOwnIdentityAttribute | OwnIdentityAttributeJSON): OwnIdentityAttribute {
        return super.fromAny(value) as OwnIdentityAttribute;
    }
}
