import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { nameof } from "ts-simple-nameof";
import {
    IThirdPartyRelationshipAttributeSharingInfo,
    PeerAttributeDeletionInfo,
    ThirdPartyRelationshipAttributeSharingInfo,
    ThirdPartyRelationshipAttributeSharingInfoJSON
} from "../sharingInfos";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";

export interface ThirdPartyRelationshipAttributeJSON extends LocalAttributeJSON {
    "@type": "ThirdPartyRelationshipAttribute";
    content: RelationshipAttributeJSON;
    sharingInfo: ThirdPartyRelationshipAttributeSharingInfoJSON;
}

export interface IThirdPartyRelationshipAttribute extends ILocalAttribute {
    content: IRelationshipAttribute;
    sharingInfo: IThirdPartyRelationshipAttributeSharingInfo;
}

@type("ThirdPartyRelationshipAttribute")
export class ThirdPartyRelationshipAttribute extends LocalAttribute implements IThirdPartyRelationshipAttribute {
    public override readonly technicalProperties = ["@type", "@context", nameof<ThirdPartyRelationshipAttribute>((r) => r.sharingInfo)];

    @serialize()
    @validate()
    public override content: RelationshipAttribute;

    @serialize()
    @validate()
    public sharingInfo: ThirdPartyRelationshipAttributeSharingInfo;

    public setDeletionInfo(deletionInfo: PeerAttributeDeletionInfo): this {
        this.sharingInfo.deletionInfo = deletionInfo;
        return this;
    }

    public static override from(value: IThirdPartyRelationshipAttribute | ThirdPartyRelationshipAttributeJSON): ThirdPartyRelationshipAttribute {
        return super.fromAny(value) as ThirdPartyRelationshipAttribute;
    }
}
