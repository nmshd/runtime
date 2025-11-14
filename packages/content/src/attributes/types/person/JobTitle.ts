import { type } from "@js-soft/ts-serval";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString.js";

export interface JobTitleJSON extends AbstractStringJSON {
    "@type": "JobTitle";
}

export interface IJobTitle extends IAbstractString {}

@type("JobTitle")
export class JobTitle extends AbstractString implements IJobTitle {
    public static from(value: IJobTitle | Omit<JobTitleJSON, "@type"> | string): JobTitle {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): JobTitleJSON {
        return super.toJSON(verbose, serializeAsString) as JobTitleJSON;
    }
}
