import { serialize, type, validate } from "@js-soft/ts-serval";
import { IRelationshipAttribute, RelationshipAttribute, RelationshipAttributeJSON } from "@nmshd/content";
import { nameof } from "ts-simple-nameof";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";
import { IPeerRelationshipAttributeSharingInfo, PeerRelationshipAttributeSharingInfo, PeerRelationshipAttributeSharingInfoJSON } from "./PeerRelationshipAttributeSharingInfo";
import {
    IThirdPartyRelationshipAttributeSharingInfo,
    ThirdPartyRelationshipAttributeSharingInfo,
    ThirdPartyRelationshipAttributeSharingInfoJSON
} from "./ThirdPartyRelationshipAttributeSharingInfo";

export interface PeerRelationshipAttributeJSON extends LocalAttributeJSON {
    "@type": "PeerRelationshipAttribute";
    content: RelationshipAttributeJSON;
    initialSharingInfo: PeerRelationshipAttributeSharingInfoJSON;
    thirdPartySharingInfos?: ThirdPartyRelationshipAttributeSharingInfoJSON[];
}

export interface IPeerRelationshipAttribute extends ILocalAttribute {
    content: IRelationshipAttribute;
    initialSharingInfo: IPeerRelationshipAttributeSharingInfo;
    thirdPartySharingInfos?: IThirdPartyRelationshipAttributeSharingInfo[];
}

@type("PeerRelationshipAttribute")
export class PeerRelationshipAttribute extends LocalAttribute implements IPeerRelationshipAttribute {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<PeerRelationshipAttribute>((r) => r.initialSharingInfo),
        nameof<PeerRelationshipAttribute>((r) => r.thirdPartySharingInfos)
    ];

    @serialize()
    @validate()
    public override content: RelationshipAttribute;

    @serialize()
    @validate()
    public initialSharingInfo: PeerRelationshipAttributeSharingInfo;

    @serialize()
    @validate({ nullable: true })
    public thirdPartySharingInfos?: ThirdPartyRelationshipAttributeSharingInfo[];

    public static override from(value: IPeerRelationshipAttribute | PeerRelationshipAttributeJSON): PeerRelationshipAttribute {
        return super.fromAny(value) as PeerRelationshipAttribute;
    }
}
