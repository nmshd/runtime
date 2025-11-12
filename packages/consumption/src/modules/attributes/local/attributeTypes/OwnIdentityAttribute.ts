import { serialize, type, validate } from "@js-soft/ts-serval";
import { IdentityAttribute, IdentityAttributeJSON, IIdentityAttribute } from "@nmshd/content";
import { nameof } from "ts-simple-nameof";
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./LocalAttribute.js";

export interface OwnIdentityAttributeJSON extends LocalAttributeJSON {
    "@type": "OwnIdentityAttribute";
    content: IdentityAttributeJSON;
    isDefault?: true;
}

export interface IOwnIdentityAttribute extends ILocalAttribute {
    content: IIdentityAttribute;
    isDefault?: true;
}

@type("OwnIdentityAttribute")
export class OwnIdentityAttribute extends LocalAttribute implements IOwnIdentityAttribute {
    public override readonly technicalProperties: string[] = [...this.technicalProperties, "@type", "@context", nameof<OwnIdentityAttribute>((r) => r.isDefault)];

    @serialize({ customGenerator: (value: IdentityAttribute) => value.toJSON(true) })
    @validate()
    public override content: IdentityAttribute;

    @serialize()
    @validate({ nullable: true })
    public isDefault?: true;

    // this is not persisted, only used when returning Attributes via the API
    public numberOfForwards?: number;

    public static override from(value: IOwnIdentityAttribute | OwnIdentityAttributeJSON): OwnIdentityAttribute {
        return super.fromAny(value) as OwnIdentityAttribute;
    }
}
