import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
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
    public override readonly technicalProperties: string[] = [
        ...this.technicalProperties,
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

    public isForwardedTo(peer: CoreAddress, excludeToBeDeleted = false): boolean {
        if (!this.forwardedSharingInfos) return false;

        const sharingInfosWithPeer = this.forwardedSharingInfos.filter(
            (sharingInfo) => sharingInfo.peer.equals(peer) && sharingInfo.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.DeletedByPeer
        );
        if (sharingInfosWithPeer.length === 0) return false;

        if (!excludeToBeDeleted) return true;

        return sharingInfosWithPeer.some((sharingInfo) => sharingInfo.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.ToBeDeletedByPeer);
    }

    public isDeletedByOwnerOrToBeDeleted(): boolean {
        if (!this.peerSharingInfo.deletionInfo) return false;

        const deletionStatuses = [ReceivedAttributeDeletionStatus.DeletedByOwner, ReceivedAttributeDeletionStatus.ToBeDeleted];
        return deletionStatuses.includes(this.peerSharingInfo.deletionInfo.deletionStatus);
    }

    public isToBeDeleted(): boolean {
        return this.peerSharingInfo.deletionInfo?.deletionStatus === ReceivedAttributeDeletionStatus.ToBeDeleted;
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

    public hasDeletionStatusUnequalDeletedByPeer(peer: CoreAddress): boolean {
        if (!this.forwardedSharingInfos) return false;

        const deletionStatuses = [
            EmittedAttributeDeletionStatus.ToBeDeletedByPeer,
            EmittedAttributeDeletionStatus.DeletionRequestSent,
            EmittedAttributeDeletionStatus.DeletionRequestRejected
        ];

        return this.forwardedSharingInfos.some(
            (sharingInfo) => sharingInfo.peer.equals(peer) && sharingInfo.deletionInfo && deletionStatuses.includes(sharingInfo.deletionInfo.deletionStatus)
        );
    }

    public setPeerDeletionInfo(deletionInfo: ReceivedAttributeDeletionInfo | undefined, overrideDeleted = false): this {
        if (!overrideDeleted && this.peerSharingInfo.deletionInfo?.deletionStatus === ReceivedAttributeDeletionStatus.DeletedByOwner) {
            throw ConsumptionCoreErrors.attributes.cannotSetAttributeDeletionInfo(this.id);
        }

        this.peerSharingInfo.deletionInfo = deletionInfo;
        return this;
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
        if (peer.equals(this.peerSharingInfo.peer)) throw ConsumptionCoreErrors.attributes.cannotSetForwardedSharingInfoForPeer(this.id, peer);

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

    public static override from(value: IPeerRelationshipAttribute | PeerRelationshipAttributeJSON): PeerRelationshipAttribute {
        return super.fromAny(value) as PeerRelationshipAttribute;
    }
}
