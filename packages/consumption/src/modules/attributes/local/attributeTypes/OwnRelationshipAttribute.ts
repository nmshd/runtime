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
    IOwnRelationshipAttributeSharingDetails,
    OwnRelationshipAttributeSharingDetails,
    OwnRelationshipAttributeSharingDetailsJSON
} from "../sharingDetails";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";

export interface OwnRelationshipAttributeJSON extends LocalAttributeJSON {
    "@type": "OwnRelationshipAttribute";
    content: RelationshipAttributeJSON;
    peerSharingDetails: OwnRelationshipAttributeSharingDetailsJSON;
    forwardedSharingDetails?: ForwardedSharingDetailsJSON[];
}

export interface IOwnRelationshipAttribute extends ILocalAttribute {
    content: IRelationshipAttribute;
    peerSharingDetails: IOwnRelationshipAttributeSharingDetails;
    forwardedSharingDetails?: IForwardedSharingDetails[];
}

@type("OwnRelationshipAttribute")
export class OwnRelationshipAttribute extends LocalAttribute implements IOwnRelationshipAttribute {
    public override readonly technicalProperties: string[] = [
        ...this.technicalProperties,
        "@type",
        "@context",
        nameof<OwnRelationshipAttribute>((r) => r.peerSharingDetails),
        nameof<OwnRelationshipAttribute>((r) => r.forwardedSharingDetails)
    ];

    @serialize({ customGenerator: (value: RelationshipAttribute) => value.toJSON(true) })
    @validate()
    public override content: RelationshipAttribute;

    @serialize()
    @validate()
    public peerSharingDetails: OwnRelationshipAttributeSharingDetails;

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

    public isDeletedOrToBeDeletedByPeer(): boolean {
        if (!this.peerSharingDetails.deletionInfo) return false;

        const deletionStatuses = [EmittedAttributeDeletionStatus.DeletedByPeer, EmittedAttributeDeletionStatus.ToBeDeletedByPeer];
        return deletionStatuses.includes(this.peerSharingDetails.deletionInfo.deletionStatus);
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

    public setPeerDeletionInfo(deletionInfo: EmittedAttributeDeletionInfo | undefined, overrideDeleted = false): this {
        if (!overrideDeleted && this.peerSharingDetails.deletionInfo?.deletionStatus === EmittedAttributeDeletionStatus.DeletedByPeer) {
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

    public static override from(value: IOwnRelationshipAttribute | OwnRelationshipAttributeJSON): OwnRelationshipAttribute {
        return super.fromAny(value) as OwnRelationshipAttribute;
    }
}
