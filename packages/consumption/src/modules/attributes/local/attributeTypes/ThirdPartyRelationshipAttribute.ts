import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { nameof } from "ts-simple-nameof";
import {
    IThirdPartyRelationshipAttributeSharingInfo,
    ThirdPartyRelationshipAttributeDeletionInfo,
    ThirdPartyRelationshipAttributeDeletionStatus,
    ThirdPartyRelationshipAttributeSharingInfo,
    ThirdPartyRelationshipAttributeSharingInfoJSON
} from "../sharingInfos";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";

export interface ThirdPartyRelationshipAttributeJSON extends LocalAttributeJSON {
    "@type": "ThirdPartyRelationshipAttribute";
    content: RelationshipAttributeJSON;
    peerSharingInfo: ThirdPartyRelationshipAttributeSharingInfoJSON;
}

export interface IThirdPartyRelationshipAttribute extends ILocalAttribute {
    content: IRelationshipAttribute;
    peerSharingInfo: IThirdPartyRelationshipAttributeSharingInfo;
}

@type("ThirdPartyRelationshipAttribute")
export class ThirdPartyRelationshipAttribute extends LocalAttribute implements IThirdPartyRelationshipAttribute {
    public override readonly technicalProperties = ["@type", "@context", nameof<ThirdPartyRelationshipAttribute>((r) => r.peerSharingInfo)];

    @serialize()
    @validate()
    public override content: RelationshipAttribute;

    @serialize()
    @validate()
    public peerSharingInfo: ThirdPartyRelationshipAttributeSharingInfo;

    public isDeletedByOwnerOrPeerOrToBeDeleted(): boolean {
        if (!this.peerSharingInfo.deletionInfo) return false;

        const deletionStatuses = [
            ThirdPartyRelationshipAttributeDeletionStatus.DeletedByOwner,
            ThirdPartyRelationshipAttributeDeletionStatus.DeletedByPeer,
            ThirdPartyRelationshipAttributeDeletionStatus.ToBeDeleted
        ];
        return deletionStatuses.includes(this.peerSharingInfo.deletionInfo.deletionStatus);
    }

    public setPeerDeletionInfo(deletionInfo: ThirdPartyRelationshipAttributeDeletionInfo | undefined): this {
        this.peerSharingInfo.deletionInfo = deletionInfo;
        return this;
    }

    public peerIsOwner(): boolean {
        return this.peerSharingInfo.peer.equals(this.content.owner);
    }

    public static override from(value: IThirdPartyRelationshipAttribute | ThirdPartyRelationshipAttributeJSON): ThirdPartyRelationshipAttribute {
        return super.fromAny(value) as ThirdPartyRelationshipAttribute;
    }
}
