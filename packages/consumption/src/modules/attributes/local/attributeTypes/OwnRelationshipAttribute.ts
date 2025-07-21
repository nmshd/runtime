import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { CoreAddress } from "@nmshd/core-types";
import { nameof } from "ts-simple-nameof";
import {
    ForwardedRelationshipAttributeDeletionInfo,
    ForwardedRelationshipAttributeDeletionStatus,
    ForwardedRelationshipAttributeSharingInfo,
    ForwardedRelationshipAttributeSharingInfoJSON,
    IForwardedRelationshipAttributeSharingInfo,
    IOwnRelationshipAttributeSharingInfo,
    OwnAttributeDeletionInfo,
    OwnRelationshipAttributeSharingInfo,
    OwnRelationshipAttributeSharingInfoJSON
} from "../sharingInfos";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";

export interface OwnRelationshipAttributeJSON extends LocalAttributeJSON {
    "@type": "OwnRelationshipAttribute";
    content: RelationshipAttributeJSON;
    initialSharingInfo: OwnRelationshipAttributeSharingInfoJSON;
    thirdPartySharingInfos?: ForwardedRelationshipAttributeSharingInfoJSON[];
}

export interface IOwnRelationshipAttribute extends ILocalAttribute {
    content: IRelationshipAttribute;
    initialSharingInfo: IOwnRelationshipAttributeSharingInfo;
    thirdPartySharingInfos?: IForwardedRelationshipAttributeSharingInfo[];
}

@type("OwnRelationshipAttribute")
export class OwnRelationshipAttribute extends LocalAttribute implements IOwnRelationshipAttribute {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<OwnRelationshipAttribute>((r) => r.initialSharingInfo),
        nameof<OwnRelationshipAttribute>((r) => r.thirdPartySharingInfos)
    ];

    @serialize()
    @validate()
    public override content: RelationshipAttribute;

    @serialize()
    @validate()
    public initialSharingInfo: OwnRelationshipAttributeSharingInfo;

    @serialize()
    @validate({ nullable: true })
    public thirdPartySharingInfos?: ForwardedRelationshipAttributeSharingInfo[];

    public isSharedWith(peerAddress: CoreAddress, includeDeletedAndToBeDeleted = false): boolean {
        if (!this.thirdPartySharingInfos) return false;

        const thirdPartySharingInfosWithPeer = this.thirdPartySharingInfos.filter((sharingInfo) => sharingInfo.peer.equals(peerAddress));
        if (thirdPartySharingInfosWithPeer.length === 0) return false;

        if (includeDeletedAndToBeDeleted) return true;

        const excludedDeletionStatuses = [ForwardedRelationshipAttributeDeletionStatus.DeletedByPeer, ForwardedRelationshipAttributeDeletionStatus.ToBeDeletedByPeer];
        return thirdPartySharingInfosWithPeer.some((sharingInfo) => !sharingInfo.deletionInfo || !excludedDeletionStatuses.includes(sharingInfo.deletionInfo.deletionStatus));
    }

    public setDeletionInfo(deletionInfo: OwnAttributeDeletionInfo): this {
        this.initialSharingInfo.deletionInfo = deletionInfo;
        return this;
    }

    public setDeletionInfoForThirdParty(deletionInfo: ForwardedRelationshipAttributeDeletionInfo, thirdParty: CoreAddress): this {
        const sharingInfoForThirdParty = this.thirdPartySharingInfos?.find((sharingInfo) => sharingInfo.peer.equals(thirdParty));
        if (!sharingInfoForThirdParty) throw Error; // TODO:

        sharingInfoForThirdParty.deletionInfo = deletionInfo; // TODO: check if this works
        return this;
    }

    public static override from(value: IOwnRelationshipAttribute | OwnRelationshipAttributeJSON): OwnRelationshipAttribute {
        return super.fromAny(value) as OwnRelationshipAttribute;
    }
}
