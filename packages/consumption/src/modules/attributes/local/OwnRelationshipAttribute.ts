import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { nameof } from "ts-simple-nameof";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";
import { IOwnRelationshipAttributeSharingInfo, OwnRelationshipAttributeSharingInfo, OwnRelationshipAttributeSharingInfoJSON } from "./OwnRelationshipAttributeSharingInfo";
import {
    IThirdPartyRelationshipAttributeSharingInfo,
    ThirdPartyRelationshipAttributeSharingInfo,
    ThirdPartyRelationshipAttributeSharingInfoJSON
} from "./ThirdPartyRelationshipAttributeSharingInfo";

export interface OwnRelationshipAttributeJSON extends LocalAttributeJSON {
    "@type": "OwnRelationshipAttribute";
    content: RelationshipAttributeJSON;
    initialSharingInfo: OwnRelationshipAttributeSharingInfoJSON;
    thirdPartySharingInfos?: ThirdPartyRelationshipAttributeSharingInfoJSON[];
}

export interface IOwnRelationshipAttribute extends ILocalAttribute {
    content: IRelationshipAttribute;
    initialSharingInfo: IOwnRelationshipAttributeSharingInfo;
    thirdPartySharingInfos?: IThirdPartyRelationshipAttributeSharingInfo[];
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
    public thirdPartySharingInfos?: ThirdPartyRelationshipAttributeSharingInfo[];

    public static override from(value: IOwnRelationshipAttribute | OwnRelationshipAttributeJSON): OwnRelationshipAttribute {
        return super.fromAny(value) as OwnRelationshipAttribute;
    }
}
