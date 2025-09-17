import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import {
    EmittedAttributeDeletionInfo,
    EmittedAttributeDeletionStatus,
    ForwardedSharingDetails,
    ForwardedSharingDetailsJSON,
    IForwardedSharingDetails,
    IPeerRelationshipAttributeSharingDetails,
    PeerRelationshipAttributeSharingDetails,
    PeerRelationshipAttributeSharingDetailsJSON,
    ReceivedAttributeDeletionInfo,
    ReceivedAttributeDeletionStatus
} from "../sharingDetails";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";

export interface PeerRelationshipAttributeJSON extends LocalAttributeJSON {
    "@type": "PeerRelationshipAttribute";
    content: RelationshipAttributeJSON;
    peerSharingDetails: PeerRelationshipAttributeSharingDetailsJSON;
    forwardedSharingDetails?: ForwardedSharingDetailsJSON[];
}

export interface IPeerRelationshipAttribute extends ILocalAttribute {
    content: IRelationshipAttribute;
    peerSharingDetails: IPeerRelationshipAttributeSharingDetails;
    forwardedSharingDetails?: IForwardedSharingDetails[];
}

@type("PeerRelationshipAttribute")
export class PeerRelationshipAttribute extends LocalAttribute implements IPeerRelationshipAttribute {
    public override readonly technicalProperties: string[] = [
        ...this.technicalProperties,
        "@type",
        "@context",
        nameof<PeerRelationshipAttribute>((r) => r.peerSharingDetails),
        nameof<PeerRelationshipAttribute>((r) => r.forwardedSharingDetails)
    ];

    @serialize({ customGenerator: (value: RelationshipAttribute) => value.toJSON(true) })
    @validate()
    public override content: RelationshipAttribute;

    @serialize()
    @validate()
    public peerSharingDetails: PeerRelationshipAttributeSharingDetails;

    @serialize({ type: ForwardedSharingDetails })
    @validate({ nullable: true })
    public forwardedSharingDetails?: ForwardedSharingDetails[];

    public isForwardedTo(peer: CoreAddress, excludeToBeDeleted = false): boolean {
        if (!this.forwardedSharingDetails) return false;

        const sharingDetailsWithPeer = this.forwardedSharingDetails.filter(
            (sharingDetails) => sharingDetails.peer.equals(peer) && sharingDetails.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.DeletedByPeer
        );
        if (sharingDetailsWithPeer.length === 0) return false;

        if (!excludeToBeDeleted) return true;

        return sharingDetailsWithPeer.some((sharingDetails) => sharingDetails.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.ToBeDeletedByPeer);
    }

    public isDeletedByOwnerOrToBeDeleted(): boolean {
        if (!this.peerSharingDetails.deletionInfo) return false;

        const deletionStatuses = [ReceivedAttributeDeletionStatus.DeletedByOwner, ReceivedAttributeDeletionStatus.ToBeDeleted];
        return deletionStatuses.includes(this.peerSharingDetails.deletionInfo.deletionStatus);
    }

    public isToBeDeleted(): boolean {
        return this.peerSharingDetails.deletionInfo?.deletionStatus === ReceivedAttributeDeletionStatus.ToBeDeleted;
    }

    public isDeletedOrToBeDeletedByForwardingPeer(peer: CoreAddress): boolean {
        if (!this.forwardedSharingDetails) return false;

        const sharingDetailsWithPeer = this.forwardedSharingDetails.filter((sharingDetails) => sharingDetails.peer.equals(peer));
        if (sharingDetailsWithPeer.length === 0) return false;

        const deletionStatuses = [EmittedAttributeDeletionStatus.DeletedByPeer, EmittedAttributeDeletionStatus.ToBeDeletedByPeer];

        const hasSharingDetailsWithDeletionStatus = sharingDetailsWithPeer.some(
            (sharingDetails) => sharingDetails.deletionInfo && deletionStatuses.includes(sharingDetails.deletionInfo.deletionStatus)
        );
        const hasSharingDetailsWithoutDeletionStatus = sharingDetailsWithPeer.some(
            (sharingDetails) => !sharingDetails.deletionInfo || !deletionStatuses.includes(sharingDetails.deletionInfo.deletionStatus)
        );
        return hasSharingDetailsWithDeletionStatus && !hasSharingDetailsWithoutDeletionStatus;
    }

    public hasDeletionStatusUnequalDeletedByPeer(peer: CoreAddress): boolean {
        if (!this.forwardedSharingDetails) return false;

        const deletionStatuses = [
            EmittedAttributeDeletionStatus.ToBeDeletedByPeer,
            EmittedAttributeDeletionStatus.DeletionRequestSent,
            EmittedAttributeDeletionStatus.DeletionRequestRejected
        ];

        return this.forwardedSharingDetails.some(
            (sharingDetails) => sharingDetails.peer.equals(peer) && sharingDetails.deletionInfo && deletionStatuses.includes(sharingDetails.deletionInfo.deletionStatus)
        );
    }

    public setPeerDeletionInfo(deletionInfo: ReceivedAttributeDeletionInfo | undefined, overrideDeleted = false): this {
        if (!overrideDeleted && this.peerSharingDetails.deletionInfo?.deletionStatus === ReceivedAttributeDeletionStatus.DeletedByOwner) {
            throw ConsumptionCoreErrors.attributes.cannotSetAttributeDeletionInfo(this.id);
        }

        this.peerSharingDetails.deletionInfo = deletionInfo;
        return this;
    }

    public setForwardedDeletionInfo(deletionInfo: EmittedAttributeDeletionInfo | undefined, peer: CoreAddress, overrideDeleted = false): this {
        const sharingDetailsForPeer = this.forwardedSharingDetails?.find(
            (sharingDetails) =>
                sharingDetails.peer.equals(peer) && (overrideDeleted || sharingDetails.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.DeletedByPeer)
        );

        if (!sharingDetailsForPeer) throw ConsumptionCoreErrors.attributes.cannotSetAttributeDeletionInfo(this.id, peer);

        sharingDetailsForPeer.deletionInfo = deletionInfo;
        return this;
    }

    public getForwardedPeers(includeToBeDeleted = false): CoreAddress[] {
        const forwardedSharingDetailsNotDeletedByPeer = this.forwardedSharingDetails?.filter(
            (sharingDetails) => sharingDetails.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.DeletedByPeer
        );
        if (!forwardedSharingDetailsNotDeletedByPeer) return [];

        const sharingDetails = includeToBeDeleted
            ? forwardedSharingDetailsNotDeletedByPeer
            : forwardedSharingDetailsNotDeletedByPeer.filter((sharingDetails) => {
                  return sharingDetails.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.ToBeDeletedByPeer;
              });

        const peers = sharingDetails.map((sharingDetails) => sharingDetails.peer.toString());
        const uniquePeers = Array.from(new Set(peers)).map((address) => CoreAddress.from(address));
        return uniquePeers;
    }

    public getForwardedSharingDetailsNotDeletedByPeer(peer: CoreAddress): ForwardedSharingDetails | undefined {
        return this.forwardedSharingDetails?.find(
            (sharingDetails) => sharingDetails.peer.equals(peer) && sharingDetails.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.DeletedByPeer
        );
    }

    public upsertForwardedSharingDetailsForPeer(peer: CoreAddress, sharingDetails: ForwardedSharingDetails): this {
        if (peer.equals(this.peerSharingDetails.peer)) throw ConsumptionCoreErrors.attributes.cannotSetForwardedSharingDetailsForPeer(this.id, peer);

        if (!this.forwardedSharingDetails) {
            this.forwardedSharingDetails = [sharingDetails];
            return this;
        }

        const indexForPeer = this.forwardedSharingDetails.findIndex(
            (sharingDetails) => sharingDetails.peer.equals(peer) && sharingDetails.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.DeletedByPeer
        );

        if (indexForPeer === -1) {
            this.forwardedSharingDetails.push(sharingDetails);
            return this;
        }

        this.forwardedSharingDetails[indexForPeer] = sharingDetails;
        return this;
    }

    public static override from(value: IPeerRelationshipAttribute | PeerRelationshipAttributeJSON): PeerRelationshipAttribute {
        return super.fromAny(value) as PeerRelationshipAttribute;
    }
}
