import { type } from "@js-soft/ts-serval";
import { AbstractStringJSON, IAbstractString } from "../AbstractString";
import { AbstractFileReference } from "../strings";

export interface IdentityFileReferenceJSON extends AbstractStringJSON {
    "@type": "IdentityFileReference";
}

export interface IIdentityFileReference extends IAbstractString {}

@type("IdentityFileReference")
export class IdentityFileReference extends AbstractFileReference implements IIdentityFileReference {
    public static from(value: IIdentityFileReference | Omit<IdentityFileReferenceJSON, "@type"> | string): IdentityFileReference {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): IdentityFileReferenceJSON {
        return super.toJSON(verbose, serializeAsString) as IdentityFileReferenceJSON;
    }
}
