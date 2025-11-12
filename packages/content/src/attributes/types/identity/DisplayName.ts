import { type } from "@js-soft/ts-serval";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString.js";

export interface DisplayNameJSON extends AbstractStringJSON {
    "@type": "DisplayName";
}

export interface IDisplayName extends IAbstractString {}

@type("DisplayName")
export class DisplayName extends AbstractString implements IDisplayName {
    public static from(value: IDisplayName | Omit<DisplayNameJSON, "@type"> | string): DisplayName {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): DisplayNameJSON {
        return super.toJSON(verbose, serializeAsString) as DisplayNameJSON;
    }
}
