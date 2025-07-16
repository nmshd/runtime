import { serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute } from "@nmshd/content";
import { nameof } from "ts-simple-nameof";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute";
import { IOwnIdentityAttributeSharingInfo, OwnIdentityAttributeSharingInfo, OwnIdentityAttributeSharingInfoJSON } from "./OwnIdentityAttributeSharingInfo";

export interface OwnIdentityAttributeJSON extends LocalAttributeJSON {
    "@type": "OwnIdentityAttribute";
    content: IdentityAttributeJSON;
    isDefault?: true;
    sharingInfos?: OwnIdentityAttributeSharingInfoJSON[];
}

export interface IOwnIdentityAttribute extends ILocalAttribute {
    content: IIdentityAttribute;
    isDefault?: true;
    sharingInfos?: IOwnIdentityAttributeSharingInfo[];
}

@type("OwnIdentityAttribute")
export class OwnIdentityAttribute extends LocalAttribute implements IOwnIdentityAttribute {
    public override readonly technicalProperties = ["@type", "@context", nameof<OwnIdentityAttribute>((r) => r.isDefault), nameof<OwnIdentityAttribute>((r) => r.sharingInfos)];

    @serialize()
    @validate()
    public override content: IdentityAttribute;

    @serialize()
    @validate({ nullable: true })
    public isDefault?: true;

    @serialize()
    @validate({ nullable: true })
    public sharingInfos?: OwnIdentityAttributeSharingInfo[];

    public static override from(value: IOwnIdentityAttribute | OwnIdentityAttributeJSON): OwnIdentityAttribute {
        return super.fromAny(value) as OwnIdentityAttribute;
    }
}
