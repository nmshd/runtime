import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import {
    EmittedAttributeDeletionInfo,
    EmittedAttributeDeletionStatus,
    IReceivedAttributeDeletionInfo,
    ReceivedAttributeDeletionInfo,
    ReceivedAttributeDeletionInfoJSON,
    ReceivedAttributeDeletionStatus
} from "../deletionInfos";
import { ForwardedSharingDetails, ForwardedSharingDetailsJSON, IForwardedSharingDetails } from "../sharingDetails";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";

export interface PeerRelationshipAttributeJSON extends LocalAttributeJSON {
    "@type": "PeerRelationshipAttribute";
    content: RelationshipAttributeJSON;
    peer: string;
    sourceReference: string;
    deletionInfo?: ReceivedAttributeDeletionInfoJSON;
    forwardedSharingDetails?: ForwardedSharingDetailsJSON[];
}

export interface IPeerRelationshipAttribute extends ILocalAttribute {
    content: IRelationshipAttribute;
    peer: ICoreAddress;
    sourceReference: ICoreId;
    deletionInfo?: IReceivedAttributeDeletionInfo;
    forwardedSharingDetails?: IForwardedSharingDetails[];
}

@type("PeerRelationshipAttribute")
export class PeerRelationshipAttribute extends LocalAttribute implements IPeerRelationshipAttribute {
    public override readonly technicalProperties: string[] = [
        ...this.technicalProperties,
        "@type",
        "@context",
        nameof<PeerRelationshipAttribute>((r) => r.peer),
        nameof<PeerRelationshipAttribute>((r) => r.sourceReference),
        nameof<PeerRelationshipAttribute>((r) => r.deletionInfo),
        nameof<PeerRelationshipAttribute>((r) => r.forwardedSharingDetails)
    ];

    @serialize({ customGenerator: (value: RelationshipAttribute) => value.toJSON(true) })
    @validate()
    public override content: RelationshipAttribute;

    @validate()
    @serialize()
    public peer: CoreAddress;

    @serialize()
    @validate()
    public sourceReference: CoreId;

    @serialize()
    @validate({ nullable: true })
    public deletionInfo?: ReceivedAttributeDeletionInfo;

    @serialize({ type: ForwardedSharingDetails })
    @validate({ nullable: true })
    public forwardedSharingDetails?: ForwardedSharingDetails[];

    public isForwardedTo(peer: CoreAddress, excludeToBeDeleted = false): boolean {
        if (!this.forwardedSharingDetails) return false;

        const sharingDetailsWithPeer = this.forwardedSharingDetails.filter(
            (sharingDetails) => sharingDetails.peer.equals(peer) && sharingDetails.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.DeletedByRecipient
        );
        if (sharingDetailsWithPeer.length === 0) return false;

        if (!excludeToBeDeleted) return true;

        return sharingDetailsWithPeer.some((sharingDetails) => sharingDetails.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.ToBeDeletedByRecipient);
    }

    public isDeletedByEmitterOrToBeDeleted(): boolean {
        if (!this.deletionInfo) return false;

        const deletionStatuses = [ReceivedAttributeDeletionStatus.DeletedByEmitter, ReceivedAttributeDeletionStatus.ToBeDeleted];
        return deletionStatuses.includes(this.deletionInfo.deletionStatus);
    }

    public isToBeDeleted(): boolean {
        return this.deletionInfo?.deletionStatus === ReceivedAttributeDeletionStatus.ToBeDeleted;
    }

    public isDeletedOrToBeDeletedByForwardingPeer(peer: CoreAddress): boolean {
        if (!this.forwardedSharingDetails) return false;

        const sharingDetailsWithPeer = this.forwardedSharingDetails.filter((sharingDetails) => sharingDetails.peer.equals(peer));
        if (sharingDetailsWithPeer.length === 0) return false;

        const deletionStatuses = [EmittedAttributeDeletionStatus.DeletedByRecipient, EmittedAttributeDeletionStatus.ToBeDeletedByRecipient];

        const hasSharingDetailsWithDeletionStatus = sharingDetailsWithPeer.some(
            (sharingDetails) => sharingDetails.deletionInfo && deletionStatuses.includes(sharingDetails.deletionInfo.deletionStatus)
        );
        const hasSharingDetailsWithoutDeletionStatus = sharingDetailsWithPeer.some(
            (sharingDetails) => !sharingDetails.deletionInfo || !deletionStatuses.includes(sharingDetails.deletionInfo.deletionStatus)
        );
        return hasSharingDetailsWithDeletionStatus && !hasSharingDetailsWithoutDeletionStatus;
    }

    public hasDeletionStatusUnequalDeletedByRecipient(peer: CoreAddress): boolean {
        if (!this.forwardedSharingDetails) return false;

        const deletionStatuses = [
            EmittedAttributeDeletionStatus.ToBeDeletedByRecipient,
            EmittedAttributeDeletionStatus.DeletionRequestSent,
            EmittedAttributeDeletionStatus.DeletionRequestRejected
        ];

        return this.forwardedSharingDetails.some(
            (sharingDetails) => sharingDetails.peer.equals(peer) && sharingDetails.deletionInfo && deletionStatuses.includes(sharingDetails.deletionInfo.deletionStatus)
        );
    }

    public setPeerDeletionInfo(deletionInfo: ReceivedAttributeDeletionInfo | undefined, overrideDeleted = false): this {
        if (!overrideDeleted && this.deletionInfo?.deletionStatus === ReceivedAttributeDeletionStatus.DeletedByEmitter) {
            throw ConsumptionCoreErrors.attributes.cannotSetAttributeDeletionInfo(this.id);
        }

        this.deletionInfo = deletionInfo;
        return this;
    }

    public setDeletionInfoForForwardingPeer(deletionInfo: EmittedAttributeDeletionInfo | undefined, peer: CoreAddress, overrideDeleted = false): this {
        const sharingDetailsForPeer = this.forwardedSharingDetails?.find(
            (sharingDetails) =>
                sharingDetails.peer.equals(peer) && (overrideDeleted || sharingDetails.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.DeletedByRecipient)
        );

        if (!sharingDetailsForPeer) throw ConsumptionCoreErrors.attributes.cannotSetAttributeDeletionInfo(this.id, peer);

        sharingDetailsForPeer.deletionInfo = deletionInfo;
        return this;
    }

    public getForwardingPeers(includeToBeDeleted = false): CoreAddress[] {
        const forwardedSharingDetailsNotDeletedByRecipient = this.forwardedSharingDetails?.filter(
            (sharingDetails) => sharingDetails.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.DeletedByRecipient
        );
        if (!forwardedSharingDetailsNotDeletedByRecipient) return [];

        const sharingDetails = includeToBeDeleted
            ? forwardedSharingDetailsNotDeletedByRecipient
            : forwardedSharingDetailsNotDeletedByRecipient.filter((sharingDetails) => {
                  return sharingDetails.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.ToBeDeletedByRecipient;
              });

        const peers = sharingDetails.map((sharingDetails) => sharingDetails.peer.toString());
        const uniquePeers = Array.from(new Set(peers)).map((address) => CoreAddress.from(address));
        return uniquePeers;
    }

    public getForwardedSharingDetailsNotDeletedByRecipient(peer: CoreAddress): ForwardedSharingDetails | undefined {
        return this.forwardedSharingDetails?.find(
            (sharingDetails) => sharingDetails.peer.equals(peer) && sharingDetails.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.DeletedByRecipient
        );
    }

    public upsertForwardedSharingDetailsForPeer(peer: CoreAddress, sharingDetails: ForwardedSharingDetails): this {
        if (peer.equals(this.peer)) throw ConsumptionCoreErrors.attributes.cannotSetForwardedSharingDetailsForPeer(this.id, peer);

        if (!this.forwardedSharingDetails) {
            this.forwardedSharingDetails = [sharingDetails];
            return this;
        }

        const indexForPeer = this.forwardedSharingDetails.findIndex(
            (sharingDetails) => sharingDetails.peer.equals(peer) && sharingDetails.deletionInfo?.deletionStatus !== EmittedAttributeDeletionStatus.DeletedByRecipient
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
