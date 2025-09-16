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
    // TODO: rename forwardedSharingInfo, also everywhere else
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

    public isForwardedTo(peer: CoreAddress, excludeToBeDeleted = false): boolean {
        if (!this.forwardedSharingInfos) return false;

        const sharingInfosWithPeer = this.forwardedSharingInfos.filter(
            (sharingInfo) => sharingInfo.peer.equals(peer) && sharingInfo.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.DeletedByPeer
        );
        if (sharingInfosWithPeer.length === 0) return false;

        if (!excludeToBeDeleted) return true;

        return sharingInfosWithPeer.some((sharingInfo) => sharingInfo.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.ToBeDeletedByPeer);
    }

    public isDeletedOrToBeDeletedByForwardingPeer(peer: CoreAddress): boolean {
        if (!this.forwardedSharingInfos) return false;

        const sharingInfosWithPeer = this.forwardedSharingInfos.filter((sharingInfo) => sharingInfo.peer.equals(peer));
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

    public isToBeDeletedByForwardingPeer(peer: CoreAddress): boolean {
        if (!this.forwardedSharingInfos) return false;

        return this.forwardedSharingInfos.some(
            (sharingInfo) => sharingInfo.peer.equals(peer) && sharingInfo.deletionInfo?.deletionStatus === EmittedAttributeDeletionStatus.ToBeDeletedByPeer
        );
    }

    public setForwardedDeletionInfo(deletionInfo: EmittedAttributeDeletionInfo | undefined, peer: CoreAddress, overrideDeleted = false): this {
        const sharingInfoForPeer = this.forwardedSharingInfos?.find(
            (sharingInfo) => sharingInfo.peer.equals(peer) && (overrideDeleted || sharingInfo.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.DeletedByPeer)
        );

        if (!sharingInfoForPeer) throw ConsumptionCoreErrors.attributes.cannotSetAttributeDeletionInfo(this.id, peer);

        sharingInfoForPeer.deletionInfo = deletionInfo;
        return this;
    }

    public getForwardedPeers(includeToBeDeleted = false): CoreAddress[] {
        const forwardedSharingInfosNotDeletedByPeer = this.forwardedSharingInfos?.filter(
            (sharingInfo) => sharingInfo.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.DeletedByPeer
        );
        if (!forwardedSharingInfosNotDeletedByPeer) return [];

        const sharingInfos = includeToBeDeleted
            ? forwardedSharingInfosNotDeletedByPeer
            : forwardedSharingInfosNotDeletedByPeer.filter((sharingInfo) => {
                  return sharingInfo.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.ToBeDeletedByPeer;
              });

        const peers = sharingInfos.map((sharingInfo) => sharingInfo.peer.toString());
        const uniquePeers = Array.from(new Set(peers)).map((address) => CoreAddress.from(address));
        return uniquePeers;
    }

    public getForwardedSharingInfoNotDeletedByPeer(peer: CoreAddress): ForwardedSharingInfo | undefined {
        return this.forwardedSharingInfos?.find(
            (sharingInfo) => sharingInfo.peer.equals(peer) && sharingInfo.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.DeletedByPeer
        );
    }

    public upsertForwardedSharingInfoForPeer(peer: CoreAddress, sharingInfo: ForwardedSharingInfo): this {
        if (!this.forwardedSharingInfos) {
            this.forwardedSharingInfos = [sharingInfo];
            return this;
        }

        const indexForPeer = this.forwardedSharingInfos.findIndex(
            (sharingInfo) => sharingInfo.peer.equals(peer) && sharingInfo.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.DeletedByPeer
        );

        if (indexForPeer === -1) {
            this.forwardedSharingInfos.push(sharingInfo);
            return this;
        }

        this.forwardedSharingInfos[indexForPeer] = sharingInfo;
        return this;
    }

    public static override from(value: IOwnIdentityAttribute | OwnIdentityAttributeJSON): OwnIdentityAttribute {
        return super.fromAny(value) as OwnIdentityAttribute;
    }
}
