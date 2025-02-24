import { type } from "@js-soft/ts-serval";
import { AbstractStringJSON, IAbstractString } from "../AbstractString";
import { AbstractName } from "../strings/AbstractName";

export interface StreetJSON extends AbstractStringJSON {
    "@type": "Street";
}

export interface IStreet extends IAbstractString {}

@type("Street")
export class Street extends AbstractName implements IStreet {
    public static from(value: IStreet | Omit<StreetJSON, "@type"> | string): Street {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): StreetJSON {
        return super.toJSON(verbose, serializeAsString) as StreetJSON;
    }
}
