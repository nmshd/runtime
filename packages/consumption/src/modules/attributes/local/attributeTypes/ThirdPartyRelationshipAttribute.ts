import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { nameof } from "ts-simple-nameof";
import { ConsumptionCoreErrors } from "../../../../consumption/ConsumptionCoreErrors";
import {
    IThirdPartyRelationshipAttributeSharingDetails,
    ThirdPartyRelationshipAttributeDeletionInfo,
    ThirdPartyRelationshipAttributeDeletionStatus,
    ThirdPartyRelationshipAttributeSharingDetails,
    ThirdPartyRelationshipAttributeSharingDetailsJSON
} from "../sharingDetails";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";

export interface ThirdPartyRelationshipAttributeJSON extends LocalAttributeJSON {
    "@type": "ThirdPartyRelationshipAttribute";
    content: RelationshipAttributeJSON;
    peerSharingDetails: ThirdPartyRelationshipAttributeSharingDetailsJSON;
}

export interface IThirdPartyRelationshipAttribute extends ILocalAttribute {
    content: IRelationshipAttribute;
    peerSharingDetails: IThirdPartyRelationshipAttributeSharingDetails;
}

@type("ThirdPartyRelationshipAttribute")
export class ThirdPartyRelationshipAttribute extends LocalAttribute implements IThirdPartyRelationshipAttribute {
    public override readonly technicalProperties: string[] = [
        ...this.technicalProperties,
        "@type",
        "@context",
        nameof<ThirdPartyRelationshipAttribute>((r) => r.peerSharingDetails)
    ];

    @serialize({ customGenerator: (value: RelationshipAttribute) => value.toJSON(true) })
    @validate()
    public override content: RelationshipAttribute;

    @serialize()
    @validate()
    public peerSharingDetails: ThirdPartyRelationshipAttributeSharingDetails;

    public isDeletedByOwnerOrPeerOrToBeDeleted(): boolean {
        if (!this.peerSharingDetails.deletionInfo) return false;

        const deletionStatuses = [
            ThirdPartyRelationshipAttributeDeletionStatus.DeletedByOwner,
            ThirdPartyRelationshipAttributeDeletionStatus.DeletedByPeer,
            ThirdPartyRelationshipAttributeDeletionStatus.ToBeDeleted
        ];
        return deletionStatuses.includes(this.peerSharingDetails.deletionInfo.deletionStatus);
    }

    public isToBeDeleted(): boolean {
        return this.peerSharingDetails.deletionInfo?.deletionStatus === ThirdPartyRelationshipAttributeDeletionStatus.ToBeDeleted;
    }

    public setPeerDeletionInfo(deletionInfo: ThirdPartyRelationshipAttributeDeletionInfo | undefined, overrideDeleted = false): this {
        if (
            !overrideDeleted &&
            (this.peerSharingDetails.deletionInfo?.deletionStatus === ThirdPartyRelationshipAttributeDeletionStatus.DeletedByOwner ||
                this.peerSharingDetails.deletionInfo?.deletionStatus === ThirdPartyRelationshipAttributeDeletionStatus.DeletedByPeer)
        ) {
            throw ConsumptionCoreErrors.attributes.cannotSetAttributeDeletionInfo(this.id);
        }

        this.peerSharingDetails.deletionInfo = deletionInfo;
        return this;
    }

    public peerIsOwner(): boolean {
        return this.peerSharingDetails.peer.equals(this.content.owner);
    }

    public static override from(value: IThirdPartyRelationshipAttribute | ThirdPartyRelationshipAttributeJSON): ThirdPartyRelationshipAttribute {
        return super.fromAny(value) as ThirdPartyRelationshipAttribute;
    }
}
