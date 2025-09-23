import { serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import { EmittedAttributeDeletionInfo, EmittedAttributeDeletionStatus, ForwardedSharingDetails, ForwardedSharingDetailsJSON, IForwardedSharingDetails } from "../sharingDetails";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";

export interface OwnIdentityAttributeJSON extends LocalAttributeJSON {
    "@type": "OwnIdentityAttribute";
    content: IdentityAttributeJSON;
    isDefault?: true;
    forwardedSharingDetails?: ForwardedSharingDetailsJSON[];
}

export interface IOwnIdentityAttribute extends ILocalAttribute {
    content: IIdentityAttribute;
    isDefault?: true;
    forwardedSharingDetails?: IForwardedSharingDetails[];
}

@type("OwnIdentityAttribute")
export class OwnIdentityAttribute extends LocalAttribute implements IOwnIdentityAttribute {
    public override readonly technicalProperties: string[] = [
        ...this.technicalProperties,
        "@type",
        "@context",
        nameof<OwnIdentityAttribute>((r) => r.isDefault),
        nameof<OwnIdentityAttribute>((r) => r.forwardedSharingDetails)
    ];

    @serialize({ customGenerator: (value: IdentityAttribute) => value.toJSON(true) })
    @validate()
    public override content: IdentityAttribute;

    @serialize()
    @validate({ nullable: true })
    public isDefault?: true;

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

    public static override from(value: IOwnIdentityAttribute | OwnIdentityAttributeJSON): OwnIdentityAttribute {
        return super.fromAny(value) as OwnIdentityAttribute;
    }
}
