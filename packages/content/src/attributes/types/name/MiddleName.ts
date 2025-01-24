import { type } from "@js-soft/ts-serval";
import { AbstractStringJSON, IAbstractString } from "../AbstractString";
import { AbstractNaturalPersonName } from "../strings/AbstractNaturalPersonName";

export interface MiddleNameJSON extends AbstractStringJSON {
    "@type": "MiddleName";
}

export interface IMiddleName extends IAbstractString {}

@type("MiddleName")
export class MiddleName extends AbstractNaturalPersonName implements IMiddleName {
    public static from(value: IMiddleName | Omit<MiddleNameJSON, "@type"> | string): MiddleName {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): MiddleNameJSON {
        return super.toJSON(verbose, serializeAsString) as MiddleNameJSON;
    }
}
